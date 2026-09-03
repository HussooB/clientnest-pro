import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { downloadCSV, fmtDateTime, useUsersQuery } from "../lib/utils";
import type { AuditLog, ListResponse } from "../types";
import { ENTITY_TYPES } from "../types";
import {
  apiErrorMsg, Badge, Button, Card, EmptyState, ErrorState, Pagination, Select, Table,
  TableSkeleton, Td, TextInput, Th, useToast,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { IconChevronDown, IconChevronRight, IconDownload } from "../components/icons";

const LIMIT = 10;

const actionTone = (action: string) => {
  if (action.includes("delete")) return "red" as const;
  if (action.includes("create")) return "green" as const;
  if (action.includes("update") || action.includes("status")) return "amber" as const;
  if (action.includes("login")) return "blue" as const;
  return "slate" as const;
};

function DiffBlock({ label, data, tone }: { label: string; data: unknown; tone: "red" | "green" }) {
  return (
    <div className="min-w-0 flex-1">
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.1em] ${tone === "red" ? "text-rose-700" : "text-emerald-700"}`}>{label}</p>
      <pre className={`overflow-x-auto rounded-lg border px-3 py-2.5 font-mono text-[12px] leading-relaxed ${
        tone === "red" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"
      }`}>
        {data === null || data === undefined ? "null" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogsPage() {
  const toast = useToast();
  const usersQ = useUsersQuery();

  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => setPage(1), [userId, entityType, from, to]);

  const params = {
    page, limit: LIMIT, userId: userId || undefined, entityType: entityType || undefined,
    from: from || undefined, to: to || undefined,
  };

  const logsQ = useQuery({
    queryKey: ["audit-logs", page, userId, entityType, from, to],
    queryFn: async () => (await api.get<ListResponse<AuditLog>>("/audit-logs", { params })).data,
    placeholderData: (prev) => prev,
  });

  const exportMutation = useMutation({
    mutationFn: async () =>
      (await api.get<ListResponse<AuditLog>>("/audit-logs", {
        params: { page: 1, limit: 200, userId: userId || undefined, entityType: entityType || undefined, from: from || undefined, to: to || undefined },
      })).data.data,
    onSuccess: (rows) => {
      downloadCSV(
        `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`,
        rows.map((r) => ({
          timestamp: r.timestamp, user: r.userName, action: r.action, entityType: r.entityType,
          entityId: r.entityId, before: r.before, after: r.after,
        })),
      );
      toast.push("success", "Audit trail exported", `${rows.length} rows → CSV`);
    },
    onError: (e) => toast.push("error", "Export failed", apiErrorMsg(e)),
  });

  const rows = logsQ.data?.data ?? [];
  const total = logsQ.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        desc="Module I — immutable, append-only log. Financial mutations (invoices, payments, credit notes) always carry before/after snapshots."
        actions={
          <Button variant="outline" loading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            <IconDownload width={14} height={14} /> Export CSV
          </Button>
        }
      />

      <Card pad={false} className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line/70 px-4 py-3">
          <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-[180px]">
            <option value="">All users</option>
            {(usersQ.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-[170px]">
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[145px]" aria-label="From date" />
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[145px]" aria-label="To date" />
          <span className="ml-auto rounded-full bg-petrol-900 px-3 py-1 font-mono text-[11px] font-bold text-gold-300">READ-ONLY</span>
        </div>

        {logsQ.isError ? (
          <ErrorState message={apiErrorMsg(logsQ.error)} onRetry={() => logsQ.refetch()} />
        ) : logsQ.isPending ? (
          <TableSkeleton cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="No audit entries" hint="No log entries match the current filters." />
        ) : (
          <Table minWidth="min-w-[860px]"
            head={<><Th className="w-8" /><Th>Timestamp</Th><Th>User</Th><Th>Action</Th><Th>Entity</Th><Th>Entity ID</Th></>}>
            {rows.map((log) => (
              <AuditRow key={log.id} log={log} expanded={expanded === log.id} onToggle={() => setExpanded(expanded === log.id ? null : log.id)} />
            ))}
          </Table>
        )}

        {!logsQ.isPending && total > 0 && <Pagination page={page} total={total} limit={LIMIT} onPage={setPage} />}
      </Card>
    </div>
  );
}

function AuditRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className={`cursor-pointer transition-colors hover:bg-brand-50/40 ${expanded ? "bg-brand-50/60" : ""}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Td className="text-mute">
          {expanded ? <IconChevronDown width={14} height={14} /> : <IconChevronRight width={14} height={14} />}
        </Td>
        <Td className="whitespace-nowrap font-mono text-[12.5px] font-semibold">{fmtDateTime(log.timestamp)}</Td>
        <Td className="font-semibold">{log.userName}</Td>
        <Td><Badge tone={actionTone(log.action)}>{log.action}</Badge></Td>
        <Td className="font-medium">{log.entityType}</Td>
        <Td className="font-mono text-[12px] text-mute">{log.entityId}</Td>
      </tr>
      {expanded && (
        <tr className="bg-paper/70">
          <td colSpan={6} className="px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row animate-fade-in">
              <DiffBlock label="Before" data={log.before} tone="red" />
              <DiffBlock label="After" data={log.after} tone="green" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
