import { Bell, Clock, MoreHorizontal, Pause, Play, ArrowRightCircle, CalendarPlus, CheckCircle2, RotateCcw, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "./StatusBadge";
import { useStore, formatDuration, type Task } from "@/lib/finishit-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const toDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function TaskCard({ task }: { task: Task }) {
  const { startTask, pauseTask, finishTask, reopenTask, moveToTomorrow, updateTask, removeTask, archiveTask } = useStore();
  const [laterOpen, setLaterOpen] = useState(false);
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const warnedRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!task.isRunning) return;
    const reminderAt = task.reminderBeforeMinutes * 60;
    if (!warnedRef.current && task.remainingSeconds <= reminderAt && task.remainingSeconds > 0) {
      warnedRef.current = true;
      toast(`${Math.round(task.remainingSeconds / 60)} min left on "${task.title}"`, {
        description: "Finish strong.",
      });
    }
    if (!endedRef.current && task.remainingSeconds === 0) {
      endedRef.current = true;
      toast(`Time's up: ${task.title}`, {
        description: "Finish, extend, or move this task.",
        action: { label: "+10 min", onClick: () => {} },
      });
    }
  }, [task.isRunning, task.remainingSeconds, task.reminderBeforeMinutes, task.title]);

  const initial = task.assignee.trim()[0]?.toUpperCase() ?? "?";
  const pct = Math.min(100, Math.round((task.spentSeconds / Math.max(1, task.estimatedMinutes * 60)) * 100));
  const priorityColor =
    task.priority === "high" ? "text-rose-600 dark:text-rose-400" :
    task.priority === "medium" ? "text-amber-600 dark:text-amber-400" :
    "text-muted-foreground";

  return (
    <div className={cn(
      "group rounded-xl border bg-card p-4 transition-all",
      task.isRunning ? "border-primary/40 shadow-[0_0_0_3px_var(--blue-soft)]" : "border-border hover:border-foreground/20",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <span className={cn("font-mono text-[10px] uppercase tracking-wider", priorityColor)}>
              {task.priority}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-foreground">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted focus:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                removeTask(task.id);
                toast(`Deleted "${task.title}"`);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--blue-soft)] text-[11px] font-semibold text-primary">
          {initial}
        </div>
        <span className="text-muted-foreground">{task.assignee}</span>
        <span className="font-mono text-muted-foreground">·</span>
        <span className="font-mono text-muted-foreground">{task.estimatedMinutes}m est</span>
      </div>

      {/* Timer */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {formatDuration(task.remainingSeconds)}
            </span>
            {task.isRunning && <span className="font-mono text-[10px] uppercase tracking-wider text-primary">live</span>}
          </div>
          <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> spent {formatDuration(task.spentSeconds)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground">
          <Bell className="h-3 w-3" /> {task.reminderBeforeMinutes}m before
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {task.status !== "finished" && (
          task.isRunning ? (
            <Button size="sm" variant="secondary" onClick={() => pauseTask(task.id)}>
              <Pause /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={() => startTask(task.id)}>
              <Play /> Start
            </Button>
          )
        )}
        {task.status !== "finished" && (
          <Button size="sm" variant="outline" onClick={() => finishTask(task.id)}>
            <CheckCircle2 /> Finish
          </Button>
        )}
        {task.status === "finished" && (
          <Button size="sm" variant="outline" onClick={() => reopenTask(task.id)}>
            <RotateCcw /> Reopen
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => moveToTomorrow(task.id)}>
          <ArrowRightCircle /> Tomorrow
        </Button>
        <Popover open={laterOpen} onOpenChange={setLaterOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost">
              <CalendarPlus /> Later
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={(d) => {
                if (!d) return;
                updateTask(task.id, { dayKey: toDayKey(d) });
                setLaterOpen(false);
                toast.success(`Moved to ${format(d, "EEE, MMM d")}`);
              }}
              disabled={(d) => d < tomorrowStart}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
