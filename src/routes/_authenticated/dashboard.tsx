import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/finishit/AppShell";
import { TaskCard } from "@/components/finishit/TaskCard";
import { AddTaskModal } from "@/components/finishit/AddTaskModal";
import { DailySummary } from "@/components/finishit/DailySummary";
import { AlarmPanel } from "@/components/finishit/AlarmPanel";
import { useStore, dateKeys, type TaskStatus } from "@/lib/finishit-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today's Work Board · Finishit!" },
      { name: "description", content: "See everything your team is working on today." },
    ],
  }),
  ssr: false,
  component: Dashboard,
});

const columns: { key: TaskStatus; label: string; hint: string }[] = [
  { key: "not-started", label: "Not Started", hint: "Pick the next move" },
  { key: "ongoing", label: "Ongoing", hint: "Focus is here" },
  { key: "waiting", label: "Waiting", hint: "Blocked or paused" },
  { key: "finished", label: "Finished", hint: "Today's wins" },
];

function Dashboard() {
  const { tasks } = useStore();
  const [open, setOpen] = useState(false);
  const today = dateKeys.today();
  const todays = useMemo(() => tasks.filter((t) => t.dayKey === today), [tasks, today]);

  return (
    <AppShell>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Today's Work Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">See everything your team is working on today.</p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          <Plus /> Add Task
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const items = todays.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="flex min-h-[200px] flex-col gap-3 rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between px-1 pt-1">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{col.hint}</p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Nothing here yet
                    </div>
                  )}
                  {items.map((t) => <TaskCard key={t.id} task={t} />)}
                </div>
              </div>
            );
          })}
        </div>
        <DailySummary />
      </div>

      <AddTaskModal open={open} onOpenChange={setOpen} />
      <AlarmPanel />
    </AppShell>
  );
}
