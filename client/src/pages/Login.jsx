import { useState } from 'react';
import { ArrowRight, BellRing, Kanban, LineChart, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth.jsx';
import { Logo } from '../components/layout/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Admin', detail: 'Full access, team & reports', email: 'admin@crm.test', password: 'admin123' },
  { label: 'Sales rep', detail: 'Own leads only', email: 'priya@crm.test', password: 'sales123' },
];

const HIGHLIGHTS = [
  { icon: Kanban, title: 'Visual pipeline', text: 'Drag deals across stages and see value per stage at a glance.' },
  { icon: BellRing, title: 'Never miss a follow-up', text: 'Overdue tasks surface everywhere until they are done.' },
  { icon: LineChart, title: 'Reports that answer questions', text: 'Funnel, win rate, revenue and rep performance in one place.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Reps see their own book. Admins see everything.' },
];

const PREVIEW_COLUMNS = [
  { stage: 'Qualified', dot: 'bg-violet-400', cards: [72, 54, 64] },
  { stage: 'Proposal', dot: 'bg-amber-400', cards: [60, 80] },
  { stage: 'Won', dot: 'bg-emerald-400', cards: [68] },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (creds = { email, password }) => {
    setError('');
    setBusy(true);
    try {
      await login(creds.email, creds.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-muted">Sign in to pick up where your pipeline left off.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
            <Input label="Work email" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
            <Input label="Password" type="password" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} iconRight={busy ? undefined : ArrowRight}>
              Sign in
            </Button>
          </form>

          <div className="mt-10">
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="h-px flex-1 bg-line" />
              Explore with a demo account
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  disabled={busy}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    signIn(a);
                  }}
                  className="group rounded-xl border border-line bg-surface p-3 text-left transition hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-500/50"
                >
                  <span className="flex items-center justify-between font-medium">
                    {a.label}
                    <ArrowRight className="size-3.5 text-subtle transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{a.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} LeadFlow. Built for teams that sell.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.35),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-size-[44px_44px]" />
        <div className="relative flex h-full flex-col justify-center px-14 py-16 xl:px-20">
          <p className="text-sm font-medium text-indigo-300">Sales CRM for growing teams</p>
          <h2 className="mt-3 max-w-lg text-4xl leading-tight font-semibold tracking-tight text-white">
            Every lead, every follow-up, every deal — in one place.
          </h2>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3" aria-hidden>
            {PREVIEW_COLUMNS.map((column) => (
              <div key={column.stage} className="rounded-xl border border-white/10 bg-white/4 p-3 backdrop-blur">
                <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <span className={`size-1.5 rounded-full ${column.dot}`} />
                  {column.stage}
                </p>
                {column.cards.map((width, i) => (
                  <div key={i} className="mt-2.5 rounded-lg bg-white/6 p-2.5 ring-1 ring-white/5">
                    <div className="h-1.5 rounded-full bg-white/40" style={{ width: `${width}%` }} />
                    <div className="mt-2 h-1.5 w-1/2 rounded-full bg-white/15" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <ul className="mt-10 grid max-w-xl gap-5 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/6 ring-1 ring-white/10">
                  <Icon className="size-4.5 text-indigo-300" />
                </span>
                <span>
                  <span className="block font-medium text-white">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-zinc-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
