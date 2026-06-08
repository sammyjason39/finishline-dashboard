import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { useStore, formatDuration, type Task } from "@/lib/finishit-store";
import { useMemo } from "react";
import { CheckCircle2, Clock, Flame, Trophy, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/insight")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Insight · Finishit!" },
      { name: "description", content: "Archive of finished work, time invested, and momentum." },
    ],
  }),
  component: InsightPage,
});

function spentOf(t: Task) {
  return t.finalSpentSeconds ?? t.spentSeconds;
}

function InsightPage() {
  const { tasks, unarchiveTask, removeTask } = useStore();
  const archived = useMemo(
    () => [...tasks].filter((t) => !!t.archivedAt).sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? "")),
    [tasks]
  );

  const totalSeconds = archived.reduce((a, t) => a + spentOf(t), 0);
  const totalEstimated = archived.reduce((a, t) => a + t.estimatedMinutes * 60, 0);
  const efficiency = totalEstimated > 0 ? Math.round((totalSeconds / totalEstimated) * 100) : 0;

  // Last 14 days bar chart
  const last14 = useMemo(() => {
    const days: { key: string; label: string; count: number; minutes: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: format(d, "MMM d"), count: 0, minutes: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const t of archived) {
      const key = (t.archivedAt ?? "").slice(0, 10);
      const bucket = byKey.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.minutes += Math.round(spentOf(t) / 60);
      }
    }
    return days;
  }, [archived]);

  // Group by archive day
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of archived) {
      const key = (t.archivedAt ?? "").slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [archived]);

  const chartConfig: ChartConfig = {
    minutes: { label: "Minutes", color: "hsl(var(--primary))" },
  };

  const topAssignee = useMemo(() => {
    const counts = new Map<string, number>();
    archived.forEach((t) => counts.set(t.assignee, (counts.get(t.assignee) ?? 0) + 1));
    let best: [string, number] | null = null;
    counts.forEach((v, k) => { if (!best || v > best[1]) best = [k, v]; });
    return best ? `${best[0]} (${best[1]})` : "—";
  }, [archived]);

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Insight</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Archive of everything you finished. Time invested, momentum, and wins.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat icon={<Trophy className="h-4 w-4" />} label="Tasks finished" value={archived.length} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Total focus time" value={formatDuration(totalSeconds)} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Estimate accuracy" value={efficiency > 0 ? `${efficiency}%` : "—"} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Top contributor" value={topAssignee} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Finished per day (last 14)</h2>
          <p className="text-xs text-muted-foreground">Focus minutes archived to insight.</p>
        </div>
        {archived.length === 0 ? (
          <div className="grid h-[220px] place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
            Nothing archived yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={last14}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold text-foreground">Archive</h2>
        <p className="text-xs text-muted-foreground">Click "Finish now" on a finished card on the dashboard to send it here.</p>

        {grouped.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No finished work archived yet.
          </div>
        )}

        <div className="mt-4 space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">{format(parseISO(day), "EEEE, MMM d, yyyy")}</h3>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {items.length} task{items.length === 1 ? "" : "s"} · {formatDuration(items.reduce((a, t) => a + spentOf(t), 0))}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => (
                  <ArchivedCard key={t.id} task={t} onReopen={() => { unarchiveTask(t.id); toast.success(`Restored "${t.title}" to today`); }} onDelete={() => { removeTask(t.id); toast(`Deleted "${t.title}"`); }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ArchivedCard({ task, onReopen, onDelete }: { task: Task; onReopen: () => void; onDelete: () => void }) {
  const spent = spentOf(task);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Finished
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{task.priority}</span>
      </div>
      <h4 className="mt-2 text-sm font-semibold text-foreground">{task.title}</h4>
      {task.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
      <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(spent)}</span>
        <span>· {task.estimatedMinutes}m est</span>
        <span>· {task.assignee}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={onReopen}>
          <RotateCcw /> Restore
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  );
}
