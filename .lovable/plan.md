## Delete task via three-dots menu

### Steps
1. **`src/lib/finishit-store.tsx`**: Add `deleteTask: (id: string) => void` that filters the task out of `tasks`.
2. **`src/components/finishit/TaskCard.tsx`**: Wrap the `MoreHorizontal` button in a `DropdownMenu` (shadcn). Menu item "Delete task" (destructive styling, Trash2 icon) calls `deleteTask(task.id)` and shows a toast. Keep button always visible on touch but `opacity-0 group-hover:opacity-100` preserved.

No backend changes (local store).