# Plan: Connection 1-on-1 Assignment

Asisten kamu bisa bikin akun sendiri, connect ke akun kamu via invite code, lalu kalian berdua bisa saling assign task, edit, set reminder, dan lihat insight masing-masing.

## Konsep

- Setiap user punya akun sendiri (sudah ada).
- User bisa generate **invite code** (6-digit) yang berlaku 24 jam.
- User lain masukin code itu → terbentuk **connection** dua arah.
- Connection bersifat 1-on-1 multipel: kamu bisa connect ke beberapa orang (asisten, partner, dll), tapi tiap link tetap pairwise.
- Saat bikin/edit task atau note, ada dropdown "Assign to" yang berisi: diri sendiri + semua connections.
- Task milik orang lain yang di-assign ke kamu muncul di dashboard kamu, dan sebaliknya.

## Perubahan Database (Lovable Cloud)

**Tabel baru:**
- `connections` — pasangan `user_a` + `user_b` (unik, urutan ter-normalize). Status: `active`.
- `connection_invites` — kode invite milik inviter, expired_at, used_by.

**Modifikasi tabel:**
- `tasks`: tambah `owner_id` (siapa yang bikin), `assignee_user_id` (siapa yang harus ngerjain — bisa null kalau assignee external/teks bebas). Field `assignee` teks tetap dipertahankan untuk backward-compat.
- `notes` & `alarms`: tambah `assignee_user_id` (nullable) supaya asisten bisa bikinin reminder untuk kamu.

**RLS (Row Level Security):**
- User bisa baca/tulis row kalau dia `owner_id`, ATAU `assignee_user_id`, ATAU connected dengan owner via tabel `connections`.
- Pakai security-definer function `are_connected(uid_a, uid_b)` untuk hindari recursive RLS.

## Perubahan UI

**Page baru `/connections`:**
- Tombol "Generate invite code" → tampilin code 6-digit + copy button.
- Input "Enter code from someone" → connect.
- List active connections (avatar/email, tombol disconnect).
- Link di sidebar (icon Users).

**AddTaskModal & Notes form:**
- Field "Assigned to" diganti dari `Input` teks → `Select` berisi: "You" + tiap connection (by email/display name) + opsi "Other (free text)".

**Dashboard / Upcoming / Insight:**
- Query disesuaikan: tampilkan task di mana `assignee_user_id = me` ATAU `owner_id = me`.
- Tiap card kasih badge kecil "Assigned by [nama]" kalau owner ≠ me, atau "Assigned to [nama]" kalau owner = me tapi assignee orang lain.

**Notifikasi in-app:**
- Toast saat task di-assign ke kamu (via Supabase realtime subscription pada tabel tasks).
- Badge angka di sidebar nav item yang punya assignment baru / belum dibaca (pakai field `seen_at` di task).

**Profile/Settings:**
- Tampilin display name (editable di tabel `profiles`) supaya orang lain lihat nama kamu, bukan email.

## Migrasi data lokal

User lama yang punya data di localStorage tetap aman — tabel existing nggak di-drop, cuma di-extend. `owner_id` di-backfill dari `user_id` yang ada.

## Catatan teknis

- Connection 1-on-1 tapi user boleh punya banyak connection berbeda (asisten + partner + co-founder, dll).
- Asisten yang sudah connect otomatis dapat full akses sesuai pilihan tadi (create, edit, delete task; bikin alarm/note; lihat insight).
- Realtime subscription via `supabase.channel()` di `finishit-store` untuk push update saat assigner di device lain.
- Belum termasuk email notif — bisa ditambah nanti dengan Resend.

## Out of scope (sekarang)

- Granular permission per-connection (semua connection = full access).
- Group/team > 2 orang dalam satu shared board.
- Email notifications.
- Audit log siapa edit apa.

Approve plan ini untuk saya implement, atau kasih tau bagian yang mau diubah dulu.
