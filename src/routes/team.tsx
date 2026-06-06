import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { useStore, dateKeys, formatDuration } from "@/lib/finishit-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Visibility · Finishit!" },
      { name: "description", content: "Know who is working on what without asking every five minutes." },
    ],
  }),
  component: TeamPage,
});

type Member = { name: string; role: string; status: "Focused" | "Available" | "Waiting" | "Offline" };

const team: Member[] = [
  { name: "Aisha Bello", role: "Content Lead", status: "Focused" },
  { name: "Daniel Okafor", role: "Strategist", status: "Focused" },
  { name: "Mira Adeyemi", role: "Designer", status: "Available" },
  { name: "Kemi Salami", role: "Researcher", status: "Waiting" },
  { name: "You", role: "Founder", status: "Available" },
  { name: "Tunde Lawal", role: "Engineer", status: "Offline" },
];

const statusStyle: Record<Member["status"], string> = {
  Focused: "bg-[color:var(--blue-soft)] text-primary",
  Available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Waiting: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Offline: "bg-muted text-muted-foreground",
};

function TeamPage() {
  const { tasks } = useStore();
  const today = dateKeys.today();

  const byPerson = (name: string) => {
    const list = tasks.filter((t) => t.dayKey === today && t.assignee.toLowerCase() === name.toLowerCase());
    return {
      active: list.find((t) => t.isRunning) ?? list.find((t) => t.status === "ongoing"),
      finished: list.filter((t) => t.status === "finished").length,
      focus: list.reduce((a, t) => a + t.spentSeconds, 0),
      delayed: list.filter((t) => t.status === "waiting").length,
    };
  };

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Team Visibility</h1>
        <p className="mt-1 text-sm text-muted-foreground">Know who is working on what without asking every five minutes.</p>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-[color:var(--blue-soft)] p-4 text-sm text-primary">
        Visibility is not micromanagement. It helps the team protect focus and reduce forgotten work.
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => {
          const stats = byPerson(m.name.split(" ")[0]);
          return (
            <div key={m.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--blue-soft)] text-sm font-semibold text-primary">
                  {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.role}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", statusStyle[m.status])}>
                  {m.status}
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-background p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Current focus</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {stats.active?.title ?? "No active task"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Finished" value={stats.finished} />
                <Stat label="Focus" value={formatDuration(stats.focus)} />
                <Stat label="Waiting" value={stats.delayed} />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-mist p-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
