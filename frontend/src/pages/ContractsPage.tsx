import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtDate, fmtMoney, useClientsOptions } from "../lib/utils";
import type { ListResponse } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, Checkbox, ConfirmModal, EmptyState, ErrorState,
  Field, Modal, Pagination, Select, Table, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconDownload, IconPencil, IconPlus, IconSearch, IconTrash, IconUpload } from "../components/icons";

const LIMIT = 10;

interface Contract {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  renewalPeriod?: string;
  value?: number;
  status: "Draft" | "Active" | "Expired" | "Terminated";
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  daysToExpiry?: number | null;
  client?: {
    id: string;
    companyName: string;
  };
}

const contractSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  title: z.string().min(3, "Title is required (min 3 characters)"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  autoRenewal: z.boolean(),
  renewalPeriod: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
});
type ContractForm = z.infer<typeof contractSchema>;

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <Badge tone="slate">No end date</Badge>;
  if (days < 0) return <Badge tone="red" dot>Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 30) return <Badge tone="red" dot>{days}d left</Badge>;
  if (days <= 60) return <Badge tone="amber" dot>{days}d left</Badge>;
  if (days <= 90) return <Badge tone="yellow" dot>{days}d left</Badge>;
  return <Badge tone="green">{days}d left</Badge>;
}

