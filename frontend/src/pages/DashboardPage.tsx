import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  clientHealth, cycleToMonthly, daysOverdue, fmtMoney, fmtMoney0, slaState, timeAgo,
} from "../lib/utils";
import type {
  ClientRow, InvoiceRow, Lead, LeadStage, LicenseRow, ListResponse, OverdueHostingRow, TicketRow,
} from "../types";
import { Badge, Bar, Card, ErrorState, healthTone, priorityTone, stageTone } from "../components/ui";
import { ExpiryBadge } from "./LicensesPage";
import { IconArrowRight, IconPulse } from "../components/icons";

const PIPE_STAGES: LeadStage[] = ["New", "Contacted", "Proposal", "Negotiation"];

function KpiCard({ label, value, sub, accent, delay = 0 }: {
  label: string; value: string; sub?: React.ReactNode; accent?: string; delay?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(18,42,48,0.05)] animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className={`absolute inset-x-0 top-0 h-[3px] ${accent ?? "bg-brand-600"}`} />
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className="tnum mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight">{value}</p>
      {sub && <div className="mt-2.5 text-[12.5px] font-medium text-mute">{sub}</div>}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="flex items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="w-3 rounded-sm transition-all duration-500"
          style={{ height: `${6 + (v / max) * 22}px`, backgroundColor: i === values.length - 1 ? "var(--color-brand-600)" : "color-mix(in srgb, var(--color-brand-600) 28%, transparent)" }} />
      ))}
      <span className="ml-1.5 self-center text-[11px] font-semibold text-mute">paid invoices · 6 mo</span>
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "Admin";

  const results = useQueries({
    queries: [
      { queryKey: ["dash", "overdue-hosting"], queryFn: async () => (await api.get<OverdueHostingRow[]>("/reports/overdue-hosting")).data },
      { queryKey: ["dash", "licenses-expiring"], queryFn: async () => (await api.get<ListResponse<LicenseRow>>("/licenses", { params: { expiringWithin: 30, limit: 100 } })).data.data },
      { queryKey: ["dash", "licenses-all"], queryFn: async () => (await api.get<ListResponse<LicenseRow>>("/licenses", { params: { limit: 200 } })).data.data },
      { queryKey: ["dash", "tickets-open"], queryFn: async () => (await api.get<ListResponse<TicketRow>>("/tickets", { params: { status: "Open", limit: 100 } })).data.data },
      { queryKey: ["dash", "tickets-progress"], queryFn: async () => (await api.get<ListResponse<TicketRow>>("/tickets", { params: { status: "In Progress", limit: 100 } })).data.data },
      { queryKey: ["dash", "clients"], queryFn: async () => (await api.get<ListResponse<ClientRow>>("/clients", { params: { limit: 100 } })).data.data },
      { queryKey: ["dash", "leads"], queryFn: async () => (await api.get<ListResponse<Lead>>("/leads", { params: { limit: 100 } })).data.data },
      { queryKey: ["dash", "invoices-overdue"], queryFn: async () => (await api.get<ListResponse<InvoiceRow>>("/invoices", { params: { status: "Overdue", limit: 100 } })).data.data },
      { queryKey: ["dash", "invoices-all"], queryFn: async () => (await api.get<ListResponse<InvoiceRow>>("/invoices", { params: { limit: 100 } })).data.data },
    ],
  });

  const [qHosting, qLicExp, qLicAll, qTkOpen, qTkProg, qClients, qLeads, qInvOverdue, qInvAll] = results;
  const pending = results.some((r) => r.isPending);
  const failed = results.some((r) => r.isError);

  const view = useMemo(() => {
    if (pending || failed) return null;
    const hosting = qHosting.data ?? [];
    const expiring = qLicExp.data ?? [];
    const allLicenses = qLicAll.data ?? [];
    const openTickets = [...(qTkOpen.data ?? []), ...(qTkProg.data ?? [])];
    const clients = qClients.data ?? [];
    const leads = qLeads.data ?? [];
    const overdueInvoices = qInvOverdue.data ?? [];
    const allInvoices = qInvAll.data ?? [];

    // MRR — recurring license value + normalized hosting fees (Module H)
    const activeIds = new Set(clients.filter((c) => c.status === "Active").map((c) => c.id));
    const licenseMrr = allLicenses
      .filter((l) => l.type !== "Perpetual" && (l.daysToExpiry === null || l.daysToExpiry > 0) && activeIds.has(l.clientId))
      .reduce((s, l) => s + l.monthlyValue, 0);
    const hostingMrr = clients
      .filter((c) => c.status === "Active" && c.hostingFeeAmount > 0)
      .reduce((s, c) => s + cycleToMonthly(c.hostingFeeAmount, c.hostingCycle), 0);

    const healthRows = clients.map((client) => ({
      client,
      health: clientHealth(
        client,
        allInvoices.filter((i) => i.clientId === client.id),
        openTickets.filter((t) => t.clientId === client.id),
        allLicenses.filter((l) => l.clientId === client.id),
      ),
    }));
    const healthCounts = {
      green: healthRows.filter((h) => h.health.score === "green").length,
      amber: healthRows.filter((h) => h.health.score === "amber").length,
      red: healthRows.filter((h) => h.health.score === "red").length,
    };

    const pipeline = PIPE_STAGES.map((stage) => {
      const rows = leads.filter((l) => l.stage === stage);
      return { stage, count: rows.length, value: rows.reduce((s, l) => s + l.estimatedValue, 0) };
    });
    const pipelineValue = pipeline.reduce((s, p) => s + p.value, 0);
    const wonValue = leads.filter((l) => l.stage === "Won").reduce((s, l) => s + l.estimatedValue, 0);

    const overdueTotal = overdueInvoices.reduce((s, i) => s + i.balance, 0);
    const criticalOpen = openTickets.filter((t) => t.priority === "Critical").length;
    const slaBreached = openTickets.filter((t) => slaState(t).tone === "red").length;

    const monthlyPaid: number[] = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - idx));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return allInvoices
        .filter((i) => i.status === "Paid")
        .filter((i) => {
          const p = new Date(i.issueDate);
          return `${p.getFullYear()}-${p.getMonth()}` === key;
        })
        .reduce((s, i) => s + i.totalAmount, 0);
    });

    return {
      hosting, expiring, openTickets, clients, leads, overdueInvoices,
      mrr: licenseMrr + hostingMrr, hostingMrr, licenseMrr,
      healthRows, healthCounts, pipeline, pipelineValue, wonValue,
      overdueTotal, criticalOpen, slaBreached, monthlyPaid,
    };
  }, [pending, failed, qHosting.data, qLicExp.data, qLicAll.data, qTkOpen.data, qTkProg.data, qClients.data, qLeads.data, qInvOverdue.data, qInvAll.data]);

  if (failed) return <ErrorState message="Dashboard metrics could not be loaded." onRetry={() => results.forEach((r) => r.refetch())} />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name.split(" ")[0] ?? "";
  const totalHealth = view ? Math.max(1, view.healthRows.length) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-700">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-[30px] font-extrabold leading-tight tracking-tight">
            {greeting}, {firstName}<span className="text-mute"> — here's the pulse.</span>
          </h1>
        </div>
        <Badge tone="teal" dot className="mb-1.5">{role}-scoped view · Module H</Badge>
      </div>

      {pending || !view ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-card p-5">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-3 h-8 w-32" />
                <div className="skeleton mt-3 h-3 w-40" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-card p-5">
                <div className="skeleton h-4 w-36" />
                <div className="mt-4 space-y-3">
                  {[0, 1, 2, 3].map((j) => <div key={j} className="skeleton h-9 w-full" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI strip (role-scoped) ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total MRR" value={fmtMoney0(view.mrr)}
              sub={<Sparkline values={view.monthlyPaid} />} accent="bg-brand-600" />
            {(role === "Finance" || role === "Admin") && (
              <KpiCard label="Overdue receivables" value={fmtMoney0(view.overdueTotal)}
                sub={<>{view.overdueInvoices.length} invoice{view.overdueInvoices.length === 1 ? "" : "s"} past due · <Link to="/invoices?status=Overdue" className="font-bold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">review</Link></>}
                accent="bg-rose-600" delay={60} />
            )}
            {(role === "Sales" || role === "Admin") && (
              <KpiCard label="Open pipeline" value={fmtMoney0(view.pipelineValue)}
                sub={<>{view.pipeline.reduce((s, p) => s + p.count, 0)} opportunities in play · {fmtMoney0(view.wonValue)} won</>}
                accent="bg-orange-500" delay={60} />
            )}
            {(role === "Support" || role === "Admin") && (
              <KpiCard label="Open tickets" value={String(view.openTickets.length)}
                sub={<>{view.criticalOpen} critical · <span className={view.slaBreached > 0 ? "font-bold text-rose-700" : ""}>{view.slaBreached} breaching SLA</span></>}
                accent="bg-sky-600" delay={60} />
            )}
            <KpiCard label="Overdue hosting fees" value={String(view.hosting.length)}
              sub={view.hosting.length > 0
                ? <>{fmtMoney0(view.hosting.reduce((s, h) => s + h.amount, 0))} uncollected · oldest {view.hosting[0].daysOverdue}d</>
                : <>All hosting cycles current</>}
              accent="bg-amber-500" delay={120} />
            <KpiCard label="Healthy clients" value={`${view.healthCounts.green}/${view.healthRows.length}`}
              sub={
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" />{view.healthCounts.green}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{view.healthCounts.amber}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-600" />{view.healthCounts.red}</span>
                </span>
              }
              accent="bg-emerald-600" delay={180} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* ── Client health distribution ── */}
            <Card title="Client health distribution" sub="Overdue payments · critical tickets · expiring licenses" className="animate-fade-up" pad={false}>
              <div className="p-5">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink/8">
                  {view.healthCounts.green > 0 && <div className="h-full bg-emerald-600" style={{ width: `${(view.healthCounts.green / totalHealth) * 100}%` }} />}
                  {view.healthCounts.amber > 0 && <div className="h-full bg-amber-500" style={{ width: `${(view.healthCounts.amber / totalHealth) * 100}%` }} />}
                  {view.healthCounts.red > 0 && <div className="h-full bg-rose-600" style={{ width: `${(view.healthCounts.red / totalHealth) * 100}%` }} />}
                </div>
                <ul className="mt-4 space-y-1">
                  {view.healthRows
                    .filter((h) => h.health.score !== "green")
                    .sort((a, b) => (b.health.score === "red" ? 1 : 0) - (a.health.score === "red" ? 1 : 0))
                    .slice(0, 6)
                    .map(({ client, health }) => (
                      <li key={client.id}>
                        <Link to={`/clients/${client.id}`} className="group flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-paper">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Badge tone={healthTone[health.score]} dot>{health.score === "red" ? "At risk" : "Watch"}</Badge>
                            <span className="truncate text-[13.5px] font-semibold group-hover:text-brand-800">{client.companyName}</span>
                          </span>
                          <span className="hidden max-w-[46%] truncate text-[11.5px] text-mute xl:block">{health.reasons[0]}</span>
                        </Link>
                      </li>
                    ))}
                  {view.healthRows.every((h) => h.health.score === "green") && (
                    <li className="px-2.5 py-2 text-[13px] font-medium text-emerald-700">Every account is healthy.</li>
                  )}
                </ul>
              </div>
            </Card>

            {/* ── Licenses expiring ≤ 30d ── */}
            <Card title="Licenses expiring ≤ 30 days" sub="Module C · renewal radar" className="animate-fade-up" pad={false}
              actions={<Link to="/licenses?expiring=30" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-700 hover:text-brand-900">All <IconArrowRight width={13} height={13} /></Link>}>
              <ul className="divide-y divide-line/60">
                {view.expiring.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-paper">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold">{l.clientName}</p>
                      <p className="truncate text-[12px] text-mute">{l.productName} · {l.seats} seats</p>
                    </div>
                    <ExpiryBadge days={l.daysToExpiry} />
                  </li>
                ))}
                {view.expiring.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-mute">No licenses expire in the next 30 days.</li>}
              </ul>
            </Card>

            {/* ── Role-scoped third widget ── */}
            {role === "Support" ? (
              <Card title="Open tickets" sub="SLA windows per SRS F.5" className="animate-fade-up" pad={false}
                actions={<Link to="/tickets" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-700 hover:text-brand-900">Queue <IconArrowRight width={13} height={13} /></Link>}>
                <ul className="divide-y divide-line/60">
                  {view.openTickets.slice(0, 6).map((t) => {
                    const sla = slaState(t);
                    return (
                      <li key={t.id}>
                        <Link to={`/tickets/${t.id}`} className="block px-5 py-2.5 transition-colors hover:bg-paper">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13.5px] font-bold">{t.subject}</p>
                            <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-mute">
                            <span className="truncate">{t.clientName} · {timeAgo(t.createdAt)}</span>
                            <span className={`shrink-0 font-semibold ${sla.tone === "red" ? "text-rose-700" : sla.tone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{sla.label}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                  {view.openTickets.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-mute">Queue is clear.</li>}
                </ul>
              </Card>
            ) : role === "Sales" ? (
              <Card title="Pipeline by stage" sub="Module A · open opportunities" className="animate-fade-up" pad={false}>
                <div className="space-y-3.5 p-5">
                  {view.pipeline.map((p) => (
                    <div key={p.stage}>
                      <div className="mb-1 flex items-center justify-between text-[12.5px]">
                        <span className="font-bold">{p.stage} <span className="ml-1 font-mono text-mute">×{p.count}</span></span>
                        <span className="tnum font-mono font-semibold">{fmtMoney0(p.value)}</span>
                      </div>
                      <Bar pct={(p.value / Math.max(1, view.pipelineValue)) * 100} tone={stageTone(p.stage)} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card title="Overdue invoices" sub="Module D · collections priority" className="animate-fade-up" pad={false}
                actions={<Link to="/invoices?status=Overdue" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-700 hover:text-brand-900">All <IconArrowRight width={13} height={13} /></Link>}>
                <ul className="divide-y divide-line/60">
                  {view.overdueInvoices.slice(0, 6).map((i) => (
                    <li key={i.id}>
                      <Link to={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-paper">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-bold">{i.number}</p>
                          <p className="truncate text-[12px] text-mute">{i.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="tnum font-mono text-[13.5px] font-bold text-rose-700">{fmtMoney(i.balance)}</p>
                          <p className="text-[11.5px] font-semibold text-rose-600/80">{daysOverdue(i.dueDate)}d overdue</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {view.overdueInvoices.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-mute">Nothing overdue — receivables are clean.</li>}
                </ul>
              </Card>
            )}
          </div>

          {/* ── Bottom row: hosting fees + pipeline snapshot ── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Overdue hosting fees" sub="GET /reports/overdue-hosting · recurring fees past their billing cycle" className="lg:col-span-2 animate-fade-up" pad={false}>
              <ul className="divide-y divide-line/60">
                {view.hosting.slice(0, 5).map((h) => (
                  <li key={h.clientId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/12 text-amber-700">
                        <IconPulse width={16} height={16} />
                      </span>
                      <div>
                        <Link to={`/clients/${h.clientId}`} className="text-[13.5px] font-bold hover:text-brand-800">{h.companyName}</Link>
                        <p className="text-[12px] text-mute">{h.cycle} cycle · {h.daysOverdue} days past due</p>
                      </div>
                    </div>
                    <span className="tnum font-mono text-[14px] font-bold">{fmtMoney(h.amount)}</span>
                  </li>
                ))}
                {view.hosting.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-mute">All hosting fees are inside their billing cycle.</li>}
              </ul>
            </Card>

            <Card title="Pipeline snapshot" sub="Open opportunities · closed value" className="animate-fade-up" pad={false}>
              <div className="space-y-3 p-5">
                {view.pipeline.map((p) => (
                  <div key={p.stage} className="flex items-center gap-3">
                    <Badge tone={stageTone(p.stage)} className="w-[108px] justify-center">{p.stage}</Badge>
                    <Bar pct={(p.value / Math.max(1, view.pipelineValue)) * 100} tone={stageTone(p.stage)} className="flex-1" />
                    <span className="tnum w-[82px] text-right font-mono text-[12.5px] font-semibold">{fmtMoney0(p.value)}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-line/70 pt-3 text-[13px]">
                  <span className="font-bold text-mute">Won (closed)</span>
                  <span className="tnum font-mono font-bold text-emerald-700">{fmtMoney0(view.wonValue)}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
