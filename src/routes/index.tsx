import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/finishit/AppShell";
import { ArrowRight } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import heroLight from "@/assets/hero-light.webp.asset.json";
import heroDark from "@/assets/hero-dark.webp.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishit! — Stop Delaying, Start Finishing." },
      { name: "description", content: "Your visual daily work dashboard. See every ongoing task, track focus time, and turn today's work into real progress." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const { theme, toggle } = useTheme();

  // If signed in, send them straight to the dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/dashboard", replace: true });
    });
  }, [nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-mist px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Your daily work, in focus
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Stop Delaying,
            <br />
            <span className="text-primary">Start Finishing!</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Finishit! is your visual daily work dashboard. See every ongoing task, track your focus time, and turn today's work into real progress.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">Get started <ArrowRight /></Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            For anyone who wants less delay and more done.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
            <Quote>“Every ongoing task, in one place.”</Quote>
            <Quote>“Less guessing. More finishing.”</Quote>
          </div>
        </section>

        <section className="relative">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Today's Work Board</p>
                <h3 className="text-sm font-semibold text-foreground">Your day, at a glance.</h3>
              </div>
              <span className="rounded-md bg-[color:var(--blue-soft)] px-2 py-0.5 font-mono text-[10px] uppercase text-primary">Live</span>
            </div>
            <div className="grid gap-3 pt-4">
              <PreviewCard title="Write campaign script" assignee="You" status="ongoing" time="32:14" pct={62} />
              <PreviewCard title="Review client proposal" assignee="You" status="ongoing" time="18:00" pct={40} />
              <PreviewCard title="Prepare meeting deck" assignee="You" status="finished" time="58:02" pct={100} />
              <PreviewCard title="Follow up invoice" assignee="You" status="waiting" time="10:00" pct={0} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
              <span>4 tasks · 1 finished · 2 ongoing</span>
              <span className="text-primary">3h 12m focus</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-wider">Finishit! · by ConextLab</span>
          <Link to="/auth" className="hover:text-foreground">Open the dashboard →</Link>
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
