import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import { fmtDate, initials } from "../lib/utils";
import type { ListResponse, User } from "../types";
import { ROLES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, Checkbox, ConfirmModal, EmptyState, ErrorState, Field, Modal,
  Pagination, roleTone, Select, Table, TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconPencil, IconPlus, IconRefresh } from "../components/icons";

const LIMIT = 10;

const createSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  role: z.enum(["Admin", "Finance", "Support", "Sales"]),
  isActive: z.boolean(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["Admin", "Finance", "Support", "Sales"]),
  isActive: z.boolean(),
  password: z.string().optional().or(z.literal("")),
}).refine((v) => !v.password || v.password.length >= 6, { message: "Minimum 6 characters", path: ["password"] });
type EditForm = z.infer<typeof editSchema>;

function UserFormModal({ open, onClose, target }: { open: boolean; onClose: () => void; target: User | null }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateForm & EditForm>({
    resolver: zodResolver((target ? editSchema : createSchema) as z.ZodTypeAny),
  });
  const active = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset(target
      ? { name: target.name, email: target.email, password: "", role: target.role, isActive: target.isActive }
      : { name: "", email: "", password: "", role: "Support", isActive: true });
  }, [open, target, reset]);

  const mutation = useMutation({
    mutationFn: (form: CreateForm & EditForm) => {
      const payload = target
        ? { name: form.name, email: form.email, role: form.role, isActive: form.isActive, password: form.password || undefined }
        : form;
      return target ? api.put(`/users/${target.id}`, payload) : api.post("/users", payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["users-all"] });
      toast.push("success", target ? "User updated" : "User created", target?.name);
      onClose();
    },
    onError: (e) => toast.push("error", "Save failed", apiErrorMsg(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={target ? `Edit — ${target.name}` : "New user"} sub="Module I · role-based access control"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((f) => mutation.mutate(f))}>
            {target ? "Save changes" : "Create user"}
          </Button>
        </>
      }>
      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((f) => mutation.mutate(f))}>
        <Field label="Full name" required error={errors.name?.message}>
          <TextInput error={!!errors.name} placeholder="Jane Doe" {...register("name")} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <TextInput error={!!errors.email} type="email" placeholder="jane@company.com" {...register("email")} />
        </Field>
        <Field label="Role" required error={errors.role?.message}>
          <Select {...register("role")}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label={target ? "Reset password" : "Password"} required={!target} hint={target ? "leave blank to keep current" : undefined} error={errors.password?.message}>
          <TextInput error={!!errors.password} type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
        </Field>
        <div className="col-span-2">
          <Checkbox label="Account active (can sign in)" checked={!!active} onChange={(v) => setValue("isActive", v)} />
          <input type="hidden" {...register("isActive")} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const usersQ = useQuery({
    queryKey: ["users", page],
    queryFn: async () => (await api.get<ListResponse<User>>("/users", { params: { page, limit: LIMIT } })).data,
    placeholderData: (prev) => prev,
  });

  const toggleMutation = useMutation({
    mutationFn: (u: User) => api.put(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: (_res, u) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["users-all"] });
      toast.push("success", u.isActive ? "User deactivated" : "User activated", u.name);
      setToggleTarget(null);
    },
    onError: (e) => toast.push("error", "Update failed", apiErrorMsg(e)),
  });

  const rows = usersQ.data?.data ?? [];
  const total = usersQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="User Management"
        desc="Module I — provision accounts, assign roles (Admin · Finance · Support · Sales) and control activation."
        actions={
          <Button onClick={() => { setFormTarget(null); setFormOpen(true); }}>
            <IconPlus width={15} height={15} /> New user
          </Button>
        }
      />

      <Card pad={false} className="animate-fade-up">
        {usersQ.isError ? (
          <ErrorState message={apiErrorMsg(usersQ.error)} onRetry={() => usersQ.refetch()} />
        ) : usersQ.isPending ? (
          <TableSkeleton cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="No users" hint="Create the first account to get started." />
        ) : (
          <Table minWidth="min-w-[760px]"
            head={<><Th>User</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Created</Th><Th className="text-right">Actions</Th></>}>
            {rows.map((u) => (
              <tr key={u.id} className="group transition-colors hover:bg-brand-50/40">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[12px] font-bold ${u.isActive ? "bg-brand-700 text-brand-50" : "bg-slate-300 text-slate-700"}`}>
                      {initials(u.name)}
                    </span>
                    <span className="font-bold">{u.name}</span>
                  </div>
                </Td>
                <Td className="font-mono text-[12.5px] text-mute">{u.email}</Td>
                <Td><Badge tone={roleTone(u.role)}>{u.role}</Badge></Td>
                <Td>
                  {u.isActive
                    ? <Badge tone="green" dot>Active</Badge>
                    : <Badge tone="slate">Inactive</Badge>}
                </Td>
                <Td className="text-mute">{fmtDate(u.createdAt)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="ghost" size="xs" onClick={() => { setFormTarget(u); setFormOpen(true); }}>
                      <IconPencil width={13} height={13} /> Edit
                    </Button>
                    <Button variant={u.isActive ? "ghost" : "subtle"} size="xs" className={u.isActive ? "hover:text-rose-700" : ""} onClick={() => setToggleTarget(u)}>
                      <IconRefresh width={13} height={13} /> {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!usersQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} target={formTarget} />
      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Deactivate user?" : "Activate user?"}
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        tone={toggleTarget?.isActive ? "danger" : "primary"}
        loading={toggleMutation.isPending}
        onConfirm={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
        body={toggleTarget?.isActive
          ? <><strong>{toggleTarget?.name}</strong> will immediately lose access. Their historical actions remain in the audit trail.</>
          : <><strong>{toggleTarget?.name}</strong> will regain access with the <strong>{toggleTarget?.role}</strong> role.</>}
      />
    </div>
  );
}
