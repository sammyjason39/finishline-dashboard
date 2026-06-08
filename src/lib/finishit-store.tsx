import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "not-started" | "ongoing" | "waiting" | "finished";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeAvatar?: string;
  estimatedMinutes: number;
  reminderBeforeMinutes: number;
  priority: Priority;
  status: TaskStatus;
  remainingSeconds: number;
  spentSeconds: number;
  isRunning: boolean;
  createdAt: string;
  dayKey: string;
  archivedAt?: string;
  finalSpentSeconds?: number;
}

export interface Alarm {
  id: string;
  title: string;
  time: string;
  repeat: "none" | "daily" | "weekdays";
}

export type NotePriority = "low" | "medium" | "high" | "urgent";

export interface Note {
  id: string;
  title: string;
  content: string;
  priority: NotePriority;
  remindAt?: string;
  createdAt: string;
  done: boolean;
}

interface State {
  tasks: Task[];
  alarms: Alarm[];
  notes: Note[];
  hydrated: boolean;
}

interface StoreApi extends State {
  addTask: (t: Omit<Task, "id" | "createdAt" | "remainingSeconds" | "spentSeconds" | "isRunning" | "dayKey"> & Partial<Pick<Task, "dayKey">>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  startTask: (id: string) => void;
  pauseTask: (id: string) => void;
  finishTask: (id: string) => void;
  reopenTask: (id: string) => void;
  moveToTomorrow: (id: string) => void;
  removeTask: (id: string) => void;
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;

  addAlarm: (a: Omit<Alarm, "id">) => void;
  removeAlarm: (id: string) => void;
  addNote: (n: Omit<Note, "id" | "createdAt" | "done">) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

const todayKey = () => new Date().toISOString().slice(0, 10);
const tomorrowKey = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const STORAGE_KEY = "finishit:v1";
const BACKUP_KEY = "finishit:v1:backup";

function loadPersisted(): Partial<State> | null {
  for (const key of [STORAGE_KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<State>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return null;
}

// ---------- mappers ----------
type DbTask = {
  id: string; title: string; description: string; assignee: string; assignee_avatar: string | null;
  estimated_minutes: number; reminder_before_minutes: number; priority: Priority; status: TaskStatus;
  remaining_seconds: number; spent_seconds: number; is_running: boolean;
  day_key: string; archived_at: string | null; final_spent_seconds: number | null;
  created_at: string;
};
function fromDbTask(r: DbTask): Task {
  return {
    id: r.id, title: r.title, description: r.description ?? "", assignee: r.assignee,
    assigneeAvatar: r.assignee_avatar ?? undefined,
    estimatedMinutes: r.estimated_minutes, reminderBeforeMinutes: r.reminder_before_minutes,
    priority: r.priority, status: r.status,
    remainingSeconds: r.remaining_seconds, spentSeconds: r.spent_seconds,
    isRunning: r.is_running, createdAt: r.created_at, dayKey: r.day_key,
    archivedAt: r.archived_at ?? undefined,
    finalSpentSeconds: r.final_spent_seconds ?? undefined,
  };
}
function toDbTaskPatch(p: Partial<Task>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.title !== undefined) out.title = p.title;
  if (p.description !== undefined) out.description = p.description;
  if (p.assignee !== undefined) out.assignee = p.assignee;
  if (p.assigneeAvatar !== undefined) out.assignee_avatar = p.assigneeAvatar ?? null;
  if (p.estimatedMinutes !== undefined) out.estimated_minutes = p.estimatedMinutes;
  if (p.reminderBeforeMinutes !== undefined) out.reminder_before_minutes = p.reminderBeforeMinutes;
  if (p.priority !== undefined) out.priority = p.priority;
  if (p.status !== undefined) out.status = p.status;
  if (p.remainingSeconds !== undefined) out.remaining_seconds = p.remainingSeconds;
  if (p.spentSeconds !== undefined) out.spent_seconds = p.spentSeconds;
  if (p.isRunning !== undefined) out.is_running = p.isRunning;
  if (p.dayKey !== undefined) out.day_key = p.dayKey;
  if ("archivedAt" in p) out.archived_at = p.archivedAt ?? null;
  if ("finalSpentSeconds" in p) out.final_spent_seconds = p.finalSpentSeconds ?? null;
  return out;
}

type DbNote = {
  id: string; title: string; content: string; priority: NotePriority;
  remind_at: string | null; done: boolean; created_at: string;
};
function fromDbNote(r: DbNote): Note {
  return {
    id: r.id, title: r.title, content: r.content ?? "", priority: r.priority,
    remindAt: r.remind_at ?? undefined, createdAt: r.created_at, done: r.done,
  };
}
function toDbNotePatch(p: Partial<Note>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.title !== undefined) out.title = p.title;
  if (p.content !== undefined) out.content = p.content;
  if (p.priority !== undefined) out.priority = p.priority;
  if ("remindAt" in p) out.remind_at = p.remindAt ?? null;
  if (p.done !== undefined) out.done = p.done;
  return out;
}

type DbAlarm = { id: string; title: string; time: string; repeat: Alarm["repeat"] };
function fromDbAlarm(r: DbAlarm): Alarm {
  return { id: r.id, title: r.title, time: r.time, repeat: r.repeat };
}

// fire-and-forget; logs but never throws into UI
function bg<T>(p: PromiseLike<T>) {
  Promise.resolve(p).then(
    () => {},
    (e) => console.warn("[finishit cloud sync]", e),
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ tasks: [], alarms: [], notes: [], hydrated: false });
  const userIdRef = useRef<string | null>(null);

  // Hydrate: localStorage first (instant), then Supabase if signed in (authoritative)
  useEffect(() => {
    const cached = loadPersisted();
    setState({
      tasks: cached?.tasks ?? [],
      alarms: cached?.alarms ?? [],
      notes: cached?.notes ?? [],
      hydrated: true,
    });

    let cancelled = false;
    async function loadFromCloud() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      userIdRef.current = user?.id ?? null;
      if (!user || cancelled) return;
      const [tasksRes, notesRes, alarmsRes] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: true }),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("alarms").select("*").order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setState({
        tasks: (tasksRes.data ?? []).map((r) => fromDbTask(r as DbTask)),
        notes: (notesRes.data ?? []).map((r) => fromDbNote(r as DbNote)),
        alarms: (alarmsRes.data ?? []).map((r) => fromDbAlarm(r as DbAlarm)),
        hydrated: true,
      });
    }
    loadFromCloud().catch((e) => console.warn("[finishit cloud hydrate]", e));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      userIdRef.current = session?.user?.id ?? null;
      if (event === "SIGNED_IN") loadFromCloud().catch(() => {});
      if (event === "SIGNED_OUT") {
        setState({ tasks: [], alarms: [], notes: [], hydrated: true });
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Persist local cache (primary + rolling backup)
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const payload = JSON.stringify({ tasks: state.tasks, alarms: state.alarms, notes: state.notes });
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {}
  }, [state]);

  // Timer tick — local only, debounced sync of spent_seconds every 30s
  const lastSyncRef = useRef<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!s.hydrated) return s;
        let changed = false;
        const tasks = s.tasks.map((t) => {
          if (!t.isRunning) return t;
          changed = true;
          const remaining = Math.max(0, t.remainingSeconds - 1);
          if (remaining === 0) {
            const updated = { ...t, remainingSeconds: 0, spentSeconds: t.spentSeconds + 1, isRunning: false };
            if (userIdRef.current) {
              bg(supabase.from("tasks").update({
                remaining_seconds: 0, spent_seconds: updated.spentSeconds, is_running: false,
              }).eq("id", t.id));
            }
            return updated;
          }
          return { ...t, remainingSeconds: remaining, spentSeconds: t.spentSeconds + 1 };
        });
        return changed ? { ...s, tasks } : s;
      });

      // Periodic sync of running timers (every 30s) to avoid hammering the DB
      if (userIdRef.current && Date.now() - lastSyncRef.current > 30_000) {
        lastSyncRef.current = Date.now();
        setState((s) => {
          s.tasks.filter((t) => t.isRunning).forEach((t) => {
            bg(supabase.from("tasks").update({
              remaining_seconds: t.remainingSeconds, spent_seconds: t.spentSeconds,
            }).eq("id", t.id));
          });
          return s;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const updateLocalTask = (id: string, patch: Partial<Task>) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const pushTask = (id: string, patch: Partial<Task>) => {
    if (!userIdRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bg(supabase.from("tasks").update(toDbTaskPatch(patch) as any).eq("id", id));
  };


  const api = useMemo<StoreApi>(() => ({
    ...state,
    addTask: (t) => {
      const id = crypto.randomUUID();
      const dayKey = t.dayKey ?? todayKey();
      const newTask: Task = {
        id,
        createdAt: new Date().toISOString(),
        dayKey,
        remainingSeconds: t.estimatedMinutes * 60,
        spentSeconds: 0,
        isRunning: false,
        title: t.title, description: t.description, assignee: t.assignee,
        assigneeAvatar: t.assigneeAvatar, estimatedMinutes: t.estimatedMinutes,
        reminderBeforeMinutes: t.reminderBeforeMinutes, priority: t.priority,
        status: t.status,
      };
      setState((s) => ({ ...s, tasks: [...s.tasks, newTask] }));
      if (userIdRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bg(supabase.from("tasks").insert({
          id, user_id: userIdRef.current, ...toDbTaskPatch(newTask),
        } as any));
      }

    },
    updateTask: (id, patch) => { updateLocalTask(id, patch); pushTask(id, patch); },
    startTask: (id) => {
      updateLocalTask(id, { isRunning: true, status: "ongoing" });
      pushTask(id, { isRunning: true, status: "ongoing" });
    },
    pauseTask: (id) => {
      const t = state.tasks.find((x) => x.id === id);
      updateLocalTask(id, { isRunning: false });
      pushTask(id, { isRunning: false, remainingSeconds: t?.remainingSeconds, spentSeconds: t?.spentSeconds });
    },
    finishTask: (id) => {
      const t = state.tasks.find((x) => x.id === id);
      updateLocalTask(id, { isRunning: false, status: "finished" });
      pushTask(id, { isRunning: false, status: "finished", remainingSeconds: t?.remainingSeconds, spentSeconds: t?.spentSeconds });
    },
    reopenTask: (id) => {
      updateLocalTask(id, { isRunning: false, status: "ongoing" });
      pushTask(id, { isRunning: false, status: "ongoing" });
    },
    moveToTomorrow: (id) => {
      const dk = tomorrowKey();
      updateLocalTask(id, { isRunning: false, dayKey: dk, status: "not-started" });
      pushTask(id, { isRunning: false, dayKey: dk, status: "not-started" });
    },
    removeTask: (id) => {
      setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      if (userIdRef.current) bg(supabase.from("tasks").delete().eq("id", id));
    },
    archiveTask: (id) => {
      const t = state.tasks.find((x) => x.id === id);
      const archivedAt = new Date().toISOString();
      const finalSpent = t?.spentSeconds ?? 0;
      updateLocalTask(id, { isRunning: false, status: "finished", archivedAt, finalSpentSeconds: finalSpent });
      pushTask(id, { isRunning: false, status: "finished", archivedAt, finalSpentSeconds: finalSpent, spentSeconds: t?.spentSeconds });
    },
    unarchiveTask: (id) => {
      const dk = todayKey();
      updateLocalTask(id, { archivedAt: undefined, dayKey: dk });
      pushTask(id, { archivedAt: undefined, dayKey: dk });
    },

    addAlarm: (a) => {
      const id = crypto.randomUUID();
      setState((s) => ({ ...s, alarms: [...s.alarms, { id, ...a }] }));
      if (userIdRef.current) {
        bg(supabase.from("alarms").insert({ id, user_id: userIdRef.current, title: a.title, time: a.time, repeat: a.repeat }));
      }
    },
    removeAlarm: (id) => {
      setState((s) => ({ ...s, alarms: s.alarms.filter((a) => a.id !== id) }));
      if (userIdRef.current) bg(supabase.from("alarms").delete().eq("id", id));
    },

    addNote: (n) => {
      const id = crypto.randomUUID();
      const note: Note = { id, createdAt: new Date().toISOString(), done: false, ...n };
      setState((s) => ({ ...s, notes: [...s.notes, note] }));
      if (userIdRef.current) {
        bg(supabase.from("notes").insert({
          id, user_id: userIdRef.current, title: note.title, content: note.content,
          priority: note.priority, remind_at: note.remindAt ?? null, done: note.done,
        }));
      }
    },
    updateNote: (id, patch) => {
      setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (userIdRef.current) bg(supabase.from("notes").update(toDbNotePatch(patch) as any).eq("id", id));

    },
    removeNote: (id) => {
      setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
      if (userIdRef.current) bg(supabase.from("notes").delete().eq("id", id));
    },
  }), [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const dateKeys = { today: todayKey, tomorrow: tomorrowKey, yesterday: yesterdayKey };

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
