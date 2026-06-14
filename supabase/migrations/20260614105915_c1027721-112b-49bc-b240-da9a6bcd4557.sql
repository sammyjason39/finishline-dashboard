
-- 1) Profiles: restrict SELECT to self + connected users (was USING (true))
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable to self and connections"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.connections c
    WHERE (c.user_a = LEAST(auth.uid(), profiles.id) AND c.user_b = GREATEST(auth.uid(), profiles.id))
  )
);

-- 2) Tighten INSERT policies so a user cannot create rows owned by a connected user.
DROP POLICY IF EXISTS "Insert tasks" ON public.tasks;
CREATE POLICY "Insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() = owner_id);

DROP POLICY IF EXISTS "Insert notes" ON public.notes;
CREATE POLICY "Insert notes"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() = owner_id);

DROP POLICY IF EXISTS "Insert alarms" ON public.alarms;
CREATE POLICY "Insert alarms"
ON public.alarms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() = owner_id);

-- 3) Lock down trigger-only SECURITY DEFINER functions so authenticated users can't call them directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 4) Realtime authorization: only allow subscribing to one's own private channel "finishit-<uid>".
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finishit users can read their own realtime channel" ON realtime.messages;
CREATE POLICY "Finishit users can read their own realtime channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING ( realtime.topic() = ('finishit-' || auth.uid()::text) );

DROP POLICY IF EXISTS "Finishit users can write to their own realtime channel" ON realtime.messages;
CREATE POLICY "Finishit users can write to their own realtime channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK ( realtime.topic() = ('finishit-' || auth.uid()::text) );
