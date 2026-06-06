import { CalendarClock, ArrowDownToLine, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, dateKeys, type Task } from "@/lib/finishit-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ScheduledCard({ task }: { task: Task }) {
  const { updateTask, removeTask } = useStore();
  const today = dateKeys.today();
  const dateLabel = new Date(task.dayKey).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const priorityColor =
    task.priority === "high" ? "text-rose-600 dark:text-rose-400" :
    task.priority === "medium" ? "text-amber-600 dark:text-amber-400" :
    "text-muted-foreground";

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--blue-soft)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              <CalendarClock className="h-3 w-3" /> {dateLabel}
            </span>
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
              onClick={() => { removeTask(task.id); toast(`Deleted "${task.title}"`); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--blue-soft)] text-[11px] font-semibold text-primary">
          {task.assignee.trim()[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="text-muted-foreground">{task.assignee}</span>
        <span className="font-mono text-muted-foreground">·</span>
        <span className="font-mono text-muted-foreground">{task.estimatedMinutes}m est</span>
      </div>

      <div className="mt-4">
        <Button size="sm" variant="outline" onClick={() => {
          updateTask(task.id, { dayKey: today });
          toast.success("Moved to today");
        }}>
          <ArrowDownToLine /> Move to today
        </Button>
      </div>
    </div>
  );
}
