## Replace preview card with image (light/dark)

Replace the mock "Today's Work Board" preview `<section>` in `src/routes/index.tsx` with the two uploaded images (light + dark variants), keeping the existing rounded corners and shadow.

### Steps

1. Upload both images as Lovable Assets:
   - `user-uploads://IMG_1_Bright.webp` → `src/assets/hero-light.webp.asset.json`
   - `user-uploads://IMG_2_Dark.webp` → `src/assets/hero-dark.webp.asset.json`

2. Edit `src/routes/index.tsx`:
   - Import both asset JSONs and `useTheme` is already imported.
   - Replace the entire `<section className="relative">…</section>` preview block with an `<img>` (or two — light shown by default, dark shown via `dark:` class) using:
     - `className="w-full aspect-[4/5] object-cover rounded-2xl shadow-xl shadow-primary/5"`
     - Show light image with `block dark:hidden`, dark image with `hidden dark:block`.
   - Remove now-unused `PreviewCard`, `StatusBadge`, `CheckCircle2` references from this file.

### Notes
- 4:5 vertical via `aspect-[4/5]`.
- Tailwind `dark:` variant handles theme switching (root `dark` class already toggled by ThemeProvider).
