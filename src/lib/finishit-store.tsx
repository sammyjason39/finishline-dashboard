import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskStatus = "not-started" | "ongoing" | "waiting" | "finished";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string; // display label (kept for backward compat / free-text)
  assigneeAvatar?: string;
  assigneeUserId?: string; // FK to auth user when assigned to a real account
  ownerId?: string;
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
  seenAt?: string;
}

export interface Alarm {
  id: string;
  title: string;
  time: string;
  repeat: "none" | "daily" | "weekdays";
  ownerId?: string;
  assigneeUserId?: string;
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
  ownerId?: string;
  assigneeUserId?: string;
}

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Connection {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
}

export interface ConnectionInvite {
  id: string;
  code: string;
  inviterId: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

interface State {
  tasks: Task[];
  alarms: Alarm[];
  notes: Note[];
  connections: Connection[];
  invites: ConnectionInvite[];
  profiles: Record<string, Profile>;
  currentUserId: string | null;
  hydrated: boolean;
}

interface StoreApi extends State {
  addTask: (t: Omit<Task, "id" | "createdAt" | "remainingSeconds" | "spentSeconds" | "isRunning" | "dayKey" | "ownerId"> & Partial<Pick<Task, "dayKey">>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  startTask: (id: string) => void;
  pauseTask: (id: string) => void;
  finishTask: (id: string) => void;
  reopenTask: (id: string) => void;
  moveToTomorrow: (id: string) => void;
  removeTask: (id: string) => void;
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;
  markTaskSeen: (id: string) => void;

  addAlarm: (a: Omit<Alarm, "id" | "ownerId">) => void;
  removeAlarm: (id: string) => void;

  addNote: (n: Omit<Note, "id" | "createdAt" | "done" | "ownerId">) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;

  createInvite: () => Promise<ConnectionInvite | null>;
  redeemInvite: (code: string) => Promise<boolean>;
  removeConnection: (id: string) => Promise<void>;
  updateMyProfile: (patch: { displayName?: string }) => Promise<void>;

  /** People you can assign work to: yourself + each connected user. */
  assignableUsers: { id: string; label: string }[];
  /** Pretty label for a user id (display name → email → "Unknown"). */
  labelForUser: (userId?: string | null) => string;
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
    } catch {
      /* fall through */
    }
  }
  return null;
}

// ---------- mappers ----------
type DbTask = {
  id: string; title: string; description: string; assignee: string; assignee_avatar: string | null;
  assignee_user_id: string | null; owner_id: string;
  estimated_minutes: number; reminder_before_minutes: number; priority: Priority; status: TaskStatus;
  remaining_seconds: number; spent_seconds: number; is_running: boolean;
  day_key: string; archived_at: string | null; final_spent_seconds: number | null;
  created_at: string; seen_at: string | null;
};
function fromDbTask(r: DbTask): Task {
  return {
    id: r.id, title: r.title, description: r.description ?? "", assignee: r.assignee,
    assigneeAvatar: r.assignee_avatar ?? undefined,
    assigneeUserId: r.assignee_user_id ?? undefined,
    ownerId: r.owner_id,
    estimatedMinutes: r.estimated_minutes, reminderBeforeMinutes: r.reminder_before_minutes,
    priority: r.priority, status: r.status,
    remainingSeconds: r.remaining_seconds, spentSeconds: r.spent_seconds,
    isRunning: r.is_running, createdAt: r.created_at, dayKey: r.day_key,
    archivedAt: r.archived_at ?? undefined,
    finalSpentSeconds: r.final_spent_seconds ?? undefined,
    seenAt: r.seen_at ?? undefined,
  };
}
function toDbTaskPatch(p: Partial<Task>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.title !== undefined) out.title = p.title;
  if (p.description !== undefined) out.description = p.description;
  if (p.assignee !== undefined) out.assignee = p.assignee;
  if (p.assigneeAvatar !== undefined) out.assignee_avatar = p.assigneeAvatar ?? null;
  if ("assigneeUserId" in p) out.assignee_user_id = p.assigneeUserId ?? null;
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
  if ("seenAt" in p) out.seen_at = p.seenAt ?? null;
  return out;
}

type DbNote = {
  id: string; title: string; content: string; priority: NotePriority;
  remind_at: string | null; done: boolean; created_at: string;
  owner_id: string; assignee_user_id: string | null;
};
function fromDbNote(r: DbNote): Note {
  return {
    id: r.id, title: r.title, content: r.content ?? "", priority: r.priority,
    remindAt: r.remind_at ?? undefined, createdAt: r.created_at, done: r.done,
    ownerId: r.owner_id, assigneeUserId: r.assignee_user_id ?? undefined,
  };
}
function toDbNotePatch(p: Partial<Note>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.title !== undefined) out.title = p.title;
  if (p.content !== undefined) out.content = p.content;
  if (p.priority !== undefined) out.priority = p.priority;
  if ("remindAt" in p) out.remind_at = p.remindAt ?? null;
  if (p.done !== undefined) out.done = p.done;
  if ("assigneeUserId" in p) out.assignee_user_id = p.assigneeUserId ?? null;
  return out;
}

