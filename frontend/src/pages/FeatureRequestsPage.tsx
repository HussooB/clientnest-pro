import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fmtMoney, useClientsOptions, useProductsQuery } from "../lib/utils";
import type { ListResponse } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState,
  Field, Modal, Pagination, Select, Table, Td, Textarea, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "../components/icons";

const LIMIT = 10;

interface FeatureRequest {
  id: string;
  clientId: string;
  productId?: string | null;
  title: string;
  description: string;
  category: "CustomDevelopment" | "OutOfScope" | "BugFix" | "Enhancement";
  status: "Requested" | "Approved" | "InProgress" | "Delivered" | "Rejected";
  estimatedCost?: number | null;
  roadmapItem?: string | null;
  createdAt: string;
  client?: { id: string; companyName: string };
  product?: { id: string; name: string } | null;
}

const frSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  productId: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description is required (min 10 chars)"),
  category: z.enum(["CustomDevelopment", "OutOfScope", "BugFix", "Enhancement"]),
  status: z.enum(["Requested", "Approved", "InProgress", "Delivered", "Rejected"]),
  estimatedCost: z.coerce.number().min(0).optional(),
  roadmapItem: z.string().optional(),
});
type FRForm = z.infer<typeof frSchema>;

function FRFormModal({ open, onClose, fr }: { open: boolean; onClose: () => void; fr: FeatureRequest | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const clientsQ = useClientsOptions();
  const productsQ = useProductsQuery();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FRForm>({
    resolver: zodResolver(frSchema),
  });

  useEffect(() => {
    if (!open) return;
    if (fr) {
      reset({
        clientId: fr.clientId,
        productId: fr.productId || "",
        title: fr.title,
        description: fr.description,
        category: fr.category,
        status: fr.status,
        estimatedCost: fr.estimatedCost || 0,
        roadmapItem: fr.roadmapItem || "",
      });
    } else {
      reset({
        clientId: "",
        productId: "",
        title: "",
        description: "",
        category: "Enhancement",
        status: "Requested",
        estimatedCost: 0,
        roadmapItem: "",
      });
    }
  }, [open, fr, reset]);

  const mutation = useMutation({
    mutationFn: (form: FRForm) => {
      const payload = { ...form, productId: form.productId || undefined };
      return fr ? api.put(`/feature-requests/${fr.id}`, payload) : api.post("/feature-requests", payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["feature-requests"] });
      toast.push("success", fr ? "Request updated" : "Request created");
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={fr ? "Edit Feature Request" : "New Feature Request"} sub="Module G — product roadmap & client requests" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>{fr ? "Save changes" : "Create request"}</Button>
    </>}>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Client" required error={errors.clientId?.message}>
          <Select error={!!errors.clientId} {...register("clientId")}>
            <option value="">Select client…</option>
            {(clientsQ.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </Select>
        </Field>
        <Field label="Related Product">
          <Select {...register("productId")}>
            <option value="">None / General</option>
            {(productsQ.data || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Title" required error={errors.title?.message}>
            <TextInput error={!!errors.title} placeholder="e.g. Add dark mode to dashboard" {...register("title")} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Description" required error={errors.description?.message}>
            <Textarea error={!!errors.description} placeholder="Detailed explanation of the request…" {...register("description")} />
          </Field>
        </div>
        <Field label="Category" required error={errors.category?.message}>
          <Select {...register("category")}>
            <option value="Enhancement">Enhancement</option>
            <option value="CustomDevelopment">Custom Development</option>
            <option value="OutOfScope">Out of Scope</option>
            <option value="BugFix">Bug Fix</option>
          </Select>
        </Field>
        <Field label="Status" required error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="InProgress">In Progress</option>
            <option value="Delivered">Delivered</option>
            <option value="Rejected">Rejected</option>
          </Select>
        </Field>
        <Field label="Estimated Cost (USD)" error={errors.estimatedCost?.message}>
          <TextInput error={!!errors.estimatedCost} type="number" min={0} step={100} {...register("estimatedCost")} />
        </Field>
        <Field label="Roadmap Item / Notes">
          <TextInput placeholder="e.g. Q3 2024 Release" {...register("roadmapItem")} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function FeatureRequestsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const manage = user?.role === "Admin" || user?.role === "Sales" || user?.role === "Support";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [frModal, setFrModal] = useState<{ open: boolean; fr: FeatureRequest | null }>({ open: false, fr: null });
  const [deleteTarget, setDeleteTarget] = useState<FeatureRequest | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setFrModal({ open: true, fr: null });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => setPage(1), [search, status, clientId]);

  const frsQ = useQuery({
    queryKey: ["feature-requests", page, search, status, clientId],
    queryFn: async () => {
      const res = await api.get<ListResponse<FeatureRequest>>("/feature-requests", {
        params: { page, limit: LIMIT, search: search || undefined, status: status || undefined, clientId: clientId || undefined },
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fr: FeatureRequest) => api.delete(`/feature-requests/${fr.id}`),
    onSuccess: () => {
      void frsQ.refetch();
      toast.push("success", "Request deleted");
      setDeleteTarget(null);
    },
    onError: (e) => toast.push("error", "Delete failed", apiErrorMsg(e)),
  });

  const rows = frsQ.data?.data ?? [];
  const total = frsQ.data?.total ?? 0;

  const statusTone = (s: string) => {
    if (s === "Delivered") return "green";
    if (s === "Approved" || s === "InProgress") return "blue";
    if (s === "Rejected") return "red";
    return "slate";
  };

  const categoryLabel = (c: string) => {
    if (c === "CustomDevelopment") return "Custom Dev";
    if (c === "OutOfScope") return "Out of Scope";
    if (c === "BugFix") return "Bug Fix";
    return "Enhancement";
  };

  return (
    <div>
      <PageHeader title="Feature Requests" desc="Module G — track client upgrade requests, custom development, and roadmap alignment."
        actions={manage && <Button onClick={() => setFrModal({ open: true, fr: null })}><IconPlus width={15} height={15} /> New request</Button>} />
      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <TextInput placeholder="Search title or description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[160px]">
            <option value="">All statuses</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="InProgress">In Progress</option>
            <option value="Delivered">Delivered</option>
            <option value="Rejected">Rejected</option>
          </Select>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-[200px]">
            <option value="">All clients</option>
          </Select>
        </div>

        {frsQ.isError ? (
          <ErrorState message={apiErrorMsg(frsQ.error)} onRetry={() => frsQ.refetch()} />
        ) : frsQ.isPending ? (
          <div className="p-6"><div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No feature requests found" hint="Create your first request to get started."
            action={manage ? <Button size="sm" onClick={() => setFrModal({ open: true, fr: null })}><IconPlus width={14} height={14} /> New request</Button> : undefined} />
        ) : (
          <Table minWidth="min-w-[900px]" head={<><Th>Request</Th><Th>Client</Th><Th>Category</Th><Th>Status</Th><Th className="text-right">Est. Cost</Th><Th className="text-right">Actions</Th></>}>
            {rows.map((fr) => (
              <tr key={fr.id} className="group transition-colors hover:bg-brand-50/40">
                <Td>
                  <p className="font-bold">{fr.title}</p>
                  <p className="text-[12px] text-mute truncate max-w-[300px]">{fr.description}</p>
                  {fr.roadmapItem && <p className="text-[11px] text-brand-700 mt-1">🗺️ {fr.roadmapItem}</p>}
                </Td>
                <Td className="font-medium">{fr.client?.companyName || "Unknown"}</Td>
                <Td><Badge tone="slate">{categoryLabel(fr.category)}</Badge></Td>
                <Td><Badge tone={statusTone(fr.status)} dot>{fr.status}</Badge></Td>
                <Td className="text-right tnum font-mono">{fr.estimatedCost ? fmtMoney(fr.estimatedCost) : "—"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {manage && (
                      <>
                        <Button variant="ghost" size="xs" onClick={() => setFrModal({ open: true, fr })}><IconPencil width={13} height={13} /></Button>
                        <Button variant="ghost" size="xs" className="hover:text-rose-700" onClick={() => setDeleteTarget(fr)}><IconTrash width={13} height={13} /></Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {!frsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <FRFormModal open={frModal.open} onClose={() => setFrModal({ open: false, fr: null })} fr={frModal.fr} />
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete request?" confirmLabel="Delete" tone="danger" loading={deleteMutation.isPending} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        body={<><strong>{deleteTarget?.title}</strong> will be permanently removed.</>} />
    </div>
  );
}