function ContractFormModal({ open, onClose, contract }: { open: boolean; onClose: () => void; contract: Contract | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const clientsQ = useClientsOptions();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
  });
  const autoRenewal = watch("autoRenewal");

  useEffect(() => {
    if (!open) return;
    if (contract) {
      reset({
        clientId: contract.clientId,
        title: contract.title,
        description: contract.description || "",
        startDate: contract.startDate.slice(0, 10),
        endDate: contract.endDate.slice(0, 10),
        autoRenewal: contract.autoRenewal,
        renewalPeriod: contract.renewalPeriod || "",
        value: contract.value || 0,
      });
    } else {
      reset({
        clientId: "",
        title: "",
        description: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        autoRenewal: false,
        renewalPeriod: "",
        value: 0,
      });
    }
  }, [open, contract, reset]);

  const mutation = useMutation({
    mutationFn: (form: ContractForm) => {
      return contract
        ? api.put(`/contracts/${contract.id}`, form)
        : api.post("/contracts", form);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.push("success", contract ? "Contract updated" : "Contract created");
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract ? "Edit Contract" : "New Contract"}
      sub="Module E — contract management & renewal tracking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {contract ? "Save changes" : "Create contract"}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Client" required error={errors.clientId?.message}>
          <Select error={!!errors.clientId} {...register("clientId")}>
            <option value="">Select client…</option>
            {(clientsQ.data || []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </Select>
        </Field>
        <Field label="Title" required error={errors.title?.message}>
          <TextInput error={!!errors.title} placeholder="e.g. Master Service Agreement" {...register("title")} />
        </Field>
        <div className="col-span-2">
          <Field label="Description">
            <TextInput placeholder="Contract details, terms, conditions…" {...register("description")} />
          </Field>
        </div>
        <Field label="Start Date" required error={errors.startDate?.message}>
          <TextInput error={!!errors.startDate} type="date" {...register("startDate")} />
        </Field>
        <Field label="End Date" required error={errors.endDate?.message}>
          <TextInput error={!!errors.endDate} type="date" {...register("endDate")} />
        </Field>
        <Field label="Contract Value (USD)" error={errors.value?.message}>
          <TextInput error={!!errors.value} type="number" min={0} step={100} {...register("value")} />
        </Field>
        <div className="col-span-2">
          <Checkbox
            label="Auto-renewal enabled"
            checked={!!autoRenewal}
            onChange={(v) => setValue("autoRenewal", v)}
          />
          <input type="hidden" {...register("autoRenewal")} />
        </div>
        {autoRenewal && (
          <Field label="Renewal Period">
            <Select {...register("renewalPeriod")}>
              <option value="">Select period…</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </Select>
          </Field>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function ContractsPage() {
  const { user } = useAuth();
  const toast = useToast(); // ✅ FIX: Moved to top to satisfy React Hooks rules
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  
  // ✅ FIX: Replaced can() with direct role check to avoid "Perm" type error
  const manage = user?.role === "Admin" || user?.role === "Sales" || user?.role === "Finance";
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [contractModal, setContractModal] = useState<{ open: boolean; contract: Contract | null }>({ open: false, contract: null });
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setContractModal({ open: true, contract: null });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => setPage(1), [search, status, clientId]);

  const contractsQ = useQuery({
    queryKey: ["contracts", page, search, status, clientId],
    queryFn: async () => {
      const res = await api.get<ListResponse<Contract>>("/contracts", {
        params: {
          page,
          limit: LIMIT,
          search: search || undefined,
          status: status || undefined,
          clientId: clientId || undefined,
        },
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (c: Contract) => api.delete(`/contracts/${c.id}`),
    onSuccess: () => {
      void contractsQ.refetch();
      toast.push("success", "Contract deleted");
      setDeleteTarget(null);
    },
    onError: (e) => toast.push("error", "Delete failed", apiErrorMsg(e)),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/contracts/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      void contractsQ.refetch();
      toast.push("success", "File uploaded successfully");
    },
    onError: (e) => toast.push("error", "Upload failed", apiErrorMsg(e)),
  });

  const rows = contractsQ.data?.data ?? [];
  const total = contractsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Contracts & SOWs"
        desc="Module E — contract management with auto-renewal tracking and document storage."
        actions={
          manage && (
            <Button onClick={() => setContractModal({ open: true, contract: null })}>
              <IconPlus width={15} height={15} /> New contract
            </Button>
          )
        }
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput
              placeholder="Search contracts…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[160px]">
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Terminated">Terminated</option>
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[200px]">
            <option value="">All clients</option>
          </Select>
        </div>

        {contractsQ.isError ? (
          <ErrorState message={apiErrorMsg(contractsQ.error)} onRetry={() => contractsQ.refetch()} />
        ) : contractsQ.isPending ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No contracts found"
            hint="Create your first contract to get started."
            action={
              manage ? (
                <Button size="sm" onClick={() => setContractModal({ open: true, contract: null })}>
                  <IconPlus width={14} height={14} /> New contract
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            minWidth="min-w-[900px]"
            head={
              <>
                <Th>Contract</Th>
                <Th>Client</Th>
                <Th>Period</Th>
                <Th>Value</Th>
                <Th>Auto-Renewal</Th>
                <Th>Expiry</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {rows.map((c) => (
              <tr key={c.id} className="group transition-colors hover:bg-brand-50/40">
                <Td>
                  <p className="font-bold">{c.title}</p>
                  {c.fileName && (
                    <a
                      href={c.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand-700 hover:underline"
                    >
                      <IconDownload width={12} height={12} className="inline mr-1" />
                      {c.fileName}
                    </a>
                  )}
                </Td>
                <Td className="font-medium">{c.client?.companyName || "Unknown"}</Td>
                <Td className="text-mute">
                  {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                </Td>
                <Td className="tnum font-mono">{c.value ? fmtMoney(c.value) : "—"}</Td>
                <Td>
                  {c.autoRenewal ? (
                    <Badge tone="teal" dot>{c.renewalPeriod || "Yes"}</Badge>
                  ) : (
                    <Badge tone="slate">No</Badge>
                  )}
                </Td>
                <Td>
                  <ExpiryBadge days={c.daysToExpiry ?? null} />
                </Td>
                <Td>
                  <Badge tone={c.status === "Active" ? "green" : c.status === "Expired" ? "red" : "slate"}>
                    {c.status}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {manage && (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setContractModal({ open: true, contract: c })}
                        >
                          <IconPencil width={13} height={13} />
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadMutation.mutate({ id: c.id, file });
                              e.target.value = "";
                            }
                          }}
                          accept=".pdf,.doc,.docx"
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload contract"
                        >
                          <IconUpload width={13} height={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="hover:text-rose-700"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <IconTrash width={13} height={13} />
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!contractsQ.isPending && total > 0 && (
          <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />
        )}
      </Card>

      <ContractFormModal
        open={contractModal.open}
        onClose={() => setContractModal({ open: false, contract: null })}
        contract={contractModal.contract}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete contract?"
        confirmLabel="Delete contract"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        body={
          <>
            <strong>{deleteTarget?.title}</strong> will be soft-deleted. This action can be reversed by an admin.
          </>
        }
      />
    </div>
  );
}