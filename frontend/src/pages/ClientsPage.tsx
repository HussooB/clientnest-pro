import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtMoney, useDebounced, useUsersQuery } from "../lib/utils";
import type { ClientRow, ListResponse } from "../types";
import { CLIENT_STATUSES, HOSTING_CYCLES, INDUSTRIES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, clientTone, ConfirmModal, EmptyState, ErrorState, Field,
  Modal, Pagination, Select, Table, TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from "../components/icons";

const LIMIT = 10;

const clientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  taxId: z.string().optional().default(""),
  billingAddress: z.string().optional().default(""),
  industryType: z.string().min(1, "Select an industry"),
  status: z.enum(["Prospect", "Active", "OnHold", "Churned"]),
  accountOwnerId: z.string().min(1, "Select an account owner"),
  taxRatePct: z.coerce.number().min(0).max(100),
  hostingFeeAmount: z.coerce.number().min(0),
  hostingCycle: z.enum(["Monthly", "Quarterly", "Annual"]),
});
export type ClientForm = z.infer<typeof clientSchema>;

export function ClientFormModal({ open, onClose, client }: { open: boolean; onClose: () => void; client: ClientRow | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const usersQ = useUsersQuery(open);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({ resolver: zodResolver(clientSchema) });

  useEffect(() => {
    if (!open) return;
    reset(client
      ? {
          companyName: client.companyName, taxId: client.taxId, billingAddress: client.billingAddress,
          industryType: client.industryType, status: client.status, accountOwnerId: client.accountOwnerId,
          taxRatePct: client.taxRatePct, hostingFeeAmount: client.hostingFeeAmount, hostingCycle: client.hostingCycle,
        }
      : {
          companyName: "", taxId: "", billingAddress: "", industryType: "Other", status: "Prospect",
          accountOwnerId: usersQ.data?.[0]?.id ?? "", taxRatePct: 15, hostingFeeAmount: 0, hostingCycle: "Monthly",
        });
  }, [open, client, reset, usersQ.data]);

  const mutation = useMutation({
    mutationFn: (form: ClientForm) => (client ? api.put(`/clients/${client.id}`, form) : api.post("/clients", form)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["client"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", client ? "Client updated" : "Client created", client?.companyName);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={client ? `Edit — ${client.companyName}` : "New client"} sub="Module B · company record & recurring fee profile" width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {client ? "Save changes" : "Create client"}
          </Button>
        </>
      }>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Company name" required error={errors.companyName?.message}>
          <TextInput error={!!errors.companyName} placeholder="Acme Industries" {...register("companyName")} />
        </Field>
        <Field label="Tax ID" error={errors.taxId?.message}>
          <TextInput placeholder="TX-00000000" {...register("taxId")} />
        </Field>
        <div className="col-span-2">
          <Field label="Billing address" error={errors.billingAddress?.message}>
            <TextInput placeholder="Street, city, country" {...register("billingAddress")} />
          </Field>
        </div>
        <Field label="Industry" required error={errors.industryType?.message}>
          <Select {...register("industryType")}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </Select>
        </Field>
        <Field label="Status" required>
          <Select {...register("status")}>
            {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Account owner" required error={errors.accountOwnerId?.message}>
          <Select error={!!errors.accountOwnerId} {...register("accountOwnerId")}>
            {(usersQ.data ?? []).filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
          </Select>
        </Field>
        <Field label="Tax rate %" error={errors.taxRatePct?.message}>
          <TextInput type="number" min={0} max={100} step="0.5" {...register("taxRatePct")} />
        </Field>
        <Field label="Hosting fee" hint="0 if none" error={errors.hostingFeeAmount?.message}>
          <TextInput type="number" min={0} step="10" {...register("hostingFeeAmount")} />
        </Field>
        <Field label="Hosting cycle">
          <Select {...register("hostingCycle")}>
            {HOSTING_CYCLES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const manage = can(user?.role, "clients.manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [formClient, setFormClient] = useState<ClientRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);

  useEffect(() => setPage(1), [debouncedSearch, status, industry]);

  const clientsQ = useQuery({
    queryKey: ["clients", page, debouncedSearch, status, industry],
    queryFn: async () =>
      (await api.get<ListResponse<ClientRow>>("/clients", {
        params: { page, limit: LIMIT, search: debouncedSearch || undefined, status: status || undefined, industry: industry || undefined },
      })).data,
    placeholderData: (prev) => prev,
  });

  const toast = useToast();
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (c: ClientRow) => api.delete(`/clients/${c.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", "Client deactivated", `${deleteTarget?.companyName} was soft-deleted (SRS B.6).`);
      setDeleteTarget(null);
    },
    onError: (e) => toast.push("error", "Delete failed", apiErrorMsg(e)),
  });

  const rows = clientsQ.data?.data ?? [];
  const total = clientsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Clients & Companies"
        desc="Module B — company records, contacts, recurring hosting fees and account ownership."
        actions={manage && (
          <Button onClick={() => { setFormClient(null); setFormOpen(true); }}>
            <IconPlus width={15} height={15} /> New client
          </Button>
        )}
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search company or tax ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[150px]">
            <option value="">All statuses</option>
            {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-[180px]">
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </Select>
        </div>

        {clientsQ.isError ? (
          <ErrorState message={apiErrorMsg(clientsQ.error)} onRetry={() => clientsQ.refetch()} />
        ) : clientsQ.isPending ? (
          <TableSkeleton cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title="No clients found" hint="Try different filters, or create the first client record." />
        ) : (
          <Table
            head={
              <>
                <Th>Company</Th><Th>Status</Th><Th>Account owner</Th><Th>Industry</Th>
                <Th className="text-right">Contacts</Th><Th className="text-right">Licenses</Th>
                <Th className="text-right">Hosting</Th><Th className="text-right">Actions</Th>
              </>
            }>
            {rows.map((c) => (
              <tr key={c.id} className="group cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => navigate(`/clients/${c.id}`)}>
                <Td>
                  <p className="font-bold group-hover:text-brand-800">{c.companyName}</p>
                  <p className="font-mono text-[11.5px] text-mute">{c.taxId || "no tax ID"}</p>
                </Td>
                <Td><Badge tone={clientTone(c.status)} dot>{c.status}</Badge></Td>
                <Td className="font-medium">{c.ownerName}</Td>
                <Td className="text-mute">{c.industryType}</Td>
                <Td className="text-right"><span className="tnum font-mono font-semibold">{c.contactsCount}</span></Td>
                <Td className="text-right"><span className="tnum font-mono font-semibold">{c.licensesCount}</span></Td>
                <Td className="text-right">
                  {c.hostingFeeAmount > 0
                    ? <span className="tnum font-mono font-semibold">{fmtMoney(c.hostingFeeAmount)}<span className="text-[11px] text-mute">/{c.hostingCycle.toLowerCase().slice(0, 2) === "mo" ? "mo" : c.hostingCycle === "Quarterly" ? "qtr" : "yr"}</span></span>
                    : <span className="text-mute">—</span>}
                </Td>
                <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Link to={`/clients/${c.id}`}><Button variant="ghost" size="xs" title="Open profile"><IconEye width={13} height={13} /></Button></Link>
                    {manage && (
                      <Button variant="ghost" size="xs" title="Edit client" onClick={() => { setFormClient(c); setFormOpen(true); }}>
                        <IconPencil width={13} height={13} />
                      </Button>
                    )}
                    {can(user?.role, "clients.delete") && (
                      <Button variant="ghost" size="xs" title="Soft delete" className="hover:text-rose-700" onClick={() => setDeleteTarget(c)}>
                        <IconTrash width={13} height={13} />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!clientsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <ClientFormModal open={formOpen} onClose={() => setFormOpen(false)} client={formClient} />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Soft-delete client?"
        confirmLabel="Delete client"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        body={
          <>
            <strong>{deleteTarget?.companyName}</strong> will be marked as deleted. Financial history is preserved for
            audit purposes (SRS B.6 / Module I) and the record stays restorable by an administrator.
          </>
        }
      />
    </div>
  );
}
