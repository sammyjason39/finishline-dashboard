import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, type NotePriority, type Note } from "@/lib/finishit-store";
import { useMemo, useState } from "react";
import { CalendarIcon, Plus, Trash2, BellRing, Check, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notes · Finishit!" },
      { name: "description", content: "Capture notes with priority and reminders." },
    ],
  }),
  component: NotesPage,
});

const PRIORITY_META: Record<NotePriority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", cls: "bg-[color:var(--blue-soft)] text-primary" },
  high: { label: "High", cls: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200" },
};

const PRIORITY_ORDER: Record<NotePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function NotesPage() {
  const { notes, addNote, updateNote, removeNote } = useStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<NotePriority>("medium");
  const [remindAt, setRemindAt] = useState<Date | undefined>();
  const [calOpen, setCalOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    addNote({
      title: title.trim(),
      content: content.trim(),
      priority,
      remindAt: remindAt ? format(remindAt, "yyyy-MM-dd") : undefined,
    });
    setTitle("");
    setContent("");
    setPriority("medium");
    setRemindAt(undefined);
    toast.success("Note saved");
  };

  const sorted = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (p !== 0) return p;
      if (a.remindAt && b.remindAt) return a.remindAt.localeCompare(b.remindAt);
      if (a.remindAt) return -1;
      if (b.remindAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [notes]);

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture quick notes with a priority and an optional reminder date.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-4 h-fit">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Idea for landing hero"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note…"
              rows={5}
              maxLength={4000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as NotePriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remind date</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !remindAt && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {remindAt ? format(remindAt, "PP") : "Optional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={remindAt}
                    onSelect={(d) => { setRemindAt(d); setCalOpen(false); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {remindAt && (
                    <div className="border-t border-border p-2">
                      <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => setRemindAt(undefined)}>
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Add note</Button>
        </form>

        <div className="space-y-3">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No notes yet. Add your first one on the left.
            </div>
          )}
          {sorted.map((n) => (
            <NoteRow key={n.id} note={n} onUpdate={updateNote} onRemove={removeNote} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function NoteRow({
  note,
  onUpdate,
  onRemove,
}: {
  note: Note;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onRemove: (id: string) => void;
}) {
  const meta = PRIORITY_META[note.priority];
  const overdue = note.remindAt && !note.done && note.remindAt < new Date().toISOString().slice(0, 10);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", note.done && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", meta.cls)}>
              {meta.label}
            </span>
            {note.remindAt && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                overdue ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" : "border-border text-muted-foreground"
              )}>
                <BellRing className="h-3 w-3" />
                {format(new Date(note.remindAt), "PP")}
              </span>
            )}
          </div>
          <h3 className={cn("mt-2 text-sm font-semibold text-foreground", note.done && "line-through")}>{note.title}</h3>
          {note.content && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {note.done ? (
            <Button size="icon" variant="ghost" onClick={() => onUpdate(note.id, { done: false })} aria-label="Reopen">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={() => onUpdate(note.id, { done: true })} aria-label="Mark done">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => { onRemove(note.id); toast("Note deleted"); }} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
