## Goal
Let users roll a finished task back to "ongoing" so they can keep working on it.

## Changes

1. **`src/lib/finishit-store.tsx`**
   - Add `reopenTask: (id: string) => void` to the store type and implementation.
   - Sets `status: "ongoing"`, `isRunning: false`, and keeps existing `spentSeconds`/`remainingSeconds` as-is (if `remainingSeconds` is 0, leave it — user can still continue tracking time).

2. **`src/components/finishit/TaskCard.tsx`**
   - When `task.status === "finished"`, show a "Reopen" button (with a rotate-left icon) that calls `reopenTask(task.id)`.
   - Keep the existing "Tomorrow" button available for finished tasks too.

## Notes
- No backend/schema changes; finishit store is local state.
- History page (`history.tsx`) still reads finished tasks from past days — reopening only applies to today's finished items via the dashboard card. (Let me know if you also want reopen from the history view.)
