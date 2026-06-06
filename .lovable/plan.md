## Add "Upcoming" column for scheduled future tasks

### Concept
Today's board has 4 status columns. Add a 5th column **"Upcoming"** for tasks scheduled to a future day. When that day arrives (task's `dayKey === today`), the task automatically appears in its status column (existing filter already does this).

### Changes

1. **`src/components/finishit/AddTaskModal.tsx`** — add a "Schedule for" date picker (shadcn `Calendar` in a `Popover`). Default = today. On submit, pass the chosen `dayKey` (YYYY-MM-DD) to `addTask`. The store already accepts `dayKey` in its input type.

2. **`src/routes/_authenticated/dashboard.tsx`**:
   - Add a 5th column `{ key: "upcoming", label: "Upcoming", hint: "Scheduled for later" }` rendered alongside the 4 status columns (grid becomes `xl:grid-cols-5`).
   - Filter: `tasks.filter(t => t.dayKey > today && t.status !== "finished")`.
   - Each card shows a small date label (e.g. "Tue, Jun 10") above the existing TaskCard, or pass a `scheduledFor` hint. Simplest: render a lightweight `ScheduledCard` with title, date, priority, and a "Move to today" + delete action — don't show the timer for not-yet-active days.

3. **`src/components/finishit/ScheduledCard.tsx`** (new) — compact card: status badge, title, scheduled date, priority, buttons: **Move to today** (sets `dayKey: today`) and the same three-dots delete menu used in TaskCard.

### Notes
- No store changes needed; `addTask` already takes optional `dayKey`, and the existing dashboard filter on `t.dayKey === today` automatically surfaces scheduled tasks on their day.
- History page is unaffected (filters by yesterday/last 7 days).