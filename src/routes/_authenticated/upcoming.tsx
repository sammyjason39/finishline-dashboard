import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { AppShell } from "@/components/finishit/AppShell";
import { ScheduledCard } from "@/components/finishit/ScheduledCard";
import { TaskCard } from "@/components/finishit/TaskCard";
import { AddTaskModal } from "@/components/finishit/AddTaskModal";
import { AlarmPanel } from "@/components/finishit/AlarmPanel";
import { useStore, dateKeys } from "@/lib/finishit-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming · Finishit!" },
      { name: "description", content: "Plan tasks for any future day." },
    ],
  }),
  ssr: false,
  component: UpcomingPage,
});

const toDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function UpcomingPage() {
  const { tasks } = useStore();
  const [selected, setSelected] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  const today = dateKeys.today();
  const selectedKey = toDayKey(selected);
  const isToday = selectedKey === today;
  const isPast = selectedKey < today;

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dayKey === selectedKey),
    [tasks, selectedKey],
  );

  // Highlight days that have tasks
  const scheduledDays = useMemo(() => {
    const set = new Set(tasks.map((t) => t.dayKey));
    return Array.from(set).map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [tasks]);

  return (
    <AppShell>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Upcoming</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a day and schedule what needs to happen.</p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg" disabled={isPast}>
          <Plus /> Add to {isToday ? "today" : format(selected, "MMM d")}
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="rounded-2xl border border-border bg-card p-3">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            modifiers={{ scheduled: scheduledDays }}
            modifiersClassNames={{
              scheduled: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            }}
            className={cn("pointer-events-auto")}
          />
        </div>

        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {format(selected, "EEEE, MMMM d")}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"} scheduled
              </p>
            </div>
          </div>

          {dayTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {isPast ? "No tasks were scheduled for this day." : "Nothing scheduled. Add your first task for this day."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {dayTasks.map((t) =>
                isToday ? <TaskCard key={t.id} task={t} /> : <ScheduledCard key={t.id} task={t} />,
              )}
            </div>
          )}
        </div>
      </div>

      <AddTaskModal open={open} onOpenChange={setOpen} initialDate={selected} />
      <AlarmPanel />
    </AppShell>
  );
}
