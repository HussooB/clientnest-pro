import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtDate, fmtMoney, todayISO, useClientsOptions, useDebounced } from "../lib/utils";
import type { InvoiceRow, ListResponse } from "../types";
import { INVOICE_STATUSES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, invoiceTone,
  Modal, Pagination, Select, Table, TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from "../components/icons";

const LIMIT = 10;

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["Draft", "Sent"]),
  taxRatePct: z.coerce.number().min(0).max(100),
  items: z
    .array(z.object({
      description: z.string().min(2, "Required"),
      qty: z.coerce.number().min(1, "≥1"),
      unitPrice: z.coerce.number().min(0, "≥0"),
    }))
    .min(1, "Add at least one line item"),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

function InvoiceFormModal({ open, onClose, invoice, presetClientId }: {
  open: boolean; onClose: () => void; invoice: InvoiceRow | null; presetClientId?: string;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const clientsQ = useClientsOptions();
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watched = watch();

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      reset({
        clientId: invoice.clientId, issueDate: invoice.issueDate.slice(0, 10), dueDate: invoice.dueDate.slice(0, 10),
        status: invoice.status === "Draft" ? "Draft" : "Sent", taxRatePct: invoice.taxRatePct,
        items: invoice.items.length > 0
          ? invoice.items.map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice }))
          : [{ description: "Professional services", qty: 1, unitPrice: invoice.subtotal }],
      });
    } else {
      const d = new Date();
      const due = new Date(Date.now() + 30 * 86_400_000);
      reset({
        clientId: presetClientId ?? "", issueDate: d.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10),
        status: "Sent", taxRatePct: 15,
        items: [{ description: "Professional services", qty: 1, unitPrice: 1000 }],
      });
    }
  }, [open, invoice, presetClientId, reset]);

  const subtotal = (watched.items ?? []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const tax = (subtotal * (Number(watched.taxRatePct) || 0)) / 100;

  const mutation = useMutation({
    mutationFn: (form: InvoiceForm) => {
      const payload = { ...form, subtotal: Math.round(subtotal * 100) / 100 };
      return invoice ? api.put(`/invoices/${invoice.id}`, payload) : api.post("/invoices", payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["client"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", invoice ? "Invoice updated" : "Invoice created", invoice?.number);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={invoice ? `Edit ${invoice.number}` : "New invoice"} sub="Module D · tax and totals are computed automatically" width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {invoice ? "Save changes" : "Create invoice"}
          </Button>
        </>
      }>
      <form className="space-y-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" required error={errors.clientId?.message}>
            <Select error={!!errors.clientId} {...register("clientId")}>
              <option value="">Select client…</option>
              {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select {...register("status")}>
              <option>Draft</option><option>Sent</option>
            </Select>
          </Field>
          <Field label="Issue date" required error={errors.issueDate?.message}>
            <TextInput error={!!errors.issueDate} type="date" {...register("issueDate")} />
          </Field>
          <Field label="Due date" required error={errors.dueDate?.message}>
            <TextInput error={!!errors.dueDate} type="date" {...register("dueDate")} />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Line items <span className="text-rose-600">*</span></span>
            <Button type="button" variant="subtle" size="xs" onClick={() => append({ description: "", qty: 1, unitPrice: 0 })}>
              <IconPlus width={12} height={12} /> Add line
            </Button>
          </div>
          {errors.items && !Array.isArray(errors.items) && (
            <p className="mb-2 text-xs font-medium text-rose-700">{errors.items.message}</p>
          )}
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <TextInput placeholder="Description" error={!!errors.items?.[i]?.description} {...register(`items.${i}.description`)} />
                </div>
                <TextInput type="number" min={1} className="w-20 text-right" placeholder="Qty" error={!!errors.items?.[i]?.qty} {...register(`items.${i}.qty`)} />
                <TextInput type="number" min={0} step="0.01" className="w-28 text-right" placeholder="Unit price" error={!!errors.items?.[i]?.unitPrice} {...register(`items.${i}.unitPrice`)} />
                <Button type="button" variant="ghost" size="sm" className="mt-0.5 hover:text-rose-700" disabled={fields.length === 1} onClick={() => remove(i)} aria-label="Remove line">
                  <IconTrash width={14} height={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 items-end gap-4 rounded-lg border border-line bg-paper/60 p-4">
          <Field label="Tax rate %" error={errors.taxRatePct?.message}>
            <TextInput type="number" min={0} max={100} step="0.5" {...register("taxRatePct")} />
          </Field>
          <div className="space-y-1 text-right">
            <p className="text-[12.5px] text-mute">Subtotal <span className="tnum ml-2 font-mono font-bold text-ink">{fmtMoney(subtotal)}</span></p>
            <p className="text-[12.5px] text-mute">Tax <span className="tnum ml-2 font-mono font-bold text-ink">{fmtMoney(tax)}</span></p>
            <p className="border-t border-line pt-1 text-[14px] font-bold">Total <span className="tnum ml-2 font-mono text-brand-800">{fmtMoney(subtotal + tax)}</span></p>
          </div>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const manage = can(user?.role, "invoices.manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [formInvoice, setFormInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const presetClientId = params.get("clientId") ?? undefined;

  useEffect(() => {
    if (params.get("new") || params.get("clientId") || params.get("status")) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setPage(1), [debouncedSearch, status, clientId, from, to]);

  const clientsQ = useClientsOptions();

  const invoicesQ = useQuery({
    queryKey: ["invoices", page, debouncedSearch, status, clientId, from, to],
    queryFn: async () =>
      (await api.get<ListResponse<InvoiceRow>>("/invoices", {
        params: {
          page, limit: LIMIT, status: status || undefined, clientId: clientId || undefined,
          from: from || undefined, to: to || undefined, search: debouncedSearch || undefined,
        },
      })).data,
    placeholderData: (prev) => prev,
  });

  const toast = useToast();
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (i: InvoiceRow) => api.delete(`/invoices/${i.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", "Invoice voided", `${deleteTarget?.number} was soft-deleted (Module I log entry created).`);
      setDeleteTarget(null);
    },
    onError: (e) => toast.push("error", "Delete failed", apiErrorMsg(e)),
  });

  const rows = invoicesQ.data?.data ?? [];
  const total = invoicesQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Invoices & Payments"
        desc="Module D — billing, tax, payments, credit notes and statements of account."
        actions={manage && (
          <Button onClick={() => { setFormInvoice(null); setFormOpen(true); }}>
            <IconPlus width={15} height={15} /> New invoice
          </Button>
        )}
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search invoice # or client…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[160px]">
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[180px]">
            <option value="">All clients</option>
            {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[145px]" aria-label="Issued from" />
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[145px]" aria-label="Issued to" />
        </div>

        {invoicesQ.isError ? (
          <ErrorState message={apiErrorMsg(invoicesQ.error)} onRetry={() => invoicesQ.refetch()} />
        ) : invoicesQ.isPending ? (
          <TableSkeleton cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState title="No invoices match" hint="Adjust filters or create a new invoice."
            action={manage ? <Button size="sm" onClick={() => { setFormInvoice(null); setFormOpen(true); }}><IconPlus width={14} height={14} /> New invoice</Button> : undefined} />
        ) : (
          <Table minWidth="min-w-[1060px]"
            head={
              <>
                <Th>Invoice</Th><Th>Client</Th><Th>Issued</Th><Th>Due</Th>
                <Th className="text-right">Subtotal</Th><Th className="text-right">Tax</Th>
                <Th className="text-right">Total</Th><Th className="text-right">Paid</Th>
                <Th className="text-right">Balance</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </>
            }>
            {rows.map((i) => (
              <tr key={i.id} className="group cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => navigate(`/invoices/${i.id}`)}>
                <Td className="font-mono font-bold group-hover:text-brand-800">{i.number}</Td>
                <Td className="font-medium">{i.clientName}</Td>
                <Td className="text-mute">{fmtDate(i.issueDate)}</Td>
                <Td className="text-mute">{fmtDate(i.dueDate)}</Td>
                <Td className="text-right"><span className="tnum font-mono">{fmtMoney(i.subtotal)}</span></Td>
                <Td className="text-right"><span className="tnum font-mono text-mute">{fmtMoney(i.taxAmount)}</span></Td>
                <Td className="text-right"><span className="tnum font-mono font-bold">{fmtMoney(i.totalAmount)}</span></Td>
                <Td className="text-right"><span className="tnum font-mono text-emerald-700">{fmtMoney(i.paid)}</span></Td>
                <Td className="text-right">
                  <span className={`tnum font-mono font-bold ${i.balance > 0 && i.status === "Overdue" ? "text-rose-700" : ""}`}>{fmtMoney(i.balance)}</span>
                </Td>
                <Td><Badge tone={invoiceTone(i.status)} dot>{i.status}</Badge></Td>
                <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Link to={`/invoices/${i.id}`}><Button variant="ghost" size="xs" title="View detail"><IconEye width={13} height={13} /></Button></Link>
                    {manage && (
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => { setFormInvoice(i); setFormOpen(true); }}>
                        <IconPencil width={13} height={13} />
                      </Button>
                    )}
                    {can(user?.role, "invoices.delete") && (
                      <Button variant="ghost" size="xs" title="Void invoice" className="hover:text-rose-700" onClick={() => setDeleteTarget(i)}>
                        <IconTrash width={13} height={13} />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!invoicesQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <InvoiceFormModal open={formOpen} onClose={() => setFormOpen(false)} invoice={formInvoice} presetClientId={presetClientId} />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Void invoice?"
        confirmLabel="Void invoice"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        body={
          <>
            <strong>{deleteTarget?.number}</strong> ({deleteTarget && fmtMoney(deleteTarget.totalAmount)}) will be voided.
            Per Module I, financial records are never hard-deleted — an immutable audit entry records this action.
            <span className="mt-1 block text-[12px] text-mute">Today: {fmtDate(todayISO())}</span>
          </>
        }
      />
    </div>
  );
}
