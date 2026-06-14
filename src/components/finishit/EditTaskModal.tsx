import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { useStore, type Priority, type TaskStatus, type Task } from "@/lib/finishit-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const toDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromDayKey = (k: string) => {
  try { return parse(k, "yyyy-MM-dd", new Date()); } catch { return new Date(); }
};

export function EditTaskModal({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: Task;
}) {
  const { updateTask, assignableUsers } = useStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assigneeUserId, setAssigneeUserId] = useState<string>(task.assigneeUserId ?? "self");
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes);
  const [reminderBeforeMinutes, setReminderBeforeMinutes] = useState(task.reminderBeforeMinutes);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [scheduledFor, setScheduledFor] = useState<Date>(fromDayKey(task.dayKey));

  useEffect(() => {
    if (!open) return;
    setTitle(task.title);
    setDescription(task.description);
    setAssigneeUserId(task.assigneeUserId ?? "self");
    setEstimatedMinutes(task.estimatedMinutes);
    setReminderBeforeMinutes(task.reminderBeforeMinutes);
    setPriority(task.priority);
    setStatus(task.status);
    setScheduledFor(fromDayKey(task.dayKey));
  }, [open, task]);

  const submit = () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    const picked = assignableUsers.find((u) => u.id === assigneeUserId);
    const newEstSec = estimatedMinutes * 60;
    const patch: Partial<Task> = {
      title: title.trim(),
      description: description.trim(),
      assignee: picked?.label ?? "You",
      assigneeUserId: assigneeUserId && assigneeUserId !== "self" ? assigneeUserId : undefined,
      estimatedMinutes,
      reminderBeforeMinutes,
      priority,
      status,
      dayKey: toDayKey(scheduledFor),
    };
    // If estimate changed and timer hasn't been used much, keep remaining in sync
    if (estimatedMinutes !== task.estimatedMinutes && !task.isRunning) {
      patch.remainingSeconds = Math.max(0, newEstSec - task.spentSeconds);
    }
    updateTask(task.id, patch);
    toast.success("Task updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the details and save.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="e-desc">Description</Label>
            <Textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="e-assignee">Assigned to</Label>
              <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                <SelectTrigger id="e-assignee"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableUsers.length === 0 ? (
                    <SelectItem value="self">You</SelectItem>
                  ) : (
                    assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-prio">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="e-prio"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-est">Estimated (min)</Label>
              <Input id="e-est" type="number" min={1} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-rem">Reminder before (min)</Label>
              <Input id="e-rem" type="number" min={0} value={reminderBeforeMinutes} onChange={(e) => setReminderBeforeMinutes(Number(e.target.value) || 0)} />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="e-stat">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="e-stat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Schedule for</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !scheduledFor && "text-muted-foreground")}
                  >
                    <CalendarIcon />
                    {scheduledFor ? format(scheduledFor, "EEE, MMM d, yyyy") : <span>Pick a day</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledFor}
                    onSelect={(d) => d && setScheduledFor(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
