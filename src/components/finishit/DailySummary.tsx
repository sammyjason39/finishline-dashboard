import { useStore, formatDuration, dateKeys } from "@/lib/finishit-store";

export function DailySummary() {
  const { tasks } = useStore();
  const today = dateKeys.today();
  const yKey = dateKeys.yesterday();
  const todays = tasks.filter((t) => t.dayKey === today);
  const finished = todays.filter((t) => t.status === "finished").length;
  const ongoing = todays.filter((t) => t.status === "ongoing").length;
  const waiting = todays.filter((t) => t.status === "waiting").length;
  const focus = todays.reduce((acc, t) => acc + t.spentSeconds, 0);
  const carry = tasks.filter((t) => t.dayKey === yKey && t.status !== "finished").length;

  const Row = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={"font-mono text-sm font-semibold tabular-nums " + (accent ? "text-primary" : "text-foreground")}>{value}</span>
    </div>
  );

  return (
    <aside className="rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Today Summary</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Make progress visible.</p>
      </div>
      <div className="mt-4">
        <Row label="Tasks today" value={todays.length} />
        <Row label="Finished" value={finished} />
        <Row label="Ongoing" value={ongoing} accent />
        <Row label="Waiting" value={waiting} />
        <Row label="Focus time" value={formatDuration(focus)} />
        <Row label="Carry over" value={carry} />
      </div>
      <div className="mt-5 rounded-lg bg-[color:var(--blue-soft)] p-3 text-xs text-primary">
        Yesterday's work, today's next move.
      </div>
    </aside>
  );
}
