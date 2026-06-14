## Plan: Mobile-only Full Screen mode on task cards

Add a "Full Screen" button to each task card (except finished) that's visible only on phones (`sm:hidden`). It opens a phone-sized overlay so the user can leave the phone propped up as a big reminder display.

### Changes in `src/components/finishit/TaskCard.tsx`
1. Add `fullscreen` state and a "Full Screen" `Button` with the `Maximize2` icon, placed **before** the Pause/Start button. Hidden on `sm+` via `className="sm:hidden"`. Hidden when task is finished.
2. Render a fixed overlay (`fixed inset-0 z-[100] bg-background sm:hidden`) when `fullscreen` is true, containing:
   - Header: status badge + close (X) button
   - Big task title + description
   - Huge mono countdown (`text-7xl`) of `remainingSeconds`
   - Live/Paused indicator + spent time
   - Progress bar (same `pct` as card) with percentage label
   - Bottom action row: Pause/Start (toggles based on `isRunning`) and Finish (also closes overlay)
3. Request a screen Wake Lock while overlay is open (best-effort; release on close) so the phone screen stays on while showing the timer.

No changes to desktop/tablet layout or to other cards/notes.