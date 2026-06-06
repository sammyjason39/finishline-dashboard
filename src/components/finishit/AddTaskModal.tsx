import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, type Priority, type TaskStatus } from "@/lib/finishit-store";
import { toast } from "sonner";

export function AddTaskModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("You");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [reminderBeforeMinutes, setReminderBeforeMinutes] = useState(10);
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("not-started");

  const reset = () => {
    setTitle(""); setDescription(""); setAssignee("You");
    setEstimatedMinutes(30); setReminderBeforeMinutes(10);
    setPriority("medium"); setStatus("not-started");
  };

  const submit = () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    addTask({ title: title.trim(), description: description.trim(), assignee, estimatedMinutes, reminderBeforeMinutes, priority, status });
    toast.success("Task created", { description: "Make progress visible." });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Start the task. Finish the day.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft launch email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional context…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="assignee">Assigned to</Label>
              <Input id="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prio">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="prio"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="est">Estimated (min)</Label>
              <Input id="est" type="number" min={1} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 1)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rem">Reminder before (min)</Label>
              <Input id="rem" type="number" min={0} value={reminderBeforeMinutes} onChange={(e) => setReminderBeforeMinutes(Number(e.target.value) || 0)} />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="stat">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="stat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
