import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/finishit-store";

export function AlarmPanel() {
  const { alarms, addAlarm, removeAlarm } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekdays">("none");

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[340px] max-w-[92vw]">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Alarms</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {alarms.length} set
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {open ? "Hide" : "Open"}
          </span>
        </button>
        {open && (
          <div className="border-t border-border p-4">
            <div className="space-y-2 max-h-44 overflow-auto">
              {alarms.length === 0 && (
                <p className="text-xs text-muted-foreground">No alarms yet.</p>
              )}
              {alarms.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{a.title || "Alarm"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{a.time} · {a.repeat}</div>
                  </div>
                  <button onClick={() => removeAlarm(a.id)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 border-t border-border pt-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wrap up day" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Repeat</Label>
                  <Select value={repeat} onValueChange={(v) => setRepeat(v as typeof repeat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekdays">Weekdays</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  addAlarm({ title: title || "Alarm", time, repeat });
                  setTitle("");
                }}
              >
                <Plus /> Save alarm
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
