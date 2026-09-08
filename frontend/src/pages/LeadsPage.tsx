import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtDate, fmtMoney0, useDebounced, useUsersQuery } from "../lib/utils";
import type { Lead, ListResponse } from "../types";
import { INDUSTRIES, LOST_REASONS, SOURCES, STAGES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, EmptyState, ErrorState, Field, Modal,
  Pagination, Select, stageTone, Table, TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconArrowRight, IconPencil, IconPlus, IconSearch, IconX } from "../components/icons";

const LIMIT = 10;

const getArr = <T,>(d: unknown): T[] => {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === "object" && "data" in d && Array.isArray((d as Record<string, unknown>).data)) {
    return (d as Record<string, unknown>).data as T[];
  }
  return [];
};

const leadSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional().default(""),
  source: z.string().min(1, "Select a source"),
  estimatedValue: z.coerce.number().min(0, "Must be ≥ 0"),
  stage: z.enum(["New", "Contacted", "Proposal", "Negotiation", "Won", "Lost"]),
  notes: z.string().optional().default(""),
});
type LeadForm = z.infer<typeof leadSchema>;

function LeadFormModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadForm>({ resolver: zodResolver(leadSchema) });

  useEffect(() => {
    if (open) {
      if (lead) {
        reset({ 
          companyName: lead.companyName, 
          contactName: lead.contactName, 
          email: lead.email, 
          phone: lead.phone, 
          source: lead.source, 
          estimatedValue: lead.estimatedValue, 
          stage: lead.stage, 
          notes: lead.notes ?? "" 
        });
      } else {
        reset({ 
          companyName: "", 
          contactName: "", 
          email: "", 
          phone: "", 
          source: "Website", 
          estimatedValue: 10000, 
          stage: "New", 
          notes: "" 
        });
      }
    }
  }, [open, lead, reset]);

  const mutation = useMutation({
    mutationFn: (form: LeadForm) => lead && lead.id ? api.patch(`/leads/${lead.id}`, form) : api.post("/leads", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", lead ? "Lead updated" : "Lead created", lead?.companyName);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  if (!lead && !open) return null;

  return (
    <Modal open={open} onClose={onClose} title={lead ? `Edit lead — ${lead.companyName}` : "New lead"} sub="Module A · lead & opportunity capture"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
          {lead ? "Save changes" : "Create lead"}
        </Button>
      </>}>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Company" required error={errors.companyName?.message}>
          <TextInput error={!!errors.companyName} placeholder="Acme Industries" {...register("companyName")} />
        </Field>
        <Field label="Contact person" required error={errors.contactName?.message}>
          <TextInput error={!!errors.contactName} placeholder="Jane Doe" {...register("contactName")} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <TextInput error={!!errors.email} type="email" placeholder="jane@acme.com" {...register("email")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <TextInput placeholder="+1 555 010 2299" {...register("phone")} />
        </Field>
        <Field label="Source" required error={errors.source?.message}>
          <Select error={!!errors.source} {...register("source")}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <Field label="Est. value (USD)" required error={errors.estimatedValue?.message}>
          <TextInput error={!!errors.estimatedValue} type="number" min={0} step="100" {...register("estimatedValue")} />
        </Field>
        <Field label="Stage" required error={errors.stage?.message}>
          <Select error={!!errors.stage} {...register("stage")}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <div className="col-span-2">
          <Field label="Notes"><TextInput placeholder="Context, next steps…" {...register("notes")} /></Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

const convertSchema = z.object({
  companyName: z.string().min(2),
  taxId: z.string().optional().default(""),
  billingAddress: z.string().optional().default(""),
  industryType: z.string().min(1),
  accountOwnerId: z.string().min(1),
  taxRatePct: z.coerce.number().min(0).max(100),
  hostingFeeAmount: z.coerce.number().min(0),
  hostingCycle: z.enum(["Monthly", "Quarterly", "Annual"]),
  status: z.enum(["Prospect", "Active", "OnHold", "Churned"]),
});
type ConvertForm = z.infer<typeof convertSchema>;

function ConvertModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const usersQ = useUsersQuery(open);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConvertForm>({ resolver: zodResolver(convertSchema) });

  useEffect(() => {
    if (open && lead) {
      reset({
        companyName: lead.companyName, 
        taxId: "", 
        billingAddress: "", 
        industryType: "Other",
        accountOwnerId: user?.id ?? "", 
        taxRatePct: 15, 
        hostingFeeAmount: 0, 
        hostingCycle: "Monthly", 
        status: "Active",
      });
    }
  }, [open, lead, reset, user]);

  const mutation = useMutation({
    mutationFn: (form: ConvertForm) => lead && lead.id ? api.post(`/leads/${lead.id}/convert`, form) : Promise.reject(new Error("No lead")),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["leads", "clients", "dash"] });
      toast.push("success", "Lead converted to client", lead?.companyName);
      onClose();
      if (res.data?.client?.id) {
        navigate(`/clients/${res.data.client.id}`);
      }
    },
    onError: (e) => toast.push("error", "Conversion failed", apiErrorMsg(e)),
  });

  if (!lead || !open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Convert lead to client" sub={`${lead.companyName} · ${lead.contactName} will become the primary contact`} width="max-w-xl"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
          <IconArrowRight width={15} height={15} /> Convert to client
        </Button>
      </>}>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-[12.5px] font-semibold text-brand-900">
        <Badge tone={stageTone(lead.stage)}>{lead.stage}</Badge>
        Est. value {fmtMoney0(lead.estimatedValue)} · Source {lead.source} · {lead.email}
      </div>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Company name" required error={errors.companyName?.message}>
          <TextInput error={!!errors.companyName} {...register("companyName")} />
        </Field>
        <Field label="Tax ID" error={errors.taxId?.message}>
          <TextInput placeholder="TX-00000000" {...register("taxId")} />
        </Field>
        <div className="col-span-2">
          <Field label="Billing address" error={errors.billingAddress?.message}>
            <TextInput placeholder="Street, city" {...register("billingAddress")} />
          </Field>
        </div>
        <Field label="Industry" required error={errors.industryType?.message}>
          <Select {...register("industryType")}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</Select>
        </Field>
        <Field label="Account owner" required error={errors.accountOwnerId?.message}>
          <Select error={!!errors.accountOwnerId} {...register("accountOwnerId")}>
            {getArr(usersQ.data).filter((u: any) => u.isActive).map((u: any) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
          </Select>
        </Field>
        <Field label="Tax rate %" error={errors.taxRatePct?.message}>
          <TextInput type="number" min={0} max={100} step="0.5" {...register("taxRatePct")} />
        </Field>
        <Field label="Status" required>
          <Select {...register("status")}>{["Prospect", "Active", "OnHold", "Churned"].map((s) => <option key={s}>{s}</option>)}</Select>
        </Field>
        <Field label="Hosting fee" hint="0 if none" error={errors.hostingFeeAmount?.message}>
          <TextInput type="number" min={0} step="10" {...register("hostingFeeAmount")} />
        </Field>
        <Field label="Hosting cycle">
          <Select {...register("hostingCycle")}>{["Monthly", "Quarterly", "Annual"].map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

function LostModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState<string | null>(null);
  
  const mutation = useMutation({
    mutationFn: () => lead && lead.id ? api.post(`/leads/${lead.id}/lost`, { lostReason: reason }) : Promise.reject(new Error("No lead")),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      
      const reasonLabel = LOST_REASONS.find(r => r.value === reason)?.label || reason;
      toast.push("info", "Lead marked as lost", `${lead?.companyName} — ${reasonLabel}`);
      onClose();
    },
    onError: (e) => toast.push("error", "Could not mark lost", apiErrorMsg(e)),
  });

  if (!lead || !open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Mark lead as lost" sub={`${lead.companyName} · a lost reason is required (SRS A.4)`} width="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" disabled={!reason} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          <IconX width={14} height={14} /> Mark lost
        </Button>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        {LOST_REASONS.map((r) => (
          <button key={r.value} type="button" onClick={() => setReason(r.value)}
            className={`rounded-lg border px-3 py-2.5 text-left text-[13.5px] font-semibold transition-all duration-150 active:scale-[0.98] ${
              reason === r.value ? "border-rose-500 bg-rose-600/10 text-rose-800 ring-2 ring-rose-200" : "border-line bg-card text-ink hover:border-rose-300"
            }`}>
            {r.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const manage = can(user?.role, "leads.manage");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [formLead, setFormLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [lostLead, setLostLead] = useState<Lead | null>(null);

  useEffect(() => setPage(1), [debouncedSearch, stage, source]);

  const leadsQ = useQuery({
    queryKey: ["leads", page, debouncedSearch, stage, source],
    queryFn: async () => (await api.get<ListResponse<Lead>>("/leads", {
      params: { page, limit: LIMIT, search: debouncedSearch || undefined, stage: stage || undefined, source: source || undefined },
    })).data,
    placeholderData: (prev) => prev,
  });

  const total = leadsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Leads & Opportunities" desc="Module A — capture, qualify and convert. Won leads become clients; lost leads keep a reason for win/loss analysis."
        actions={manage && <Button onClick={() => { setFormLead(null); setFormOpen(true); }}><IconPlus width={15} height={15} /> New lead</Button>} />
      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search company, contact or email…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-[150px]">
            <option value="">All stages</option>{STAGES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={source} onChange={(e) => setSource(e.target.value)} className="w-[150px]">
            <option value="">All sources</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
        {leadsQ.isError ? (
          <ErrorState message={apiErrorMsg(leadsQ.error)} onRetry={() => leadsQ.refetch()} />
        ) : leadsQ.isPending ? (
          <TableSkeleton cols={7} />
        ) : getArr<Lead>(leadsQ.data).length === 0 ? (
          <EmptyState title="No leads match" hint="Adjust the filters or capture a new opportunity."
            action={manage ? <Button size="sm" onClick={() => { setFormLead(null); setFormOpen(true); }}><IconPlus width={14} height={14} /> New lead</Button> : undefined} />
        ) : (
          <Table head={<><Th>Company</Th><Th>Contact</Th><Th>Source</Th><Th className="text-right">Est. value</Th><Th>Stage</Th><Th>Created</Th>{manage && <Th className="text-right">Actions</Th>}</>}>
            {getArr<Lead>(leadsQ.data).map((lead) => (
              <tr key={lead.id} className="group transition-colors hover:bg-brand-50/40">
                <Td><p className="font-bold">{lead.companyName}</p>{lead.lostReason && <p className="text-[11.5px] text-mute">Lost: {LOST_REASONS.find(r => r.value === lead.lostReason)?.label || lead.lostReason}</p>}</Td>
                <Td><p className="font-medium">{lead.contactName}</p><p className="text-[12px] text-mute">{lead.email}</p></Td>
                <Td><Badge tone="slate">{lead.source}</Badge></Td>
                <Td className="text-right"><span className="tnum font-mono font-semibold">{fmtMoney0(lead.estimatedValue)}</span></Td>
                <Td><Badge tone={stageTone(lead.stage)} dot>{lead.stage}</Badge></Td>
                <Td className="text-mute">{fmtDate(lead.createdAt)}</Td>
                {manage && (
                  <Td className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {can(user?.role, "leads.convert") && lead.stage !== "Won" && lead.stage !== "Lost" && (
                        <Button variant="subtle" size="xs" title="Convert to client" onClick={() => setConvertLead(lead)}><IconArrowRight width={13} height={13} /> Convert</Button>
                      )}
                      {lead.stage !== "Lost" && lead.stage !== "Won" && (
                        <Button variant="ghost" size="xs" title="Mark lost" onClick={() => setLostLead(lead)}><IconX width={13} height={13} /></Button>
                      )}
                      <Button variant="ghost" size="xs" title="Edit lead" onClick={() => { setFormLead(lead); setFormOpen(true); }}><IconPencil width={13} height={13} /></Button>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </Table>
        )}
        {!leadsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>
      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} lead={formLead} />
      <ConvertModal open={!!convertLead} onClose={() => setConvertLead(null)} lead={convertLead} />
      <LostModal open={!!lostLead} onClose={() => setLostLead(null)} lead={lostLead} />
    </div>
  );
}