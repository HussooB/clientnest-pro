import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMsg, Button, Field, TextInput } from "../components/ui";
import { IconAlert, LogoMark } from "../components/icons";

const MODULES = [
  ["A", "Leads & Opportunities"],
  ["B", "Clients & Companies"],
  ["C", "Products & Licenses"],
  ["D", "Financial Management"],
  ["F", "Support & SLA"],
  ["G", "Feature Roadmap"],
  ["H", "Dashboard & Reports"],
  ["I", "Audit Trail & RBAC"],
] as const;

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@clientnest.io", tone: "text-gold-300 border-gold-400/40 hover:bg-gold-400/10" },
  { role: "Finance", email: "finance@clientnest.io", tone: "text-brand-200 border-brand-400/40 hover:bg-brand-400/10" },
  { role: "Support", email: "support@clientnest.io", tone: "text-sky-300 border-sky-400/40 hover:bg-sky-400/10" },
  { role: "Sales", email: "sales@clientnest.io", tone: "text-orange-300 border-orange-400/40 hover:bg-orange-400/10" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const doLogin = async (em: string, pw: string, key: string) => {
    setBusy(key);
    setError("");
    try {
      await login(em, pw);
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiErrorMsg(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
      {/* ── Brand panel ── */}
      <div className="login-texture relative hidden flex-col justify-between overflow-hidden bg-petrol-950 p-10 text-paper lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div className="leading-none">
            <p className="font-display text-xl font-extrabold tracking-tight">
              ClientNest <span className="text-gold-400">Pro</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/45">CRM &amp; Fee-Management Platform</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-[42px] font-extrabold leading-[1.05] tracking-tight">
            The whole client lifecycle, <span className="text-gold-400">one ledger.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-paper/65">
            From the first sales lead to recurring hosting fees, license renewals, SLA-bound
            support and an immutable audit trail — ClientNest Pro keeps revenue and service
            accountable to each other.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-2">
            {MODULES.map(([code, name], i) => (
              <li key={code} className="flex items-center gap-2.5 rounded-lg border border-petrol-700/70 bg-petrol-900/60 px-3 py-2.5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-700/60 font-mono text-[11px] font-bold text-brand-100">{code}</span>
                <span className="text-[12.5px] font-semibold text-paper/80">{name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2.5 text-[12px] font-medium text-paper/50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
          Backend <span className="font-mono text-paper/70">localhost:5000/api</span> · automatic demo-data fallback when offline
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark size={38} />
            <p className="font-display text-lg font-extrabold tracking-tight">
              ClientNest <span className="text-brand-700">Pro</span>
            </p>
          </div>

          <h2 className="font-display text-[26px] font-extrabold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm text-mute">Role-based access · every action is audit-logged.</p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(email, password, "form");
            }}
          >
            <Field label="Email" required>
              <TextInput type="email" required autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" required>
              <TextInput type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-[13px] font-semibold text-rose-800 animate-pop">
                <IconAlert width={15} height={15} /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={busy === "form"}>
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Explore with a demo role · password <span className="font-mono normal-case tracking-normal">nest2025</span></p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("nest2025");
                    void doLogin(acc.email, "nest2025", acc.role);
                  }}
                  className={`rounded-lg border bg-petrol-900 px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98] ${acc.tone}`}
                >
                  <span className="block font-display text-[13.5px] font-bold">{busy === acc.role ? "Signing in…" : acc.role}</span>
                  <span className="block truncate font-mono text-[10.5px] text-paper/45">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
