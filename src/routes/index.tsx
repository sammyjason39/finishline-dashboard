import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/finishit/AppShell";
import { StatusBadge } from "@/components/finishit/StatusBadge";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finishit! — Make work visible. Finish what matters." },
      { name: "description", content: "A visual daily work dashboard for teams. See ongoing work, track focus time, and turn daily work into real progress." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <button onClick={toggle} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          {theme === "dark" ? "Light" : "Dark"} mode
        </button>
      </header>

      <main className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left: hero + login */}
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-mist px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Built for teams
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Make work visible.
            <br />
            <span className="text-primary">Finish what matters.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Finishit! helps your team see every ongoing task, track focus time, and turn daily work into real progress.
          </p>

          <form
            className="mt-8 max-w-md rounded-2xl border border-border bg-card p-6"
            onSubmit={(e) => { e.preventDefault(); nav({ to: "/dashboard" }); }}
          >
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full">
                Log in <ArrowRight />
              </Button>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">or</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => nav({ to: "/dashboard" })}>
                <GoogleIcon /> Continue with Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Built for teams who want less delay and more done.
              </p>
            </div>
          </form>
        </section>

        {/* Right: dashboard preview */}
        <section className="relative">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Today's Work Board</p>
                <h3 className="text-sm font-semibold text-foreground">Make progress visible.</h3>
              </div>
              <span className="rounded-md bg-[color:var(--blue-soft)] px-2 py-0.5 font-mono text-[10px] uppercase text-primary">Live</span>
            </div>
            <div className="grid gap-3 pt-4">
              <PreviewCard title="Write AI campaign script" assignee="Aisha" status="ongoing" time="32:14" pct={62} />
              <PreviewCard title="Review client proposal" assignee="Daniel" status="ongoing" time="18:00" pct={40} />
              <PreviewCard title="Prepare meeting deck" assignee="Daniel" status="finished" time="58:02" pct={100} />
              <PreviewCard title="Follow up invoice" assignee="You" status="waiting" time="10:00" pct={0} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
              <span>4 tasks · 1 finished · 2 ongoing</span>
              <span className="text-primary">3h 12m focus</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Quote>“Every ongoing task, in one place.”</Quote>
            <Quote>“Less guessing. More finishing.”</Quote>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">Finishit! · by ConextLab</span>
          <Link to="/dashboard" className="hover:text-foreground">Open demo dashboard →</Link>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({ title, assignee, status, time, pct }: { title: string; assignee: string; status: "ongoing" | "finished" | "waiting" | "not-started"; time: string; pct: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="font-mono text-xs tabular-nums text-foreground">{time}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {status === "finished" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="grid h-5 w-5 place-items-center rounded-full bg-[color:var(--blue-soft)] text-[10px] font-semibold text-primary">{assignee[0]}</div>
        {assignee}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.7H12z"/>
    </svg>
  );
}
