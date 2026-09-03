import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, clientHealth, cycleToMonthly, fmtDate, fmtDateTime, fmtMoney, fmtMoney0 } from "../lib/utils";
import type { ActivityItem, ClientRow, Contact, InvoiceRow, LicenseRow, TicketRow } from "../types";
import { CONTACT_TYPES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, Checkbox, clientTone, ConfirmModal, EmptyState, ErrorState,
  Field, healthTone, invoiceTone, licenseTone, Modal, Select, Table, Td, TextInput,
  Th, useToast,
} from "../components/ui";
import { ClientFormModal } from "./ClientsPage";
import { ExpiryBadge } from "./LicensesPage";
import { IconArrowRight, IconChevronLeft, IconPencil, IconPlus, IconTrash } from "../components/icons";

const TABS = ["Overview", "Contacts", "Licenses", "Invoices", "Activity"] as const;
type Tab = (typeof TABS)[number];

interface ClientBundle {
  client: ClientRow;
  contacts: Contact[];
  licenses: LicenseRow[];
  invoices: InvoiceRow[];
  tickets: TicketRow[];
}

// ── Contact form ────────────────────────────────────────────────────────
const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional().default(""),
  contactType: z.enum(["Technical", "Billing", "Executive"]),
  notifyEmail: z.boolean(),
});
type ContactForm = z.infer<typeof contactSchema>;

