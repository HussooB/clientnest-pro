import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TdHTMLAttributes, TextareaHTMLAttributes } from "react";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconRefresh, IconSpinner, IconX } from "./icons";

// ── Buttons ─────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "subtle" | "gold";

const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-brand-700 text-brand-50 hover:bg-brand-800 active:bg-brand-900 shadow-sm shadow-brand-900/20",
  gold: "bg-gold-400 text-petrol-950 hover:bg-gold-500 active:bg-gold-500 shadow-sm shadow-gold-500/30",
  outline: "border border-line bg-card text-ink hover:border-brand-400 hover:text-brand-800 active:bg-brand-50",
  ghost: "text-mute hover:text-ink hover:bg-ink/5 active:bg-ink/10",
  subtle: "bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200",
  danger: "bg-rose-700 text-rose-50 hover:bg-rose-800 active:bg-rose-900 shadow-sm shadow-rose-900/20",
};

export function Button({
  variant = "primary", size = "md", loading, className = "", children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "md" | "sm" | "xs"; loading?: boolean }) {
  const sizes = { md: "h-9 px-4 text-sm gap-2", sm: "h-8 px-3 text-[13px] gap-1.5", xs: "h-7 px-2.5 text-xs gap-1.5" };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap ${sizes[size]} ${btnStyles[variant]} ${className}`}
    >
      {loading && <IconSpinner width={14} height={14} />}
      {children}
    </button>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────
export type Tone = "slate" | "blue" | "amber" | "orange" | "green" | "red" | "teal" | "yellow" | "gold";

const tones: Record<Tone, string> = {
  slate: "bg-slate-500/10 text-slate-700 ring-slate-500/25",
  blue: "bg-sky-600/10 text-sky-800 ring-sky-600/25",
  amber: "bg-amber-500/12 text-amber-800 ring-amber-600/30",
  yellow: "bg-yellow-400/15 text-yellow-800 ring-yellow-500/35",
  orange: "bg-orange-500/12 text-orange-800 ring-orange-600/30",
  green: "bg-emerald-600/10 text-emerald-800 ring-emerald-600/25",
  red: "bg-rose-600/10 text-rose-800 ring-rose-600/25",
  teal: "bg-brand-600/10 text-brand-800 ring-brand-600/25",
  gold: "bg-gold-400/15 text-amber-900 ring-gold-500/40",
};
const dotTones: Record<Tone, string> = {
  slate: "bg-slate-500", blue: "bg-sky-600", amber: "bg-amber-500", yellow: "bg-yellow-500",
  orange: "bg-orange-500", green: "bg-emerald-600", red: "bg-rose-600", teal: "bg-brand-600", gold: "bg-gold-500",
};

export function Badge({ tone = "slate", dot, children, className = "" }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />}
      {children}
    </span>
  );
}

// Stage / status tone maps (SRS colour coding)
export const stageTone = (s: string): Tone =>
  ({ New: "slate", Contacted: "blue", Proposal: "yellow", Negotiation: "orange", Won: "green", Lost: "red" } as Record<string, Tone>)[s] ?? "slate";
export const invoiceTone = (s: string): Tone =>
  ({ Draft: "slate", Sent: "blue", PartiallyPaid: "yellow", Paid: "green", Overdue: "red" } as Record<string, Tone>)[s] ?? "slate";
export const clientTone = (s: string): Tone =>
  ({ Prospect: "slate", Active: "green", OnHold: "amber", Churned: "red" } as Record<string, Tone>)[s] ?? "slate";
export const priorityTone = (s: string): Tone =>
  ({ Low: "slate", Medium: "blue", High: "orange", Critical: "red" } as Record<string, Tone>)[s] ?? "slate";
export const ticketTone = (s: string): Tone =>
  ({ Open: "blue", "In Progress": "amber", Resolved: "green", Closed: "slate" } as Record<string, Tone>)[s] ?? "slate";
export const licenseTone = (s: string): Tone =>
  ({ Perpetual: "slate", Subscription: "teal", Leased: "gold" } as Record<string, Tone>)[s] ?? "slate";
export const roleTone = (s: string): Tone =>
  ({ Admin: "gold", Finance: "teal", Support: "blue", Sales: "orange" } as Record<string, Tone>)[s] ?? "slate";
export const healthTone: Record<string, Tone> = { green: "green", amber: "amber", red: "red" };

// ── Cards ───────────────────────────────────────────────────────────────
export function Card({ title, sub, actions, children, className = "", pad = true }: {
  title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(18,42,48,0.05)] ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-tight">{title}</h3>
            {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

// ── Form primitives ─────────────────────────────────────────────────────
export function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold text-ink">
        <span>
          {label} {required && <span className="text-rose-600">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-mute">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-700">
          <IconAlert width={12} height={12} /> {error}
        </span>
      )}
    </label>
  );
}

export const inputCls = (error?: boolean) =>
  `w-full h-9 rounded-lg border bg-card px-3 text-sm text-ink placeholder:text-mute/60 transition-colors focus:outline-none focus:ring-2 ${
    error ? "border-rose-400 focus:ring-rose-200" : "border-line focus:border-brand-500 focus:ring-brand-100"
  }`;

export function TextInput({ error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...rest} className={`${inputCls(error)} ${className}`} />;
}
export function Select({ error, className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select {...rest} className={`${inputCls(error)} appearance-none bg-no-repeat pr-8 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235d7378' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9.5 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 10px center" }}>
      {children}
    </select>
  );
}
export function Textarea({ error, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea {...rest} className={`${inputCls(error)} h-auto min-h-[84px] py-2 ${className}`} />;
}
export function Checkbox({ label, checked, onChange, error }: { label: string; checked: boolean; onChange: (v: boolean) => void; error?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 h-9 text-sm font-medium transition-colors ${error ? "border-rose-400" : "border-line"} ${checked ? "bg-brand-50 border-brand-300 text-brand-900" : "bg-card text-ink hover:border-brand-300"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded border transition-colors ${checked ? "border-brand-700 bg-brand-700 text-brand-50" : "border-line bg-card"}`}>
        {checked && <IconCheck width={11} height={11} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, sub, children, footer, width = "max-w-lg" }: {
  open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-petrol-950/55 p-4 pt-[8vh] backdrop-blur-[2px] animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true"
        className={`w-full ${width} rounded-xl border border-line bg-card shadow-2xl shadow-petrol-950/30 animate-pop`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
            {sub && <p className="mt-0.5 text-[13px] text-mute">{sub}</p>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-mute transition-colors hover:bg-ink/5 hover:text-ink">
            <IconX width={16} height={16} />
          </button>
        </header>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line/70 bg-paper/60 px-5 py-3.5 rounded-b-xl">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", tone = "danger", loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; tone?: "danger" | "primary"; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }>
      <div className="flex gap-3">
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone === "danger" ? "bg-rose-600/10 text-rose-700" : "bg-brand-600/10 text-brand-700"}`}>
          <IconAlert width={18} height={18} />
        </span>
        <div className="text-sm leading-relaxed text-ink/85">{body}</div>
      </div>
    </Modal>
  );
}

// ── Table ───────────────────────────────────────────────────────────────
export function Table({ head, children, minWidth = "min-w-[860px]" }: { head: ReactNode; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${minWidth}`}>
        <thead>
          <tr className="border-b border-line bg-paper/70 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-mute">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
    </div>
  );
}
export const Th = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <th className={`px-4 py-2.5 font-bold ${className}`}>{children}</th>
);
export const Td = ({ children, className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...rest} className={`px-4 py-3 align-middle ${className}`}>{children}</td>
);

export function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <div className="px-4 py-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line/50 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton h-3.5" style={{ width: `${[22, 14, 10, 12, 9, 11, 8][c % 7]}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────
export function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/70 px-4 py-3 text-[13px] text-mute">
      <span className="tnum">
        Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{total}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <IconChevronLeft width={13} height={13} /> Prev
        </Button>
        <span className="tnum px-2 font-semibold text-ink">
          {page} / {pages}
        </span>
        <Button variant="outline" size="xs" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          Next <IconChevronRight width={13} height={13} />
        </Button>
      </div>
    </div>
  );
}

// ── Empty / error states ────────────────────────────────────────────────
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-line">
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" strokeLinejoin="round" />
        <path d="m4 8.5 8 4.5 8-4.5M12 13v7" strokeLinejoin="round" />
      </svg>
      <p className="font-display text-[15px] font-bold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-mute">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600/10 text-rose-700">
        <IconAlert width={22} height={22} />
      </span>
      <div>
        <p className="font-display text-[15px] font-bold">Something went wrong</p>
        <p className="mt-1 max-w-md text-[13px] text-mute">{message ?? "The request could not be completed."}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <IconRefresh width={14} height={14} /> Try again
        </Button>
      )}
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────
const barTones: Record<Tone, string> = {
  slate: "bg-slate-500", blue: "bg-sky-600", amber: "bg-amber-500", yellow: "bg-yellow-500",
  orange: "bg-orange-500", green: "bg-emerald-600", red: "bg-rose-600", teal: "bg-brand-600", gold: "bg-gold-400",
};
export function Bar({ pct, tone = "teal", className = "" }: { pct: number; tone?: Tone; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink/8 ${className}`}>
      <div className={`h-full origin-left rounded-full transition-all duration-500 animate-grow-x ${barTones[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ── Toasts ──────────────────────────────────────────────────────────────
interface Toast { id: number; kind: "success" | "error" | "info"; title: string; msg?: string }
interface ToastCtx { push: (kind: Toast["kind"], title: string, msg?: string) => void }

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const push = useCallback((kind: Toast["kind"], title: string, msg?: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, title, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[340px] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-petrol-900 px-4 py-3 text-sm text-paper shadow-xl shadow-petrol-950/30 animate-toast-in ${
              t.kind === "success" ? "border-emerald-500/40" : t.kind === "error" ? "border-rose-500/50" : "border-brand-500/40"
            }`}>
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              t.kind === "success" ? "bg-emerald-500/20 text-emerald-300" : t.kind === "error" ? "bg-rose-500/20 text-rose-300" : "bg-brand-500/20 text-brand-200"
            }`}>
              {t.kind === "success" ? <IconCheck width={13} height={13} /> : t.kind === "error" ? <IconAlert width={13} height={13} /> : <IconCheck width={13} height={13} />}
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{t.title}</p>
              {t.msg && <p className="mt-0.5 text-[12.5px] leading-snug text-paper/70">{t.msg}</p>}
            </div>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-auto rounded p-0.5 text-paper/50 hover:text-paper" aria-label="Dismiss">
              <IconX width={13} height={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export const apiErrorMsg = (err: unknown): string => {
  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  return anyErr?.response?.data?.message ?? anyErr?.message ?? "Request failed";
};