type DbAlarm = { id: string; title: string; time: string; repeat: Alarm["repeat"]; owner_id: string; assignee_user_id: string | null };
function fromDbAlarm(r: DbAlarm): Alarm {
  return { id: r.id, title: r.title, time: r.time, repeat: r.repeat, ownerId: r.owner_id, assigneeUserId: r.assignee_user_id ?? undefined };
}

type DbConnection = { id: string; user_a: string; user_b: string; created_at: string };
function fromDbConnection(r: DbConnection): Connection {
  return { id: r.id, userA: r.user_a, userB: r.user_b, createdAt: r.created_at };
}

type DbInvite = { id: string; code: string; inviter_id: string; expires_at: string; used_by: string | null; used_at: string | null; created_at: string };
function fromDbInvite(r: DbInvite): ConnectionInvite {
  return { id: r.id, code: r.code, inviterId: r.inviter_id, expiresAt: r.expires_at, usedBy: r.used_by, usedAt: r.used_at, createdAt: r.created_at };
}

type DbProfile = { id: string; email: string | null; display_name: string | null; avatar_url: string | null };
function fromDbProfile(r: DbProfile): Profile {
  return { id: r.id, email: r.email, displayName: r.display_name, avatarUrl: r.avatar_url };
}

// fire-and-forget; logs but never throws into UI
function bg<T>(p: PromiseLike<T>) {
  Promise.resolve(p).then(
    () => {},
    (e) => console.warn("[finishit cloud sync]", e),
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    tasks: [], alarms: [], notes: [], connections: [], invites: [], profiles: {},
    currentUserId: null, hydrated: false,
  });
  const userIdRef = useRef<string | null>(null);

  // Hydrate: localStorage first (instant), then Supabase if signed in (authoritative)
  useEffect(() => {
    const cached = loadPersisted();
    setState((s) => ({
      ...s,
      tasks: cached?.tasks ?? [],
      alarms: cached?.alarms ?? [],
      notes: cached?.notes ?? [],
      hydrated: true,
    }));

    let cancelled = false;

    async function fetchProfilesForIds(ids: string[]) {
      const unique = Array.from(new Set(ids.filter(Boolean)));
      if (unique.length === 0) return {} as Record<string, Profile>;
      const { data } = await supabase.from("profiles").select("*").in("id", unique);
      const map: Record<string, Profile> = {};
      (data ?? []).forEach((p) => { map[p.id] = fromDbProfile(p as DbProfile); });
      return map;
    }

    async function loadFromCloud() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      userIdRef.current = user?.id ?? null;
      if (!user || cancelled) return;

      const [tasksRes, notesRes, alarmsRes, connsRes, invitesRes] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: true }),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("alarms").select("*").order("created_at", { ascending: true }),
        supabase.from("connections").select("*"),
        supabase.from("connection_invites").select("*").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;

      const tasks = (tasksRes.data ?? []).map((r) => fromDbTask(r as DbTask));
      const notes = (notesRes.data ?? []).map((r) => fromDbNote(r as DbNote));
      const alarms = (alarmsRes.data ?? []).map((r) => fromDbAlarm(r as DbAlarm));
      const connections = (connsRes.data ?? []).map((r) => fromDbConnection(r as DbConnection));
      const invites = (invitesRes.data ?? []).map((r) => fromDbInvite(r as DbInvite));

      const profileIds = new Set<string>([user.id]);
      connections.forEach((c) => { profileIds.add(c.userA); profileIds.add(c.userB); });
      tasks.forEach((t) => { if (t.ownerId) profileIds.add(t.ownerId); if (t.assigneeUserId) profileIds.add(t.assigneeUserId); });
      notes.forEach((n) => { if (n.ownerId) profileIds.add(n.ownerId); if (n.assigneeUserId) profileIds.add(n.assigneeUserId); });
      alarms.forEach((a) => { if (a.ownerId) profileIds.add(a.ownerId); if (a.assigneeUserId) profileIds.add(a.assigneeUserId); });
      const profiles = await fetchProfilesForIds(Array.from(profileIds));

      if (cancelled) return;
      setState({
        tasks, notes, alarms, connections, invites, profiles,
        currentUserId: user.id, hydrated: true,
      });
    }
    loadFromCloud().catch((e) => console.warn("[finishit cloud hydrate]", e));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      userIdRef.current = session?.user?.id ?? null;
      if (event === "SIGNED_IN") loadFromCloud().catch(() => {});
      if (event === "SIGNED_OUT") {
        setState({
          tasks: [], alarms: [], notes: [], connections: [], invites: [], profiles: {},
          currentUserId: null, hydrated: true,
        });
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Realtime subscriptions (only when signed in). Keyed by user id so we re-subscribe on sign-in.
  useEffect(() => {
    if (!state.currentUserId) return;
    const me = state.currentUserId;
    const channel = supabase
      .channel(`finishit-${me}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        setState((s) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
          }
          const row = fromDbTask(payload.new as DbTask);
          const exists = s.tasks.some((t) => t.id === row.id);
          // surface incoming assignment from someone else
          if (!exists && row.assigneeUserId === me && row.ownerId !== me) {
            toast(`New task assigned to you: ${row.title}`);
          }
          const tasks = exists ? s.tasks.map((t) => (t.id === row.id ? row : t)) : [...s.tasks, row];
          return { ...s, tasks };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (payload) => {
        setState((s) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...s, notes: s.notes.filter((n) => n.id !== id) };
          }
          const row = fromDbNote(payload.new as DbNote);
          const exists = s.notes.some((n) => n.id === row.id);
          const notes = exists ? s.notes.map((n) => (n.id === row.id ? row : n)) : [row, ...s.notes];
          return { ...s, notes };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alarms" }, (payload) => {
        setState((s) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...s, alarms: s.alarms.filter((a) => a.id !== id) };
          }
          const row = fromDbAlarm(payload.new as DbAlarm);
          const exists = s.alarms.some((a) => a.id === row.id);
          const alarms = exists ? s.alarms.map((a) => (a.id === row.id ? row : a)) : [...s.alarms, row];
          return { ...s, alarms };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, async (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          setState((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }));
          return;
        }
        const row = fromDbConnection(payload.new as DbConnection);
        // fetch the new partner's profile
        const otherId = row.userA === me ? row.userB : row.userA;
        const { data } = await supabase.from("profiles").select("*").eq("id", otherId).maybeSingle();
        setState((s) => ({
          ...s,
          connections: s.connections.some((c) => c.id === row.id) ? s.connections : [...s.connections, row],
          profiles: data ? { ...s.profiles, [data.id]: fromDbProfile(data as DbProfile) } : s.profiles,
        }));
        toast.success("New connection added");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [state.currentUserId]);

  // Persist local cache (primary + rolling backup)
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const payload = JSON.stringify({ tasks: state.tasks, alarms: state.alarms, notes: state.notes });
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      /* storage unavailable */
    }
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

  const api = useMemo<StoreApi>(() => {
    const me = state.currentUserId;
    const labelForUser = (userId?: string | null) => {
      if (!userId) return "—";
      if (userId === me) return "You";
      const p = state.profiles[userId];
      return p?.displayName || p?.email || "Unknown";
    };
    const assignableUsers: { id: string; label: string }[] = [];
    if (me) {
      assignableUsers.push({ id: me, label: "You" });
      state.connections.forEach((c) => {
        const otherId = c.userA === me ? c.userB : c.userA;
        const p = state.profiles[otherId];
        assignableUsers.push({ id: otherId, label: p?.displayName || p?.email || otherId.slice(0, 8) });
      });
    }

    return {
      ...state,
      assignableUsers,
      labelForUser,

      addTask: (t) => {
        const id = crypto.randomUUID();
        const dayKey = t.dayKey ?? todayKey();
        const ownerId = me ?? undefined;
        const newTask: Task = {
          id,
          createdAt: new Date().toISOString(),
          dayKey,
          remainingSeconds: t.estimatedMinutes * 60,
          spentSeconds: 0,
          isRunning: false,
          ownerId,
          title: t.title, description: t.description, assignee: t.assignee,
          assigneeAvatar: t.assigneeAvatar,
          assigneeUserId: t.assigneeUserId,
          estimatedMinutes: t.estimatedMinutes,
          reminderBeforeMinutes: t.reminderBeforeMinutes, priority: t.priority,
          status: t.status,
        };
        setState((s) => ({ ...s, tasks: [...s.tasks, newTask] }));
        if (me) {
          bg(supabase.from("tasks").insert({
            id, user_id: me, owner_id: me,
            title: newTask.title, description: newTask.description,
            assignee: newTask.assignee, assignee_avatar: newTask.assigneeAvatar ?? null,
            assignee_user_id: newTask.assigneeUserId ?? null,
            estimated_minutes: newTask.estimatedMinutes,
            reminder_before_minutes: newTask.reminderBeforeMinutes,
            priority: newTask.priority, status: newTask.status,
            remaining_seconds: newTask.remainingSeconds, spent_seconds: newTask.spentSeconds,
            is_running: newTask.isRunning, day_key: newTask.dayKey,
          }));
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
        if (me) bg(supabase.from("tasks").delete().eq("id", id));
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
      markTaskSeen: (id) => {
        const t = state.tasks.find((x) => x.id === id);
        if (!t || t.seenAt) return;
        const seenAt = new Date().toISOString();
        updateLocalTask(id, { seenAt });
        pushTask(id, { seenAt });
      },

      addAlarm: (a) => {
        const id = crypto.randomUUID();
        const alarm: Alarm = { id, ownerId: me ?? undefined, ...a };
        setState((s) => ({ ...s, alarms: [...s.alarms, alarm] }));
        if (me) {
          bg(supabase.from("alarms").insert({
            id, user_id: me, owner_id: me,
            title: a.title, time: a.time, repeat: a.repeat,
            assignee_user_id: a.assigneeUserId ?? null,
          }));
        }
      },
      removeAlarm: (id) => {
        setState((s) => ({ ...s, alarms: s.alarms.filter((a) => a.id !== id) }));
        if (me) bg(supabase.from("alarms").delete().eq("id", id));
      },

      addNote: (n) => {
        const id = crypto.randomUUID();
        const note: Note = { id, createdAt: new Date().toISOString(), done: false, ownerId: me ?? undefined, ...n };
        setState((s) => ({ ...s, notes: [note, ...s.notes] }));
        if (me) {
          bg(supabase.from("notes").insert({
            id, user_id: me, owner_id: me,
            title: note.title, content: note.content,
            priority: note.priority, remind_at: note.remindAt ?? null,
            done: note.done, assignee_user_id: note.assigneeUserId ?? null,
          }));
        }
      },
      updateNote: (id, patch) => {
        setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (me) bg(supabase.from("notes").update(toDbNotePatch(patch) as any).eq("id", id));
      },
      removeNote: (id) => {
        setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
        if (me) bg(supabase.from("notes").delete().eq("id", id));
      },

      createInvite: async () => {
        if (!me) { toast.error("Sign in to invite"); return null; }
        // 6-char alphanumeric, easy to type
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
        const { data, error } = await supabase.from("connection_invites").insert({
          inviter_id: me, code,
        }).select("*").single();
        if (error || !data) { toast.error(error?.message ?? "Failed to create invite"); return null; }
        const invite = fromDbInvite(data as DbInvite);
        setState((s) => ({ ...s, invites: [invite, ...s.invites] }));
        return invite;
      },
      redeemInvite: async (code) => {
        if (!me) { toast.error("Sign in to connect"); return false; }
        const cleaned = code.trim().toUpperCase();
        const { error } = await supabase.rpc("redeem_invite", { _code: cleaned });
        if (error) { toast.error(error.message); return false; }
        toast.success("Connected!");
        // Realtime will push the new connection row, but refresh as a fallback
        const { data: conns } = await supabase.from("connections").select("*");
        const connections = (conns ?? []).map((r) => fromDbConnection(r as DbConnection));
        const newIds = new Set<string>();
        connections.forEach((c) => { newIds.add(c.userA); newIds.add(c.userB); });
        const missing = Array.from(newIds).filter((id) => !state.profiles[id]);
        let added: Record<string, Profile> = {};
        if (missing.length) {
          const { data: profs } = await supabase.from("profiles").select("*").in("id", missing);
          (profs ?? []).forEach((p) => { added[p.id] = fromDbProfile(p as DbProfile); });
        }
        setState((s) => ({ ...s, connections, profiles: { ...s.profiles, ...added } }));
        return true;
      },
      removeConnection: async (id) => {
        const prev = state.connections;
        setState((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }));
        const { error } = await supabase.from("connections").delete().eq("id", id);
        if (error) {
          toast.error(error.message);
          setState((s) => ({ ...s, connections: prev }));
        } else {
          toast.success("Connection removed");
        }
      },
      updateMyProfile: async (patch) => {
        if (!me) return;
        const dbPatch: Record<string, unknown> = {};
        if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
        const { data, error } = await supabase.from("profiles").update(dbPatch).eq("id", me).select("*").single();
        if (error || !data) { toast.error(error?.message ?? "Failed to save"); return; }
        const profile = fromDbProfile(data as DbProfile);
        setState((s) => ({ ...s, profiles: { ...s.profiles, [me]: profile } }));
      },
    };
  }, [state]);

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
