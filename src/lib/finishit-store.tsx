import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
}

export interface Alarm {
  id: string;
  title: string;
  time: string;
  repeat: "none" | "daily" | "weekdays";
}

interface State {
  tasks: Task[];
  alarms: Alarm[];
  hydrated: boolean;
}

interface StoreApi extends State {
  addTask: (t: Omit<Task, "id" | "createdAt" | "remainingSeconds" | "spentSeconds" | "isRunning" | "dayKey"> & Partial<Pick<Task, "dayKey">>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  startTask: (id: string) => void;
  pauseTask: (id: string) => void;
  finishTask: (id: string) => void;
  moveToTomorrow: (id: string) => void;
  removeTask: (id: string) => void;
  addAlarm: (a: Omit<Alarm, "id">) => void;
  removeAlarm: (id: string) => void;
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

const sampleTasks = (): Task[] => {
  const t = todayKey();
  const y = yesterdayKey();
  const mk = (over: Partial<Task>): Task => ({
    id: crypto.randomUUID(),
    title: "",
    description: "",
    assignee: "You",
    estimatedMinutes: 30,
    reminderBeforeMinutes: 10,
    priority: "medium",
    status: "not-started",
    remainingSeconds: 30 * 60,
    spentSeconds: 0,
    isRunning: false,
    createdAt: new Date().toISOString(),
    dayKey: t,
    ...over,
  });
  return [
    mk({ title: "Write AI campaign script", description: "Draft hooks + 3 ad variations for next launch.", assignee: "Aisha", estimatedMinutes: 45, remainingSeconds: 45 * 60, priority: "high", status: "ongoing", isRunning: true, spentSeconds: 12 * 60 }),
    mk({ title: "Review client proposal", description: "Final pass on pricing section before sending.", assignee: "Daniel", estimatedMinutes: 30, remainingSeconds: 18 * 60, spentSeconds: 12 * 60, status: "ongoing" }),
    mk({ title: "Edit webinar poster", description: "Match new brand palette + export sizes.", assignee: "Mira", estimatedMinutes: 25, remainingSeconds: 25 * 60, priority: "low", status: "not-started" }),
    mk({ title: "Follow up invoice", description: "Ping accounting on overdue payment.", assignee: "You", estimatedMinutes: 10, remainingSeconds: 10 * 60, priority: "medium", status: "waiting" }),
    mk({ title: "Research new AI tool", description: "Evaluate 3 alternatives to current stack.", assignee: "Kemi", estimatedMinutes: 40, remainingSeconds: 40 * 60, status: "not-started" }),
    mk({ title: "Prepare meeting deck", description: "10 slides for Friday strategy sync.", assignee: "Daniel", estimatedMinutes: 60, remainingSeconds: 0, spentSeconds: 58 * 60, status: "finished", priority: "high" }),
    mk({ dayKey: y, title: "Q3 retro notes", description: "Summarize team takeaways.", assignee: "You", estimatedMinutes: 30, spentSeconds: 32 * 60, remainingSeconds: 0, status: "finished" }),
    mk({ dayKey: y, title: "Onboarding doc rewrite", description: "Needs final review.", assignee: "Mira", estimatedMinutes: 60, spentSeconds: 35 * 60, remainingSeconds: 25 * 60, status: "ongoing" }),
  ];
};

const STORAGE_KEY = "finishit:v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  // Start with empty state on both server and client to avoid hydration mismatch
  const [state, setState] = useState<State>({ tasks: [], alarms: [], hydrated: false });

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({ tasks: parsed.tasks ?? [], alarms: parsed.alarms ?? [], hydrated: true });
        return;
      }
    } catch {}
    setState({
      tasks: sampleTasks(),
      alarms: [{ id: crypto.randomUUID(), title: "Daily wrap-up", time: "17:30", repeat: "weekdays" }],
      hydrated: true,
    });
  }, []);

  // Persist after hydration
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks, alarms: state.alarms }));
    } catch {}
  }, [state]);

  // Tick timers
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!s.hydrated) return s;
        let changed = false;
        const tasks = s.tasks.map((t) => {
          if (!t.isRunning) return t;
          changed = true;
          const remaining = Math.max(0, t.remainingSeconds - 1);
          if (remaining === 0) return { ...t, remainingSeconds: 0, spentSeconds: t.spentSeconds + 1, isRunning: false };
          return { ...t, remainingSeconds: remaining, spentSeconds: t.spentSeconds + 1 };
        });
        return changed ? { ...s, tasks } : s;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const api = useMemo<StoreApi>(() => ({
    ...state,
    addTask: (t) => setState((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          dayKey: t.dayKey ?? todayKey(),
          remainingSeconds: t.estimatedMinutes * 60,
          spentSeconds: 0,
          isRunning: false,
          ...t,
        } as Task,
      ],
    })),
    updateTask: (id, patch) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    startTask: (id) => setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, isRunning: true, status: "ongoing" as TaskStatus } : t)),
    })),
    pauseTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, isRunning: false } : t)) })),
    finishTask: (id) => setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, isRunning: false, status: "finished" as TaskStatus } : t)),
    })),
    moveToTomorrow: (id) => setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, isRunning: false, dayKey: tomorrowKey(), status: "not-started" as TaskStatus } : t)),
    })),
    removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    addAlarm: (a) => setState((s) => ({ ...s, alarms: [...s.alarms, { id: crypto.randomUUID(), ...a }] })),
    removeAlarm: (id) => setState((s) => ({ ...s, alarms: s.alarms.filter((a) => a.id !== id) })),
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
