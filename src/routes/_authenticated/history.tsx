import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { useStore, dateKeys, formatDuration, type Task } from "@/lib/finishit-store";
import { StatusBadge } from "@/components/finishit/StatusBadge";
import { ArrowRight, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";

export const Route = createFileRoute("/_authenticated/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daily Work Memory · Finishit!" },
      { name: "description", content: "Review what was done yesterday, what got delayed, and what needs to continue." },
    ],
  }),
  component: HistoryPage,
});

function dayKeyOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function HistoryPage() {
  const { tasks, updateTask, removeTask } = useStore();
  const y = dateKeys.yesterday();
  const today = dateKeys.today();
  const yesterday = tasks.filter((t) => t.dayKey === y);
  const finished = yesterday.filter((t) => t.status === "finished");
  const unfinished = yesterday.filter((t) => t.status !== "finished");
  const focus = yesterday.reduce((a, t) => a + t.spentSeconds, 0);

  // Last 7 days (including today)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const key = dayKeyOffset(-(6 - i));
      const dayTasks = tasks.filter((t) => t.dayKey === key);
      const label = new Date(key).toLocaleDateString(undefined, { weekday: "short" });
      return {
        key,
        label,
        focusMin: Math.round(dayTasks.reduce((a, t) => a + t.spentSeconds, 0) / 60),
        finished: dayTasks.filter((t) => t.status === "finished").length,
        unfinished: dayTasks.filter((t) => t.status !== "finished").length,
      };
    });
  }, [tasks]);

  const weekTasks = useMemo(
    () => tasks.filter((t) => last7Days.some((d) => d.key === t.dayKey)),
    [tasks, last7Days]
  );
  const weekFocus = weekTasks.reduce((a, t) => a + t.spentSeconds, 0);
  const weekFinished = weekTasks.filter((t) => t.status === "finished").length;
  const carried = tasks.filter((t) => t.dayKey === today && t.status === "not-started").length;

  // Most delayed = unfinished task with the highest est vs spent gap (or oldest)
  const mostDelayed = useMemo(() => {
    const candidates = tasks.filter((t) => t.status !== "finished");
    if (candidates.length === 0) return "—";
    const sorted = [...candidates].sort((a, b) => {
      const ageA = (Date.now() - new Date(a.createdAt).getTime());
      const ageB = (Date.now() - new Date(b.createdAt).getTime());
      return ageB - ageA;
    });
    return sorted[0].title.length > 18 ? sorted[0].title.slice(0, 16) + "…" : sorted[0].title;
  }, [tasks]);

  // Status breakdown for pie
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = { ongoing: 0, finished: 0, waiting: 0, "not-started": 0 };
    weekTasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return [
      { name: "Finished", value: counts.finished, fill: "hsl(142 71% 45%)" },
      { name: "Ongoing", value: counts.ongoing, fill: "hsl(217 91% 60%)" },
      { name: "Waiting", value: counts.waiting, fill: "hsl(38 92% 50%)" },
      { name: "Not started", value: counts["not-started"], fill: "hsl(220 9% 64%)" },
    ].filter((s) => s.value > 0);
  }, [weekTasks]);

  const focusChartConfig: ChartConfig = {
    focusMin: { label: "Focus (min)", color: "hsl(var(--primary))" },
  };
  const splitChartConfig: ChartConfig = {
    finished: { label: "Finished", color: "hsl(142 71% 45%)" },
    unfinished: { label: "Unfinished", color: "hsl(220 9% 64%)" },
  };

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
            <HistoryRow key={t.id} title={t.title} assignee={t.assignee} time={formatDuration(t.spentSeconds)} />
          ))}
        </Section>
        <Section title="Ongoing / Unfinished" subtitle="Carry over to today or archive.">
          {unfinished.length === 0 && <Empty />}
          {unfinished.map((t) => (
            <UnfinishedRow key={t.id} task={t} today={today} onUpdate={updateTask} onRemove={removeTask} />
          ))}
        </Section>
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold text-foreground">Weekly insights</h2>
        <p className="text-sm text-muted-foreground">Last 7 days, at a glance.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Stat label="Focus this week" value={formatDuration(weekFocus)} />
          <Stat label="Tasks finished" value={weekFinished} accent />
          <Stat label="Carried to today" value={carried} />
          <Stat label="Most delayed" value={mostDelayed} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Focus minutes per day</h3>
              <p className="text-xs text-muted-foreground">Time you actually spent on tasks.</p>
            </div>
            {weekTasks.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={focusChartConfig} className="h-[220px] w-full">
                <BarChart data={last7Days}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="focusMin" fill="var(--color-focusMin)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Status breakdown</h3>
              <p className="text-xs text-muted-foreground">This week's tasks by state.</p>
            </div>
            {statusBreakdown.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={{}} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              {statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  {s.name} <span className="ml-auto font-mono text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Finished vs unfinished per day</h3>
              <p className="text-xs text-muted-foreground">Where momentum slipped, and where it stuck.</p>
            </div>
            {weekTasks.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={splitChartConfig} className="h-[220px] w-full">
                <BarChart data={last7Days}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="finished" stackId="a" fill="var(--color-finished)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unfinished" stackId="a" fill="var(--color-unfinished)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
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

function HistoryRow({ title, assignee, time }: { title: string; assignee: string; time: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{assignee}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{time}</span>
        <StatusBadge status="finished" />
      </div>
    </div>
  );
}

function UnfinishedRow({
  task,
  today,
  onUpdate,
  onRemove,
}: {
  task: Task;
  today: string;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <StatusBadge status={task.status} />
        <span className="font-mono text-xs text-muted-foreground">
          {formatDuration(task.spentSeconds)} / {task.estimatedMinutes}m
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{task.title}</p>
      <p className="text-xs text-muted-foreground">{task.assignee}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => { onUpdate(task.id, { dayKey: today, status: "not-started", isRunning: false }); toast.success("Moved to today"); }}>
          Continue today
        </Button>
        <Button size="sm" variant="outline" onClick={() => { onUpdate(task.id, { status: "finished" }); toast("Archived"); }}>
          <Archive /> Archive
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { onRemove(task.id); toast(`Deleted "${task.title}"`); }}>
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nothing here.</p>;
}

function EmptyChart() {
  return (
    <div className="grid h-[220px] place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      No activity yet this week.
    </div>
  );
}
