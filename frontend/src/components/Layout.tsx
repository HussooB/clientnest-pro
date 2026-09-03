import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isDemoMode, onDemoMode } from "../lib/api";
import { initials } from "../lib/utils";
import type { Role } from "../types";
import {
  IconBuilding, IconFunnel, IconGrid, IconInvoice, IconKey, IconLayers, IconLifebuoy,
  IconLogout, IconScroll, LogoMark,
} from "./icons";
import { Badge, roleTone } from "./ui";

interface NavItem { to: string; label: string; icon: (p: { width?: number; height?: number }) => ReactNode; roles?: Role[]; end?: boolean }

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: (p) => <IconGrid {...p} />, end: true },
      { to: "/leads", label: "Leads", icon: (p) => <IconFunnel {...p} />, roles: ["Admin", "Sales"] },
      { to: "/clients", label: "Clients", icon: (p) => <IconBuilding {...p} /> },
    ],
  },
  {
    label: "Revenue",
    items: [
      { to: "/licenses", label: "Licenses", icon: (p) => <IconLayers {...p} /> },
      { to: "/invoices", label: "Invoices", icon: (p) => <IconInvoice {...p} /> },
    ],
  },
  {
    label: "Service",
    items: [{ to: "/tickets", label: "Support Tickets", icon: (p) => <IconLifebuoy {...p} /> }],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", label: "Users", icon: (p) => <IconKey {...p} />, roles: ["Admin"] },
      { to: "/audit-logs", label: "Audit Trail", icon: (p) => <IconScroll {...p} />, roles: ["Admin"] },
    ],
  },
];

const TITLES: [RegExp, string][] = [
  [/^\/$/, "Dashboard"],
  [/^\/leads/, "Lead & Opportunity Pipeline"],
  [/^\/clients\/.+/, "Client Profile"],
  [/^\/clients/, "Client Management"],
  [/^\/licenses/, "Product & License Management"],
  [/^\/invoices\/.+/, "Invoice Detail"],
  [/^\/invoices/, "Financial Management"],
  [/^\/tickets\/.+/, "Ticket Detail"],
  [/^\/tickets/, "Support & Activity"],
  [/^\/users/, "User Management"],
  [/^\/audit-logs/, "Audit Trail"],
];

function DemoBadge() {
  const [demo, setDemo] = useState(isDemoMode());
  useEffect(() => onDemoMode(setDemo), []);
  if (!demo) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
      Demo data · API offline
    </span>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);
  if (initializing || !ready)
    return (
      <div className="grid h-screen place-items-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={44} />
          <div className="skeleton h-2 w-36" />
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
      <div>
        <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[13.5px] text-mute">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const title = TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? "ClientNest Pro";
  const visible = (item: NavItem) => !item.roles || (user?.role && item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="sidebar-texture flex w-[228px] shrink-0 flex-col border-r border-petrol-700/60 bg-petrol-900 text-paper">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <LogoMark size={34} />
          <div className="leading-none">
            <p className="font-display text-[17px] font-extrabold tracking-tight">
              ClientNest <span className="text-gold-400">Pro</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/45">CRM · Fee Mgmt</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map((g) => {
            const items = g.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={g.label} className="mt-4 first:mt-0">
                <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-paper/35">{g.label}</p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold transition-all duration-150 ${
                            isActive ? "bg-petrol-700/80 text-gold-300" : "text-paper/70 hover:bg-petrol-800 hover:text-paper"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-400 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
                            <span className="shrink-0">{item.icon({ width: 17, height: 17 })}</span>
                            {item.label}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-petrol-700/60 p-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-petrol-800/70 px-2.5 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600/40 font-display text-xs font-bold text-brand-100">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-bold">{user.name}</p>
                <p className="text-[11px] text-paper/50">{user.role}</p>
              </div>
              <button onClick={logout} title="Sign out" className="rounded-md p-1.5 text-paper/50 transition-colors hover:bg-petrol-700 hover:text-gold-300">
                <IconLogout width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[54px] shrink-0 items-center justify-between gap-4 border-b border-line bg-card/80 px-6 backdrop-blur">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-mute">
            ClientNest Pro <span className="mx-1.5 text-line">/</span>
            <span className="text-brand-800">{title}</span>
          </p>
          <div className="flex items-center gap-3">
            <DemoBadge />
            <span className="hidden text-[12.5px] font-medium text-mute sm:block">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            {user && <Badge tone={roleTone(user.role)} dot>{user.role}</Badge>}
          </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