function ContactFormModal({ open, onClose, clientId, contact }: {
  open: boolean; onClose: () => void; clientId: string; contact: Contact | null;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });
  const notify = watch("notifyEmail");

  useEffect(() => {
    if (open)
      reset(contact
        ? { name: contact.name, email: contact.email, phone: contact.phone, contactType: contact.contactType, notifyEmail: contact.notifyEmail }
        : { name: "", email: "", phone: "", contactType: "Technical", notifyEmail: true });
  }, [open, contact, reset]);

  const mutation = useMutation({
    mutationFn: (form: ContactForm) =>
      contact ? api.put(`/contacts/${contact.id}`, form) : api.post(`/clients/${clientId}/contacts`, form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      toast.push("success", contact ? "Contact updated" : "Contact added");
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={contact ? "Edit contact" : "Add contact"} sub="Module B · stakeholder directory"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {contact ? "Save changes" : "Add contact"}
          </Button>
        </>
      }>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Full name" required error={errors.name?.message}>
          <TextInput error={!!errors.name} placeholder="Jane Doe" {...register("name")} />
        </Field>
        <Field label="Contact type" required>
          <Select {...register("contactType")}>
            {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <TextInput error={!!errors.email} type="email" placeholder="jane@company.com" {...register("email")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <TextInput placeholder="+1 555 010 2299" {...register("phone")} />
        </Field>
        <div className="col-span-2">
          <Checkbox label="Include in email notifications (renewals, invoices, outage notices)" checked={!!notify} onChange={(v) => setValue("notifyEmail", v)} />
          <input type="hidden" {...register("notifyEmail")} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

// ── Activity timeline ───────────────────────────────────────────────────
const kindStyles: Record<ActivityItem["kind"], { dot: string; label: string }> = {
  payment: { dot: "bg-emerald-600", label: "Payment" },
  invoice: { dot: "bg-brand-600", label: "Invoice" },
  ticket: { dot: "bg-sky-600", label: "Ticket" },
  license: { dot: "bg-gold-400", label: "License" },
  credit: { dot: "bg-amber-500", label: "Credit note" },
  client: { dot: "bg-slate-500", label: "Client" },
};

export function Timeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-line pl-5">
      {items.map((it) => (
        <li key={it.id} className="relative animate-fade-up">
          <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-card ${kindStyles[it.kind].dot}`} />
          <p className="text-[13.5px] font-bold leading-snug">{it.title}</p>
          <p className="mt-0.5 text-[12.5px] text-mute">{it.detail}</p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-mute/80">{kindStyles[it.kind].label} · {fmtDateTime(it.at)}</p>
        </li>
      ))}
    </ol>
  );
}

// ── Page ────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [contactModal, setContactModal] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const bundleQ = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get<ClientBundle>(`/clients/${id}`)).data,
  });
  const activityQ = useQuery({
    queryKey: ["client", id, "activity"],
    queryFn: async () => (await api.get<ActivityItem[]>(`/clients/${id}/activity`)).data,
    enabled: tab === "Activity",
  });

  const contactDeleteMutation = useMutation({
    mutationFn: (c: Contact) => api.delete(`/contacts/${c.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["client", id] });
      toast.push("success", "Contact removed");
      setDeleteContact(null);
    },
    onError: (e) => toast.push("error", "Delete failed", apiErrorMsg(e)),
  });

  if (bundleQ.isError) return <ErrorState message={apiErrorMsg(bundleQ.error)} onRetry={() => bundleQ.refetch()} />;

  const bundle = bundleQ.data;
  const client = bundle?.client;
  const health = client ? clientHealth(client, bundle.invoices, bundle.tickets, bundle.licenses) : null;
  const openTickets = bundle?.tickets.filter((t) => t.status === "Open" || t.status === "In Progress") ?? [];

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/clients")} className="inline-flex items-center gap-1 text-[13px] font-bold text-mute transition-colors hover:text-brand-800">
        <IconChevronLeft width={14} height={14} /> All clients
      </button>

      {!bundle ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-6">
            <div className="skeleton h-8 w-72" />
            <div className="skeleton mt-3 h-4 w-96" />
          </div>
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      ) : client ? (
        <>
          {/* ── Header ── */}
          <div className="rounded-xl border border-line bg-card p-6 animate-fade-up">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-[28px] font-extrabold tracking-tight">{client.companyName}</h1>
                  <Badge tone={clientTone(client.status)} dot>{client.status}</Badge>
                  {health && (
                    <Badge tone={healthTone[health.score]} dot>
                      Health: {health.score === "green" ? "Good" : health.score === "amber" ? "Watch" : "At risk"}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[13.5px] text-mute">
                  {client.industryType} · Tax ID <span className="font-mono">{client.taxId || "—"}</span> · {client.billingAddress || "no billing address"}
                </p>
                <p className="mt-1 text-[13px] text-mute">
                  Owner <strong className="text-ink">{client.ownerName}</strong>
                  {client.hostingFeeAmount > 0 && (
                    <> · Hosting <strong className="tnum text-ink">{fmtMoney(client.hostingFeeAmount)}</strong>/{client.hostingCycle.toLowerCase()} <span className="text-mute">({fmtMoney0(cycleToMonthly(client.hostingFeeAmount, client.hostingCycle))}/mo)</span></>
                  )}
                  {" "}· Client since {fmtDate(client.createdAt)}
                </p>
              </div>
              {can(user?.role, "clients.manage") && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <IconPencil width={14} height={14} /> Edit client
                </Button>
              )}
            </div>

            {health && health.score !== "green" && (
              <div className={`mt-4 rounded-lg border px-4 py-3 text-[13px] font-medium ${health.score === "red" ? "border-rose-300 bg-rose-50 text-rose-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
                <strong>Why this score:</strong> {health.reasons.join(" · ")}
              </div>
            )}

            {/* Stat strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Open balance", value: fmtMoney(bundle.invoices.reduce((s, i) => s + i.balance, 0)), warn: bundle.invoices.some((i) => i.status === "Overdue") },
                { label: "Open tickets", value: String(openTickets.length), warn: openTickets.some((t) => t.priority === "Critical") },
                { label: "Licenses", value: String(bundle.licenses.length), warn: false },
                { label: "Contacts", value: String(bundle.contacts.length), warn: false },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line/80 bg-paper/60 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">{s.label}</p>
                  <p className={`tnum mt-1 font-mono text-lg font-bold ${s.warn ? "text-rose-700" : ""}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 border-b border-line">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-2.5 text-[13.5px] font-bold transition-colors ${tab === t ? "text-brand-800" : "text-mute hover:text-ink"}`}>
                {t}
                <span className={`absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-brand-700 transition-opacity ${tab === t ? "opacity-100" : "opacity-0"}`} />
              </button>
            ))}
          </div>

          {tab === "Overview" && (
            <div className="grid gap-4 lg:grid-cols-2 animate-fade-up">
              <Card title="Company record" sub="Billing & account profile">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
                  {[
                    ["Company", client.companyName], ["Tax ID", client.taxId || "—"],
                    ["Industry", client.industryType], ["Status", client.status],
                    ["Account owner", client.ownerName], ["Tax rate", `${client.taxRatePct}%`],
                    ["Billing address", client.billingAddress || "—"], ["Created", fmtDate(client.createdAt)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">{k}</dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card title="Recurring revenue" sub="Hosting fees & license MRR contribution">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-paper/70 px-4 py-3">
                    <span className="text-[13px] font-semibold text-mute">Hosting fee ({client.hostingCycle})</span>
                    <span className="tnum font-mono text-[15px] font-bold">{client.hostingFeeAmount > 0 ? fmtMoney(client.hostingFeeAmount) : "—"}</span>
                  </div>
                  {bundle.licenses.filter((l) => l.type !== "Perpetual").map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg bg-paper/70 px-4 py-3">
                      <span className="text-[13px] font-semibold text-mute">{l.productName} · {l.type}</span>
                      <span className="tnum font-mono text-[15px] font-bold">{fmtMoney(l.monthlyValue)}<span className="text-[11px] text-mute">/mo</span></span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-line/70 px-1 pt-3">
                    <span className="text-[13px] font-bold">Client MRR</span>
                    <span className="tnum font-mono text-lg font-extrabold text-brand-800">
                      {fmtMoney(cycleToMonthly(client.hostingFeeAmount, client.hostingCycle) + bundle.licenses.filter((l) => l.type !== "Perpetual").reduce((s, l) => s + l.monthlyValue, 0))}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "Contacts" && (
            <Card pad={false} className="animate-fade-up"
              actions={can(user?.role, "clients.manage") && (
                <Button size="sm" onClick={() => setContactModal({ open: true, contact: null })}>
                  <IconPlus width={14} height={14} /> Add contact
                </Button>
              )}>
              {bundle.contacts.length === 0 ? (
                <EmptyState title="No contacts yet" hint="Add the people we talk to at this company." />
              ) : (
                <Table minWidth="min-w-[680px]"
                  head={<><Th>Name</Th><Th>Type</Th><Th>Email</Th><Th>Phone</Th><Th>Notified</Th>{can(user?.role, "clients.manage") && <Th className="text-right">Actions</Th>}</>}>
                  {bundle.contacts.map((ct) => (
                    <tr key={ct.id} className="group transition-colors hover:bg-brand-50/40">
                      <Td className="font-bold">{ct.name}</Td>
                      <Td><Badge tone={ct.contactType === "Executive" ? "gold" : ct.contactType === "Billing" ? "teal" : "blue"}>{ct.contactType}</Badge></Td>
                      <Td className="text-mute">{ct.email}</Td>
                      <Td className="text-mute">{ct.phone || "—"}</Td>
                      <Td>{ct.notifyEmail ? <Badge tone="green" dot>Yes</Badge> : <Badge tone="slate">No</Badge>}</Td>
                      {can(user?.role, "clients.manage") && (
                        <Td className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button variant="ghost" size="xs" onClick={() => setContactModal({ open: true, contact: ct })}><IconPencil width={13} height={13} /></Button>
                            <Button variant="ghost" size="xs" className="hover:text-rose-700" onClick={() => setDeleteContact(ct)}><IconTrash width={13} height={13} /></Button>
                          </div>
                        </Td>
                      )}
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {tab === "Licenses" && (
            <Card pad={false} className="animate-fade-up"
              actions={can(user?.role, "licenses.manage") && (
                <Button size="sm" onClick={() => navigate(`/licenses?new=1&clientId=${client.id}`)}>
                  <IconPlus width={14} height={14} /> Add license
                </Button>
              )}>
              {bundle.licenses.length === 0 ? (
                <EmptyState title="No licenses" hint="This client has no product assignments yet." />
              ) : (
                <Table minWidth="min-w-[680px]"
                  head={<><Th>Product</Th><Th>Type</Th><Th>Seats</Th><Th>Start</Th><Th>End</Th><Th>Expiry</Th></>}>
                  {bundle.licenses.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-brand-50/40">
                      <Td>
                        <p className="font-bold">{l.productName}</p>
                        <p className="text-[12px] text-mute">{fmtMoney(l.monthlyValue)}/mo</p>
                      </Td>
                      <Td><Badge tone={licenseTone(l.type)}>{l.type}</Badge></Td>
                      <Td className="tnum font-mono font-semibold">{l.seats}</Td>
                      <Td className="text-mute">{fmtDate(l.startDate)}</Td>
                      <Td className="text-mute">{l.endDate ? fmtDate(l.endDate) : "—"}</Td>
                      <Td><ExpiryBadge days={l.daysToExpiry} /></Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {tab === "Invoices" && (
            <Card pad={false} className="animate-fade-up"
              actions={can(user?.role, "invoices.manage") && (
                <Button size="sm" onClick={() => navigate(`/invoices?new=1&clientId=${client.id}`)}>
                  <IconPlus width={14} height={14} /> Create invoice
                </Button>
              )}>
              {bundle.invoices.length === 0 ? (
                <EmptyState title="No invoices" hint="Financial history will appear here." />
              ) : (
                <Table minWidth="min-w-[760px]"
                  head={<><Th>Invoice</Th><Th>Issued</Th><Th>Due</Th><Th className="text-right">Total</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th /></>}>
                  {bundle.invoices.map((i) => (
                    <tr key={i.id} className="group cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => navigate(`/invoices/${i.id}`)}>
                      <Td className="font-mono font-bold">{i.number}</Td>
                      <Td className="text-mute">{fmtDate(i.issueDate)}</Td>
                      <Td className="text-mute">{fmtDate(i.dueDate)}</Td>
                      <Td className="text-right"><span className="tnum font-mono font-semibold">{fmtMoney(i.totalAmount)}</span></Td>
                      <Td className="text-right">
                        <span className={`tnum font-mono font-bold ${i.balance > 0 && i.status === "Overdue" ? "text-rose-700" : ""}`}>{fmtMoney(i.balance)}</span>
                      </Td>
                      <Td><Badge tone={invoiceTone(i.status)} dot>{i.status}</Badge></Td>
                      <Td className="text-right"><IconArrowRight width={14} height={14} className="text-mute opacity-0 transition-opacity group-hover:opacity-100" /></Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {tab === "Activity" && (
            <Card title="Activity timeline" sub="Payments, invoices, tickets and license events — newest first" className="animate-fade-up">
              {activityQ.isPending ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full" />)}
                </div>
              ) : (activityQ.data ?? []).length === 0 ? (
                <EmptyState title="No recorded activity" />
              ) : (
                <Timeline items={activityQ.data ?? []} />
              )}
            </Card>
          )}
        </>
      ) : null}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} client={bundle?.client ?? null} />
      {client && (
        <ContactFormModal open={contactModal.open} onClose={() => setContactModal({ open: false, contact: null })} clientId={client.id} contact={contactModal.contact} />
      )}
      <ConfirmModal
        open={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        title="Remove contact?"
        confirmLabel="Remove contact"
        loading={contactDeleteMutation.isPending}
        onConfirm={() => deleteContact && contactDeleteMutation.mutate(deleteContact)}
        body={<><strong>{deleteContact?.name}</strong> ({deleteContact?.contactType}) will be removed from {client?.companyName}'s directory.</>}
      />
    </div>
  );
}
