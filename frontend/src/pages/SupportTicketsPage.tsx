import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtDateTime, fmtMinutes, timeAgo, useClientsOptions, useDebounced, useUsersQuery } from "../lib/utils";
import type { ListResponse, TicketRow } from "../types";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, EmptyState, ErrorState, Field, Modal, Pagination, priorityTone,
  Select, Table, TableSkeleton, Td, Textarea, TextInput, Th, ticketTone, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconEye, IconPencil, IconPlus, IconSearch } from "../components/icons";

const LIMIT = 10;

const ticketSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  subject: z.string().min(5, "Subject is required (min 5 characters)"),
  description: z.string().min(10, "Describe the issue (min 10 characters)"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]),
  assignedToId: z.string().optional().default(""),
});
type TicketForm = z.infer<typeof ticketSchema>;

export function TicketFormModal({ open, onClose, ticket }: { open: boolean; onClose: () => void; ticket: TicketRow | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const clientsQ = useClientsOptions();
  const usersQ = useUsersQuery(open);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketForm>({ resolver: zodResolver(ticketSchema) });

  useEffect(() => {
    if (!open) return;
    reset(ticket
      ? { clientId: ticket.clientId, subject: ticket.subject, description: ticket.description, priority: ticket.priority, status: ticket.status, assignedToId: ticket.assignedToId ?? "" }
      : { clientId: "", subject: "", description: "", priority: "Medium", status: "Open", assignedToId: "" });
  }, [open, ticket, reset]);

  const mutation = useMutation({
    mutationFn: (form: TicketForm) => (ticket ? api.put(`/tickets/${ticket.id}`, form) : api.post("/tickets", form)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      void qc.invalidateQueries({ queryKey: ["ticket"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", ticket ? "Ticket updated" : "Ticket created", ticket?.ref);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={ticket ? `Edit ${ticket.ref}` : "New support ticket"} sub="Module F · SLA clock starts at creation (SRS F.5)" width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {ticket ? "Save changes" : "Create ticket"}
          </Button>
        </>
      }>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Client" required error={errors.clientId?.message}>
          <Select error={!!errors.clientId} {...register("clientId")}>
            <option value="">Select client…</option>
            {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
        </Field>
        <Field label="Assigned to">
          <Select {...register("assignedToId")}>
            <option value="">Unassigned</option>
            {(usersQ.data ?? []).filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Subject" required error={errors.subject?.message}>
            <TextInput error={!!errors.subject} placeholder="Short summary of the issue" {...register("subject")} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Description" required error={errors.description?.message}>
            <Textarea error={!!errors.description} placeholder="Steps to reproduce, impact, environment…" {...register("description")} />
          </Field>
        </div>
        <Field label="Priority" required>
          <Select {...register("priority")}>
            {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Status" required>
          <Select {...register("status")}>
            {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manage = can(user?.role, "tickets.manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [clientId, setClientId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [formTicket, setFormTicket] = useState<TicketRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => setPage(1), [debouncedSearch, status, priority, clientId, assignedTo]);

  const clientsQ = useClientsOptions();
  const usersQ = useUsersQuery();

  const ticketsQ = useQuery({
    queryKey: ["tickets", page, debouncedSearch, status, priority, clientId, assignedTo],
    queryFn: async () =>
      (await api.get<ListResponse<TicketRow>>("/tickets", {
        params: {
          page, limit: LIMIT, status: status || undefined, priority: priority || undefined,
          clientId: clientId || undefined, assignedTo: assignedTo || undefined, search: debouncedSearch || undefined,
        },
      })).data,
    placeholderData: (prev) => prev,
  });

  const rows = ticketsQ.data?.data ?? [];
  const total = ticketsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        desc="Module F — SLA-bound ticket queue with time tracking. Critical: 2h first response / 8h resolution."
        actions={manage && (
          <Button onClick={() => { setFormTicket(null); setFormOpen(true); }}>
            <IconPlus width={15} height={15} /> New ticket
          </Button>
        )}
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search subject or ref (TK-…)…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[140px]">
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-[140px]">
            <option value="">All priorities</option>
            {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[180px]">
            <option value="">All clients</option>
            {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-[160px]">
            <option value="">Anyone</option>
            {(usersQ.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>

        {ticketsQ.isError ? (
          <ErrorState message={apiErrorMsg(ticketsQ.error)} onRetry={() => ticketsQ.refetch()} />
        ) : ticketsQ.isPending ? (
          <TableSkeleton cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState title="No tickets found" hint="Adjust filters or open a new ticket."
            action={manage ? <Button size="sm" onClick={() => { setFormTicket(null); setFormOpen(true); }}><IconPlus width={14} height={14} /> New ticket</Button> : undefined} />
        ) : (
          <Table minWidth="min-w-[980px]"
            head={
              <>
                <Th>Ref</Th><Th>Subject</Th><Th>Client</Th><Th>Priority</Th><Th>Status</Th>
                <Th>Assigned</Th><Th className="text-right">Time</Th><Th>Created</Th><Th className="text-right">Actions</Th>
              </>
            }>
            {rows.map((t) => (
              <tr key={t.id} className="group cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => navigate(`/tickets/${t.id}`)}>
                <Td className="font-mono text-[12.5px] font-bold text-brand-800">{t.ref}</Td>
                <Td className="max-w-[300px]"><p className="truncate font-bold group-hover:text-brand-800">{t.subject}</p></Td>
                <Td className="font-medium">{t.clientName}</Td>
                <Td><Badge tone={priorityTone(t.priority)} dot>{t.priority}</Badge></Td>
                <Td><Badge tone={ticketTone(t.status)}>{t.status}</Badge></Td>
                <Td className="text-mute">{t.assigneeName}</Td>
                <Td className="text-right"><span className="tnum font-mono font-semibold">{t.minutesTotal > 0 ? fmtMinutes(t.minutesTotal) : "—"}</span></Td>
                <Td className="text-mute"><span title={fmtDateTime(t.createdAt)}>{timeAgo(t.createdAt)}</span></Td>
                <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="ghost" size="xs" title="Open ticket" onClick={() => navigate(`/tickets/${t.id}`)}><IconEye width={13} height={13} /></Button>
                    {manage && (
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => { setFormTicket(t); setFormOpen(true); }}>
                        <IconPencil width={13} height={13} />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!ticketsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <TicketFormModal open={formOpen} onClose={() => setFormOpen(false)} ticket={formTicket} />
    </div>
  );
}
