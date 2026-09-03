import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, daysOverdue, downloadBlob, fmtDate, fmtMoney, todayISO } from "../lib/utils";
import type { ClientRow, CreditNote, InvoiceRow, Payment } from "../types";
import { PAYMENT_CATEGORIES, PAYMENT_METHODS } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, ErrorState, Field, invoiceTone, Modal, Select, Table, Td,
  Textarea, TextInput, Th, useToast,
} from "../components/ui";
import { Timeline } from "./ClientDetailPage";
import type { ActivityItem } from "../types";
import { IconCard, IconChevronLeft, IconDownload } from "../components/icons";

interface InvoiceBundle {
  invoice: InvoiceRow;
  client: ClientRow | null;
  payments: (Payment & { createdByName?: string })[];
  creditNotes: (CreditNote & { createdByName?: string })[];
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentDate: z.string().min(1, "Date is required"),
  method: z.enum(["Bank Transfer", "Card", "Cash", "Cheque"]),
  category: z.enum(["Hosting", "Maintenance", "Upgrade", "License"]),
  notes: z.string().optional().default(""),
});
type PaymentForm = z.infer<typeof paymentSchema>;

function PaymentModal({ open, onClose, bundle }: { open: boolean; onClose: () => void; bundle: InvoiceBundle }) {
  const toast = useToast();
  const qc = useQueryClient();
  const balance = bundle.invoice.balance;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema.superRefine((v, ctx) => {
      if (v.amount > balance + 0.001) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Cannot exceed balance of ${fmtMoney(balance)}`, path: ["amount"] });
    })),
  });

  useEffect(() => {
    if (open) reset({ amount: Math.min(balance, balance), paymentDate: todayISO(), method: "Bank Transfer", category: "Maintenance", notes: "" });
  }, [open, reset, balance]);

  const mutation = useMutation({
    mutationFn: (form: PaymentForm) => api.post(`/invoices/${bundle.invoice.id}/payments`, form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoice", bundle.invoice.id] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["client"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", "Payment recorded", `${bundle.invoice.number} status recalculated automatically.`);
      onClose();
    },
    onError: (e) => toast.push("error", "Payment failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Record payment" sub={`${bundle.invoice.number} · outstanding balance ${fmtMoney(balance)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            <IconCard width={15} height={15} /> Record payment
          </Button>
        </>
      }>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Amount (USD)" required hint={`max ${fmtMoney(balance)}`} error={errors.amount?.message}>
          <TextInput error={!!errors.amount} type="number" min={0.01} step="0.01" {...register("amount")} />
        </Field>
        <Field label="Payment date" required error={errors.paymentDate?.message}>
          <TextInput error={!!errors.paymentDate} type="date" {...register("paymentDate")} />
        </Field>
        <Field label="Method" required>
          <Select {...register("method")}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Category" required>
          <Select {...register("category")}>
            {PAYMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Notes">
            <TextInput placeholder="Reference, bank ref…" {...register("notes")} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

const creditSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  reason: z.string().min(5, "A reason (min 5 characters) is required"),
});
type CreditForm = z.infer<typeof creditSchema>;

function CreditNoteModal({ open, onClose, bundle }: { open: boolean; onClose: () => void; bundle: InvoiceBundle }) {
  const toast = useToast();
  const qc = useQueryClient();
  const balance = bundle.invoice.balance;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreditForm>({
    resolver: zodResolver(creditSchema.superRefine((v, ctx) => {
      if (v.amount > balance + 0.001) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Cannot exceed balance of ${fmtMoney(balance)}`, path: ["amount"] });
    })),
  });

  useEffect(() => {
    if (open) reset({ amount: 0, reason: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (form: CreditForm) => api.post(`/invoices/${bundle.invoice.id}/credit-notes`, form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoice", bundle.invoice.id] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", "Credit note issued", "Recorded immutably in the audit trail (Module I).");
      onClose();
    },
    onError: (e) => toast.push("error", "Credit note failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Issue credit note" sub={`${bundle.invoice.number} · credit reduces the outstanding balance`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>Issue credit note</Button>
        </>
      }>
      <form className="space-y-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Amount (USD)" required hint={`max ${fmtMoney(balance)}`} error={errors.amount?.message}>
          <TextInput error={!!errors.amount} type="number" min={0.01} step="0.01" {...register("amount")} />
        </Field>
        <Field label="Reason" required error={errors.reason?.message}>
          <Textarea error={!!errors.reason} placeholder="e.g. Service credit for downtime, scope reduction…" {...register("reason")} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const manage = can(user?.role, "invoices.manage");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [soaBusy, setSoaBusy] = useState(false);

  const bundleQ = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get<InvoiceBundle>(`/invoices/${id}`)).data,
  });

  const downloadSoa = async () => {
    setSoaBusy(true);
    try {
      const res = await api.get(`/invoices/${id}/soa`, { responseType: "blob" });
      downloadBlob(`SoA-${bundleQ.data?.invoice.number ?? id}.pdf`, res.data as Blob);
      toast.push("success", "Statement downloaded", "PDF generated from live ledger data.");
    } catch (e) {
      toast.push("error", "Download failed", apiErrorMsg(e));
    } finally {
      setSoaBusy(false);
    }
  };

  if (bundleQ.isError) return <ErrorState message={apiErrorMsg(bundleQ.error)} onRetry={() => bundleQ.refetch()} />;
  const bundle = bundleQ.data;
  if (!bundle)
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );

  const { invoice, client, payments, creditNotes } = bundle;
  const overdue = invoice.status === "Overdue";

  const timeline: ActivityItem[] = [
    ...payments.map((p) => ({
      id: `p-${p.id}`, kind: "payment" as const, title: `Payment received — ${fmtMoney(p.amount)}`,
      detail: `${p.method} · ${p.category}${p.notes ? ` · ${p.notes}` : ""} · by ${p.createdByName ?? "—"}`, at: p.createdAt,
    })),
    ...creditNotes.map((c) => ({
      id: `c-${c.id}`, kind: "credit" as const, title: `Credit note — ${fmtMoney(c.amount)}`,
      detail: `${c.reason} · by ${c.createdByName ?? "—"}`, at: c.createdAt,
    })),
    { id: `i-${invoice.id}`, kind: "invoice" as const, title: `Invoice ${invoice.number} issued`, detail: `Total ${fmtMoney(invoice.totalAmount)} · due ${fmtDate(invoice.dueDate)}`, at: invoice.createdAt },
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/invoices")} className="inline-flex items-center gap-1 text-[13px] font-bold text-mute transition-colors hover:text-brand-800">
        <IconChevronLeft width={14} height={14} /> All invoices
      </button>

      {/* ── Header ── */}
      <div className="rounded-xl border border-line bg-card p-6 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-[26px] font-extrabold tracking-tight">{invoice.number}</h1>
              <Badge tone={invoiceTone(invoice.status)} dot>{invoice.status}</Badge>
              {overdue && <Badge tone="red">{daysOverdue(invoice.dueDate)} days overdue</Badge>}
            </div>
            <p className="mt-1.5 text-[13.5px] text-mute">
              Billed to <strong className="text-ink">{client?.companyName ?? "—"}</strong>
              {client?.taxId && <span className="font-mono"> · {client.taxId}</span>} · Issued {fmtDate(invoice.issueDate)} · Due {fmtDate(invoice.dueDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" loading={soaBusy} onClick={() => void downloadSoa()}>
              <IconDownload width={14} height={14} /> Download SoA
            </Button>
            {manage && invoice.balance > 0.001 && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCreditOpen(true)}>Issue credit note</Button>
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  <IconCard width={14} height={14} /> Record payment
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Totals strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Subtotal", value: fmtMoney(invoice.subtotal) },
            { label: `Tax ${invoice.taxRatePct}%`, value: fmtMoney(invoice.taxAmount) },
            { label: "Total", value: fmtMoney(invoice.totalAmount), strong: true },
            { label: "Paid + credits", value: fmtMoney(invoice.paid + invoice.credits), good: true },
            { label: "Balance due", value: fmtMoney(invoice.balance), warn: invoice.balance > 0 && overdue },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border px-4 py-3 ${s.warn ? "border-rose-300 bg-rose-50" : "border-line/80 bg-paper/60"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">{s.label}</p>
              <p className={`tnum mt-1 font-mono text-lg font-bold ${s.warn ? "text-rose-700" : s.good ? "text-emerald-700" : s.strong ? "text-brand-800" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Line items */}
          <Card title="Line items" pad={false} className="animate-fade-up">
            <Table minWidth="min-w-[520px]"
              head={<><Th>Description</Th><Th className="text-right">Qty</Th><Th className="text-right">Unit price</Th><Th className="text-right">Amount</Th></>}>
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <Td className="font-medium">{it.description}</Td>
                  <Td className="text-right"><span className="tnum font-mono">{it.qty}</span></Td>
                  <Td className="text-right"><span className="tnum font-mono">{fmtMoney(it.unitPrice)}</span></Td>
                  <Td className="text-right"><span className="tnum font-mono font-semibold">{fmtMoney(it.qty * it.unitPrice)}</span></Td>
                </tr>
              ))}
              <tr className="bg-paper/60">
                <Td colSpan={3} className="text-right font-bold">Total (incl. tax)</Td>
                <Td className="text-right"><span className="tnum font-mono font-extrabold text-brand-800">{fmtMoney(invoice.totalAmount)}</span></Td>
              </tr>
            </Table>
          </Card>

          {/* Payments */}
          <Card title="Payments" sub={`${payments.length} recorded`} pad={false} className="animate-fade-up"
            actions={manage && invoice.balance > 0.001 && (
              <Button size="xs" variant="subtle" onClick={() => setPaymentOpen(true)}><IconCard width={12} height={12} /> Record</Button>
            )}>
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-mute">No payments recorded yet.</p>
            ) : (
              <Table minWidth="min-w-[560px]"
                head={<><Th>Date</Th><Th className="text-right">Amount</Th><Th>Method</Th><Th>Category</Th><Th>By</Th><Th>Notes</Th></>}>
                {payments.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-brand-50/40">
                    <Td className="text-mute">{fmtDate(p.paymentDate)}</Td>
                    <Td className="text-right"><span className="tnum font-mono font-bold text-emerald-700">{fmtMoney(p.amount)}</span></Td>
                    <Td>{p.method}</Td>
                    <Td><Badge tone="teal">{p.category}</Badge></Td>
                    <Td className="text-mute">{p.createdByName}</Td>
                    <Td className="max-w-[180px] truncate text-[12.5px] text-mute">{p.notes || "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* Credit notes */}
          <Card title="Credit notes" pad={false} className="animate-fade-up">
            {creditNotes.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-mute">None issued.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {creditNotes.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="tnum font-mono font-bold text-amber-700">−{fmtMoney(c.amount)}</span>
                      <span className="text-[12px] text-mute">{fmtDate(c.createdAt)} · {c.createdByName}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-mute">{c.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Billing address */}
          {client && (
            <Card title="Billed to" className="animate-fade-up">
              <p className="text-[14px] font-bold">{client.companyName}</p>
              <p className="mt-1 text-[13px] text-mute">{client.billingAddress || "No billing address on file"}</p>
              <p className="mt-1 font-mono text-[12.5px] text-mute">Tax ID: {client.taxId || "—"}</p>
              <p className="mt-1 text-[12.5px] text-mute">Owner: {client.ownerName} · {client.industryType}</p>
            </Card>
          )}

          {/* Timeline */}
          <Card title="Ledger timeline" sub="Immutable sequence (Module I)" className="animate-fade-up">
            <Timeline items={timeline} />
          </Card>
        </div>
      </div>

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} bundle={bundle} />
      <CreditNoteModal open={creditOpen} onClose={() => setCreditOpen(false)} bundle={bundle} />
    </div>
  );
}
