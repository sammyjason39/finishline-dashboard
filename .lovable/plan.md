## Apa yang terjadi

Setelah login Google, browser di-redirect balik ke `/dashboard`. Pada redirect itu:

1. `_authenticated/route.tsx` panggil `supabase.auth.getUser()` di `beforeLoad` → OK, user dikenali, masuk dashboard.
2. Tapi di dalam app ada **dua** provider yang juga harus kenal user-nya: `StoreProvider` (tasks/notes/alarms) dan `ProfileProvider` (nama, avatar).
3. Saat keduanya mount, mereka langsung panggil `supabase.auth.getUser()`. Pada mount pertama setelah OAuth redirect, session belum selesai di-rehydrate dari storage → `getUser()` balas `null`.
4. Sesaat kemudian Supabase emit event `INITIAL_SESSION` (dengan user yang benar). Tapi listener kita hanya menangani `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED` — `INITIAL_SESSION` di-skip.
5. Akibatnya `currentUserId` tetap `null`, filter di Dashboard (`t.ownerId === currentUserId || ...`) buang semua task → tampak blank. Begitu user refresh, session sudah ada di storage, `getUser()` langsung balas user → semua jalan.

Ini juga kenapa nama / avatar kadang baru muncul setelah refresh.

## Yang akan diubah

Cukup di dua file, tidak menyentuh skema DB.

### 1. `src/lib/finishit-store.tsx`
- Hydrate via `supabase.auth.getSession()` (sinkron dari storage) sebagai sumber utama, bukan `getUser()` (yang network-bound dan bisa null sebentar).
- Listener `onAuthStateChange`: tangani juga `INITIAL_SESSION` dan `TOKEN_REFRESHED` — jalankan `loadFromCloud` kalau ada user dan `currentUserId` masih null.
- Guard: kalau `INITIAL_SESSION` datang dengan user yang sama, jangan re-fetch (hindari double load).

### 2. `src/lib/profile.tsx`
- Ganti pola "panggil `load()` di mount" dengan: subscribe dulu ke `onAuthStateChange`, lalu set state dari session-nya. Tangani `INITIAL_SESSION` agar profil ke-set di render pertama setelah OAuth.

### 3. (Kecil) `src/routes/_authenticated/dashboard.tsx`
- Tambah loading state ringan: kalau `hydrated === true` tapi `currentUserId === null` dan auth belum settle, tampilkan skeleton singkat alih-alih board kosong. Ini safety net visual sembari store hydrate.

## Yang TIDAK diubah
- Tidak menyentuh `_authenticated/route.tsx` (file managed Lovable).
- Tidak mengubah flow OAuth atau redirect URL.
- Tidak mengubah skema DB / RLS.

## Cara verifikasi
- Logout → login via Google → sampai di `/dashboard` task & nama langsung muncul tanpa refresh.
- Hard refresh `/dashboard` tetap normal.
- Sign out tetap clean (cache di-clear, redirect ke `/auth`).
