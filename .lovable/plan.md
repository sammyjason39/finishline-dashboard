## Goal
Disable the Team view so the app focuses on the individual experience for now.

## Changes
1. **Remove Team nav entry** in `src/components/finishit/AppShell.tsx` so users can't navigate to `/team`.
2. **Delete the team route file** `src/routes/_authenticated/team.tsx` (route tree regenerates automatically).
3. **Sanity check** other references to `/team` (e.g. dashboard links, landing copy) and remove or redirect them.
4. Keep all individual flows untouched: Dashboard, Daily Memory, timers, alarms, auth.

## Out of scope
- No changes to data model, auth, or individual dashboard behavior.
- Team feature can be re-enabled later by restoring the route file and nav entry.