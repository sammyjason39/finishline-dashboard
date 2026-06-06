import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { useStore, dateKeys, formatDuration } from "@/lib/finishit-store";
import { StatusBadge } from "@/components/finishit/StatusBadge";
import { ArrowRight, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Daily Work Memory · Finishit!" },
      { name: "description", content: "Review what was done yesterday, what got delayed, and what needs to continue." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { tasks, updateTask, removeTask } = useStore();
  const y = dateKeys.yesterday();
  const today = dateKeys.today();
  const yesterday = tasks.filter((t) => t.dayKey === y);
  const finished = yesterday.filter((t) => t.status === "finished");
  const unfinished = yesterday.filter((t) => t.status !== "finished");
  const focus = yesterday.reduce((a, t) => a + t.spentSeconds, 0);

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.dayKey);
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff <= 7;
  });
  const weekFocus = weekTasks.reduce((a, t) => a + t.spentSeconds, 0);
  const weekFinished = weekTasks.filter((t) => t.status === "finished").length;
  const carried = tasks.filter((t) => t.dayKey === today && t.status === "not-started").length;

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Daily Work Memory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review what was done yesterday, what got delayed, and what needs to continue.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Yesterday tasks" value={yesterday.length} />
        <Stat label="Finished" value={finished.length} accent />
        <Stat label="Unfinished" value={unfinished.length} />
        <Stat label="Focus time" value={formatDuration(focus)} />
      </div>

      {unfinished.length > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-[color:var(--blue-soft)] p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Continue yesterday's unfinished work?</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your work does not disappear after today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => {
                unfinished.forEach((t) => updateTask(t.id, { dayKey: today, status: "not-started", isRunning: false }));
                toast.success(`Carried ${unfinished.length} task${unfinished.length === 1 ? "" : "s"} to today`);
              }}>
                Continue today <ArrowRight />
              </Button>
              <Button variant="outline" onClick={() => {
                unfinished.forEach((t) => updateTask(t.id, { status: "finished" }));
                toast("Archived");
              }}>
                <Archive /> Archive all
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Finished tasks" subtitle="Yesterday's wins.">
          {finished.length === 0 && <Empty />}
          {finished.map((t) => (
            <HistoryRow key={t.id} title={t.title} assignee={t.assignee} time={formatDuration(t.spentSeconds)} status="finished" />
          ))}
        </Section>
        <Section title="Ongoing / Unfinished" subtitle="Carry over to today or archive.">
          {unfinished.length === 0 && <Empty />}
          {unfinished.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={t.status} />
                <span className="font-mono text-xs text-muted-foreground">{formatDuration(t.spentSeconds)} / {t.estimatedMinutes}m</span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.assignee}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => { updateTask(t.id, { dayKey: today, status: "not-started", isRunning: false }); toast.success("Moved to today"); }}>
                  Continue today
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateTask(t.id, { status: "finished" })}>
                  <Archive /> Archive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeTask(t.id)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </div>
          ))}
        </Section>
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold text-foreground">Weekly insights</h2>
        <p className="text-sm text-muted-foreground">Yesterday's work, today's next move.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Stat label="Focus this week" value={formatDuration(weekFocus)} />
          <Stat label="Tasks finished" value={weekFinished} accent />
          <Stat label="Carried over" value={carried} />
          <Stat label="Most delayed" value="Research" />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={"mt-2 text-2xl font-semibold tabular-nums " + (accent ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function HistoryRow({ title, assignee, time, status }: { title: string; assignee: string; time: string; status: "finished" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{assignee}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{time}</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function Empty() {
  return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nothing here.</p>;
}
