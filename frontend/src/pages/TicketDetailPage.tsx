import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtDateTime, fmtMinutes, SLA, slaState, timeAgo } from "../lib/utils";
import type { Attachment, ClientRow, TicketRow, TimeLog } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, ErrorState, priorityTone, Table, Td, TextInput, Th,
  ticketTone, useToast,
} from "../components/ui";
import { TicketFormModal } from "./SupportTicketsPage";
import { IconChevronLeft, IconClock, IconPaperclip, IconPencil, IconPlus } from "../components/icons";

interface TicketBundle {
  ticket: TicketRow;
  client: ClientRow | null;
  timeLogs: TimeLog[];
  attachments: (Attachment & { uploadedByName?: string })[];
}

export default function TicketDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const manage = can(user?.role, "tickets.manage");

  const [editOpen, setEditOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const bundleQ = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get<TicketBundle>(`/tickets/${id}`)).data,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ticket", id] });
    void qc.invalidateQueries({ queryKey: ["tickets"] });
    void qc.invalidateQueries({ queryKey: ["dash"] });
  };

  const timeMutation = useMutation({
    mutationFn: (mins: number) => api.post(`/tickets/${id}/time-logs`, { minutes: mins, note }),
    onSuccess: () => {
      invalidate();
      toast.push("success", "Time logged", "Counts toward resource utilization (SRS F.4).");
      setHours(""); setMinutes(""); setNote("");
    },
    onError: (e) => toast.push("error", "Could not log time", apiErrorMsg(e)),
  });

  const attachMutation = useMutation({
    mutationFn: (f: { name: string; size: number }) => api.post(`/tickets/${id}/attachments`, f),
    onSuccess: () => {
      invalidate();
      toast.push("success", "Attachment uploaded");
    },
    onError: (e) => toast.push("error", "Upload failed", apiErrorMsg(e)),
  });

  const submitTime = () => {
    const mins = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
    if (mins <= 0) {
      toast.push("error", "Enter time first", "Hours and/or minutes must be greater than zero.");
      return;
    }
    timeMutation.mutate(mins);
  };

  if (bundleQ.isError) return <ErrorState message={apiErrorMsg(bundleQ.error)} onRetry={() => bundleQ.refetch()} />;
  const bundle = bundleQ.data;
  if (!bundle)
    return (
      <div className="space-y-4">
        <div className="skeleton h-28 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-72 rounded-xl lg:col-span-2" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
      </div>
    );

  const { ticket, client, timeLogs, attachments } = bundle;
  const sla = slaState(ticket);
  const policy = SLA[ticket.priority];
  const slaToneCls = sla.tone === "red" ? "border-rose-300 bg-rose-50" : sla.tone === "amber" ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50";
  const slaTextCls = sla.tone === "red" ? "text-rose-800" : sla.tone === "amber" ? "text-amber-800" : "text-emerald-800";

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/tickets")} className="inline-flex items-center gap-1 text-[13px] font-bold text-mute transition-colors hover:text-brand-800">
        <IconChevronLeft width={14} height={14} /> Ticket queue
      </button>

      {/* ── Header ── */}
      <div className="rounded-xl border border-line bg-card p-6 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[13px] font-bold text-brand-700">{ticket.ref}</span>
              <Badge tone={priorityTone(ticket.priority)} dot>{ticket.priority}</Badge>
              <Badge tone={ticketTone(ticket.status)}>{ticket.status}</Badge>
            </div>
            <h1 className="mt-1.5 font-display text-[24px] font-extrabold leading-tight tracking-tight">{ticket.subject}</h1>
            <p className="mt-1 text-[13px] text-mute">
              <Link to={`/clients/${ticket.clientId}`} className="font-bold text-brand-800 hover:underline">{client?.companyName ?? ticket.clientName}</Link>
              {" "}· opened {timeAgo(ticket.createdAt)} ({fmtDateTime(ticket.createdAt)}) · assigned to <strong className="text-ink">{ticket.assigneeName}</strong>
              {ticket.resolvedAt && <> · resolved {fmtDateTime(ticket.resolvedAt)}</>}
            </p>
          </div>
          {manage && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <IconPencil width={14} height={14} /> Edit ticket
            </Button>
          )}
        </div>

        {/* SLA panel */}
        <div className={`mt-5 rounded-lg border px-4 py-3.5 ${slaToneCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[14px] font-extrabold ${slaTextCls}`}>{sla.label}</p>
            <p className={`text-[12.5px] font-semibold ${slaTextCls}`}>{sla.detail}</p>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">First response · target {policy.first}h</p>
              <p className="mt-0.5 text-[13px] font-semibold">
                {ticket.firstResponseAt
                  ? <>Responded {timeAgo(ticket.firstResponseAt)}</>
                  : <>{(ticket.status === "Open") ? "Awaiting first response" : "—"}</>}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">Resolution · target {policy.resolve}h</p>
              <p className="mt-0.5 text-[13px] font-semibold">
                {ticket.resolvedAt ? <>Resolved {timeAgo(ticket.resolvedAt)}</> : <>Target {fmtDateTime(new Date(new Date(ticket.createdAt).getTime() + policy.resolve * 3_600_000).toISOString())}</>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Description" className="animate-fade-up">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">{ticket.description}</p>
          </Card>

          {/* Time tracking */}
          <Card title="Time tracking" sub={`${fmtMinutes(ticket.minutesTotal)} logged in total · SRS F.4 resource utilization`} className="animate-fade-up" pad={false}>
            {manage && (
              <div className="flex flex-wrap items-end gap-2.5 border-b border-line/70 bg-paper/50 px-5 py-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-mute">Hours</span>
                  <TextInput type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} className="w-20 text-right" placeholder="0" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-mute">Minutes</span>
                  <TextInput type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-20 text-right" placeholder="0" />
                </label>
                <label className="min-w-[200px] flex-1">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-mute">What was done?</span>
                  <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Profiled slow query, added index" />
                </label>
                <Button loading={timeMutation.isPending} onClick={submitTime}>
                  <IconPlus width={14} height={14} /> Log time
                </Button>
              </div>
            )}
            {timeLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-mute">No time logged yet.</p>
            ) : (
              <Table minWidth="min-w-[520px]"
                head={<><Th>When</Th><Th>Engineer</Th><Th className="text-right">Duration</Th><Th>Note</Th></>}>
                {timeLogs.map((tl) => (
                  <tr key={tl.id} className="transition-colors hover:bg-brand-50/40">
                    <Td className="text-mute">{fmtDateTime(tl.createdAt)}</Td>
                    <Td className="font-semibold">{tl.userName}</Td>
                    <Td className="text-right">
                      <span className="tnum inline-flex items-center gap-1.5 font-mono font-bold text-brand-800">
                        <IconClock width={13} height={13} /> {fmtMinutes(tl.minutes)}
                      </span>
                    </Td>
                    <Td className="max-w-[260px] truncate text-[12.5px] text-mute">{tl.note || "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Attachments" sub="SRS F.6 · evidence & logs" className="animate-fade-up" pad={false}
            actions={manage && (
              <Button size="xs" variant="subtle" loading={attachMutation.isPending} onClick={() => fileRef.current?.click()}>
                <IconPaperclip width={12} height={12} /> Upload
              </Button>
            )}>
            <input
              ref={fileRef} type="file" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachMutation.mutate({ name: f.name, size: f.size });
                e.target.value = "";
              }}
            />
            {attachments.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-mute">No files attached.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-700">
                      <IconPaperclip width={15} height={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12.5px] font-bold">{a.name}</p>
                      <p className="text-[11.5px] text-mute">{(a.size / 1024).toFixed(1)} KB · {a.uploadedByName} · {timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Client context" className="animate-fade-up">
            {client ? (
              <>
                <Link to={`/clients/${client.id}`} className="font-display text-[16px] font-bold hover:text-brand-800">{client.companyName}</Link>
                <p className="mt-1 text-[12.5px] text-mute">{client.industryType} · Owner {client.ownerName}</p>
                <p className="mt-0.5 text-[12.5px] text-mute">{client.licensesCount} licenses · {client.contactsCount} contacts</p>
              </>
            ) : (
              <p className="text-[13px] text-mute">Client record unavailable.</p>
            )}
          </Card>
        </div>
      </div>

      <TicketFormModal open={editOpen} onClose={() => setEditOpen(false)} ticket={ticket} />
    </div>
  );
}
