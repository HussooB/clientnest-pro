import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can, fmtDate, fmtMoney0, useClientsOptions, useDebounced, useProductsQuery } from "../lib/utils";
import type { LicenseRow, ListResponse } from "../types";
import { LICENSE_TYPES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, EmptyState, ErrorState, Field, licenseTone, Modal,
  Pagination, Select, Table, TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconPencil, IconPlus, IconSearch } from "../components/icons";

const LIMIT = 10;

export function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <Badge tone="slate">Perpetual · N/A</Badge>;
  if (days < 0) return <Badge tone="red" dot>Expired {-days}d ago</Badge>;
  if (days <= 30) return <Badge tone="red" dot>{days}d left</Badge>;
  if (days <= 60) return <Badge tone="amber" dot>{days}d left</Badge>;
  if (days <= 90) return <Badge tone="yellow" dot>{days}d left</Badge>;
  return <Badge tone="green">{days}d left</Badge>;
}

const licenseSchema = z
  .object({
    clientId: z.string().min(1, "Select a client"),
    productId: z.string().min(1, "Select a product"),
    type: z.enum(["Perpetual", "Subscription", "Leased"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().default(""),
    seats: z.coerce.number().int().min(1, "At least 1 seat"),
    monthlyValue: z.coerce.number().min(0, "Must be ≥ 0"),
  })
  .refine((v) => v.type === "Perpetual" || !!v.endDate, { message: "End date is required for non-perpetual licenses", path: ["endDate"] });
type LicenseForm = z.infer<typeof licenseSchema>;

function LicenseFormModal({ open, onClose, license, presetClientId }: {
  open: boolean; onClose: () => void; license: LicenseRow | null; presetClientId?: string;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const clientsQ = useClientsOptions();
  const productsQ = useProductsQuery();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<LicenseForm>({ resolver: zodResolver(licenseSchema) });
  const type = watch("type");

  useEffect(() => {
    if (!open) return;
    if (license) {
      reset({
        clientId: license.clientId, productId: license.productId, type: license.type,
        startDate: license.startDate.slice(0, 10), endDate: license.endDate ? license.endDate.slice(0, 10) : "",
        seats: license.seats, monthlyValue: license.monthlyValue,
      });
    } else {
      reset({
        clientId: presetClientId ?? "", productId: productsQ.data?.[0]?.id ?? "", type: "Subscription",
        startDate: new Date().toISOString().slice(0, 10), endDate: "", seats: 10, monthlyValue: 250,
      });
    }
  }, [open, license, presetClientId, reset, productsQ.data]);

  const mutation = useMutation({
    mutationFn: (form: LicenseForm) => {
      const payload = { ...form, endDate: form.type === "Perpetual" ? null : form.endDate || null };
      return license ? api.put(`/licenses/${license.id}`, payload) : api.post("/licenses", payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["licenses"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      toast.push("success", license ? "License updated" : "License granted", license?.clientName);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={license ? "Edit license" : "Grant license"} sub="Module C · product assignment & expiry tracking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {license ? "Save changes" : "Grant license"}
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
        <Field label="Product" required error={errors.productId?.message}>
          <Select error={!!errors.productId} {...register("productId")}>
            <option value="">Select product…</option>
            {(productsQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
          </Select>
        </Field>
        <Field label="Type" required>
          <Select {...register("type")}>
            {LICENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Seats" required error={errors.seats?.message}>
          <TextInput error={!!errors.seats} type="number" min={1} {...register("seats")} />
        </Field>
        <Field label="Start date" required error={errors.startDate?.message}>
          <TextInput error={!!errors.startDate} type="date" {...register("startDate")} />
        </Field>
        <Field label="End date" required={type !== "Perpetual"} hint={type === "Perpetual" ? "N/A for perpetual" : undefined} error={errors.endDate?.message}>
          <TextInput error={!!errors.endDate} type="date" disabled={type === "Perpetual"} className={type === "Perpetual" ? "opacity-50" : ""} {...register("endDate")} />
        </Field>
        <div className="col-span-2">
          <Field label="Monthly recurring value (USD)" hint="feeds MRR reporting" error={errors.monthlyValue?.message}>
            <TextInput error={!!errors.monthlyValue} type="number" min={0} step="10" {...register("monthlyValue")} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function LicensesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const manage = can(user?.role, "licenses.manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expiring, setExpiring] = useState(params.get("expiring") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [type, setType] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [formLicense, setFormLicense] = useState<LicenseRow | null>(null);
  const presetClientId = params.get("clientId") ?? undefined;

  useEffect(() => {
    if (params.get("new") === "1" || params.get("clientId") || params.get("expiring")) {
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setPage(1), [debouncedSearch, expiring, clientId, type]);

  const clientsQ = useClientsOptions();

  const licensesQ = useQuery({
    queryKey: ["licenses", page, debouncedSearch, expiring, clientId, type],
    queryFn: async () =>
      (await api.get<ListResponse<LicenseRow>>("/licenses", {
        params: {
          page, limit: LIMIT, clientId: clientId || undefined, type: type || undefined,
          expiringWithin: expiring || undefined, search: debouncedSearch || undefined,
        },
      })).data,
    placeholderData: (prev) => prev,
  });

  const rows = (licensesQ.data?.data ?? []).filter(
    (l) => !debouncedSearch || l.clientName.toLowerCase().includes(debouncedSearch.toLowerCase()) || l.productName.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );
  const total = licensesQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Products & Licenses"
        desc="Module C — catalog assignments with expiry radar. Red ≤ 30 days, amber ≤ 60, yellow ≤ 90."
        actions={manage && (
          <Button onClick={() => { setFormLicense(null); setFormOpen(true); }}>
            <IconPlus width={15} height={15} /> Grant license
          </Button>
        )}
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search client or product…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={expiring} onChange={(e) => setExpiring(e.target.value)} className="w-[170px]">
            <option value="">Any expiry</option>
            <option value="30">Expiring ≤ 30 days</option>
            <option value="60">Expiring ≤ 60 days</option>
            <option value="90">Expiring ≤ 90 days</option>
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[190px]">
            <option value="">All clients</option>
            {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-[150px]">
            <option value="">All types</option>
            {LICENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>

        {licensesQ.isError ? (
          <ErrorState message={apiErrorMsg(licensesQ.error)} onRetry={() => licensesQ.refetch()} />
        ) : licensesQ.isPending ? (
          <TableSkeleton cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title="No licenses found" hint="No assignments match the current filters."
            action={manage ? <Button size="sm" onClick={() => { setFormLicense(null); setFormOpen(true); }}><IconPlus width={14} height={14} /> Grant license</Button> : undefined} />
        ) : (
          <Table
            head={
              <>
                <Th>Client</Th><Th>Product</Th><Th>Type</Th><Th>Start</Th><Th>End</Th>
                <Th className="text-right">Seats</Th><Th>Expiry</Th>
                {manage && <Th className="text-right">Actions</Th>}
              </>
            }>
            {rows.map((l) => (
              <tr key={l.id} className="group transition-colors hover:bg-brand-50/40">
                <Td className="font-bold">{l.clientName}</Td>
                <Td>
                  <p className="font-medium">{l.productName}</p>
                  <p className="text-[12px] text-mute">{fmtMoney0(l.monthlyValue)}/mo recurring</p>
                </Td>
                <Td><Badge tone={licenseTone(l.type)}>{l.type}</Badge></Td>
                <Td className="text-mute">{fmtDate(l.startDate)}</Td>
                <Td className="text-mute">{l.endDate ? fmtDate(l.endDate) : "—"}</Td>
                <Td className="text-right"><span className="tnum font-mono font-semibold">{l.seats}</span></Td>
                <Td><ExpiryBadge days={l.daysToExpiry} /></Td>
                {manage && (
                  <Td className="text-right">
                    <Button variant="ghost" size="xs" className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" onClick={() => { setFormLicense(l); setFormOpen(true); }}>
                      <IconPencil width={13} height={13} /> Edit
                    </Button>
                  </Td>
                )}
              </tr>
            ))}
          </Table>
        )}

        {!licensesQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <LicenseFormModal open={formOpen} onClose={() => setFormOpen(false)} license={formLicense} presetClientId={presetClientId} />
    </div>
  );
}
