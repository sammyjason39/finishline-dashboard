import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/finishit-store";

const labels: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  ongoing: "Ongoing",
  waiting: "Waiting",
  finished: "Finished",
};

const styles: Record<TaskStatus, string> = {
  "not-started": "bg-muted text-muted-foreground border-border",
  ongoing: "bg-[color:var(--blue-soft)] text-primary border-primary/20",
  waiting: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  finished: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "ongoing" && "bg-primary animate-pulse",
        status === "waiting" && "bg-amber-500",
        status === "finished" && "bg-emerald-500",
        status === "not-started" && "bg-muted-foreground/60",
      )} />
      {labels[status]}
    </span>
  );
}
