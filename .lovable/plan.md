## Add Edit functionality to Tasks and Notes

### Tasks (TaskCard)
- In the existing 3-dot dropdown menu (visible on hover/focus on every card), add an **Edit** menu item above **Delete task**.
- Hide the Edit item when `task.status === "finished"` (only Delete remains for finished cards), per request.
- Clicking Edit opens an `EditTaskModal` prefilled with the task's current values. Save calls `updateTask(id, patch)` from the store; Cancel closes without changes.

### EditTaskModal
- New component `src/components/finishit/EditTaskModal.tsx`, adapted from `AddTaskModal`. Fields: title, description, assignee, priority, estimated minutes, reminder before minutes, status, scheduled date (`dayKey`).
- Single dialog instance owned by `TaskCard` (kept simple; one modal per card mounts only when open).
- On submit: build a `Partial<Task>` patch (only changed fields is fine, but sending the full set is safe too) and call `updateTask`. Toast "Task updated".

### Notes (NoteRow on `/notes`)
- Add an Edit (pencil) icon button next to the existing Check/Reopen and Delete buttons.
- Edit toggles the row into an inline editor: Title input, Content textarea, Priority select, Remind date popover (same widgets as the create form). Save / Cancel buttons.
- On Save call `updateNote(id, patch)` (already exposed by the store). Toast "Note updated".
- Inline edit avoids a new modal and matches the lightweight feel of the notes page.

### Out of scope
- No backend/schema changes — `updateTask` and `updateNote` already persist via the store.
- No changes to permissions; the existing RLS already allows owners and connected collaborators to update tasks.
- No edit on finished task cards (only Delete remains there).
