import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "./api";
import type {
  Client, InvoiceRow, LicenseRow, ListResponse, Product, Role, Ticket, TicketPriority, User,
} from "../types";

// ── Formatting ──────────────────────────────────────────────────────────
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const money0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtMoney = (n: number) => money.format(n);
export const fmtMoney0 = (n: number) => money0.format(n);
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : fmtDate(iso);
};
export const daysUntil = (iso: string | null) =>
  iso === null ? null : Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
export const daysOverdue = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmtMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// ── RBAC matrix (SRS permission matrix) ─────────────────────────────────
export type Perm =
  | "leads.manage" | "leads.convert" | "leads.lost"
  | "clients.manage" | "clients.delete"
  | "licenses.manage"
  | "invoices.manage" | "invoices.delete"
  | "tickets.manage"
  | "users.manage" | "audit.view";

const MATRIX: Record<Role, Perm[]> = {
  Admin: [
    "leads.manage", "leads.convert", "leads.lost",
    "clients.manage", "clients.delete",
    "licenses.manage",
    "invoices.manage", "invoices.delete",
    "tickets.manage",
    "users.manage", "audit.view",
  ],
  Sales: ["leads.manage", "leads.convert", "leads.lost", "clients.manage"],
  Finance: ["clients.manage", "licenses.manage", "invoices.manage"],
  Support: ["tickets.manage"],
};

export const can = (role: Role | undefined, perm: Perm) =>
  !!role && MATRIX[role]?.includes(perm);

export const pageRoles: Record<string, Role[]> = {
  "/leads": ["Admin", "Sales"],
  "/users": ["Admin"],
  "/audit-logs": ["Admin"],
};

// ── Client health score (SRS Module B) ──────────────────────────────────
export type Health = "green" | "amber" | "red";

export function clientHealth(
  client: Client,
  invoices: InvoiceRow[],
  tickets: Ticket[],
  licenses: LicenseRow[],
): { score: Health; reasons: string[] } {
  const reasons: string[] = [];
  let score: Health = "green";
  const bump = (to: Health, reason: string) => {
    reasons.push(reason);
    if (to === "red" || (to === "amber" && score === "green")) score = to;
  };

  const overdueInv = invoices.filter((i) => i.status === "Overdue");
  const overdueSum = overdueInv.reduce((s, i) => s + i.balance, 0);
  const oldestOverdue = overdueInv.reduce((m, i) => Math.max(m, daysOverdue(i.dueDate)), 0);
  if (oldestOverdue > 30 || overdueSum > 5000) bump("red", `Overdue invoices ${fmtMoney0(overdueSum)} (${oldestOverdue}d oldest)`);
  else if (overdueInv.length > 0) bump("amber", `${overdueInv.length} overdue invoice${overdueInv.length > 1 ? "s" : ""} — ${fmtMoney0(overdueSum)}`);

  const openCrit = tickets.filter((t) => t.priority === "Critical" && (t.status === "Open" || t.status === "In Progress"));
  const openHigh = tickets.filter((t) => t.priority === "High" && (t.status === "Open" || t.status === "In Progress"));
  if (openCrit.length > 0) bump("red", `${openCrit.length} critical ticket${openCrit.length > 1 ? "s" : ""} open`);
  else if (openHigh.length > 0) bump("amber", `${openHigh.length} high-priority ticket${openHigh.length > 1 ? "s" : ""} open`);

  const expSoon = licenses.filter((l) => l.daysToExpiry !== null && l.daysToExpiry <= 30);
  const expMid = licenses.filter((l) => l.daysToExpiry !== null && l.daysToExpiry > 30 && l.daysToExpiry <= 60);
  if (expSoon.length > 0) bump("amber", `${expSoon.length} license${expSoon.length > 1 ? "s" : ""} expiring within 30 days`);
  else if (expMid.length > 0) bump("amber", `${expMid.length} license${expMid.length > 1 ? "s" : ""} expiring within 60 days`);

  if (client.status === "Churned") return { score: "red", reasons: ["Client is churned"] };
  if (client.status === "OnHold") bump("amber", "Account on hold");
  if (reasons.length === 0) reasons.push("No risk signals — payments current, no critical tickets");
  return { score, reasons };
}

// ── SLA policy (SRS F.5) ────────────────────────────────────────────────
export const SLA: Record<TicketPriority, { first: number; resolve: number }> = {
  Critical: { first: 2, resolve: 8 },
  High: { first: 4, resolve: 24 },
  Medium: { first: 8, resolve: 72 },
  Low: { first: 24, resolve: 120 },
};

export function slaState(t: Ticket): { label: string; tone: "green" | "amber" | "red" | "slate"; detail: string } {
  const policy = SLA[t.priority];
  const created = new Date(t.createdAt).getTime();
  const now = Date.now();
  const done = t.status === "Resolved" || t.status === "Closed";

  const firstDue = created + policy.first * 3_600_000;
  const resolveDue = created + policy.resolve * 3_600_000;

  if (done) {
    const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt).getTime() : now;
    const met = resolvedAt <= resolveDue;
    return met
      ? { label: "SLA met", tone: "green", detail: `Resolved within the ${policy.resolve}h resolution window` }
      : { label: "SLA missed", tone: "red", detail: `Resolution exceeded the ${policy.resolve}h window` };
  }
  if (!t.firstResponseAt && now > firstDue)
    return { label: "First response breached", tone: "red", detail: `No response within ${policy.first}h (SRS F.5)` };
  if (now > resolveDue)
    return { label: "Resolution breached", tone: "red", detail: `Past the ${policy.resolve}h resolution target` };
  const remaining = resolveDue - now;
  const window = resolveDue - created;
  if (!t.firstResponseAt && firstDue - now < policy.first * 3_600_000 * 0.25)
    return { label: "Response due soon", tone: "amber", detail: `First response target in <${Math.max(1, Math.round((firstDue - now) / 60000))}m` };
  if (remaining < window * 0.25)
    return { label: "SLA at risk", tone: "amber", detail: `${Math.round(remaining / 3_600_000)}h left of ${policy.resolve}h resolution window` };
  return { label: "Within SLA", tone: "green", detail: `${policy.first}h first response · ${policy.resolve}h resolution` };
}

// ── MRR (SRS Module H) ──────────────────────────────────────────────────
export const cycleToMonthly = (amount: number, cycle: "Monthly" | "Quarterly" | "Annual") =>
  cycle === "Monthly" ? amount : cycle === "Quarterly" ? amount / 3 : amount / 12;

// ── Hooks ───────────────────────────────────────────────────────────────
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useUsersQuery(enabled = true) {
  return useQuery({
    queryKey: ["users-all"],
    queryFn: async () => (await api.get<ListResponse<User>>("/users", { params: { page: 1, limit: 100 } })).data.data,
    enabled,
    staleTime: 60_000,
  });
}

export function useClientsOptions() {
  return useQuery({
    queryKey: ["clients-options"],
    queryFn: async () => (await api.get<ListResponse<Client>>("/clients", { params: { page: 1, limit: 100 } })).data.data,
    staleTime: 60_000,
  });
}

export function useProductsQuery() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get<Product[]>("/products")).data,
    staleTime: 5 * 60_000,
  });
}

// ── Downloads ───────────────────────────────────────────────────────────
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
