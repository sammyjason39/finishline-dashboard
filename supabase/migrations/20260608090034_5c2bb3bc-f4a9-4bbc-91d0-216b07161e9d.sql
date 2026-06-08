
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, display_name)
  SELECT id, email, split_part(COALESCE(email,''), '@', 1) FROM auth.users
  ON CONFLICT (id) DO NOTHING;

-- ============ CONNECTIONS ============
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_order CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own connections" ON public.connections
  FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Delete own connections" ON public.connections
  FOR DELETE TO authenticated USING (auth.uid() IN (user_a, user_b));

CREATE OR REPLACE FUNCTION public.are_connected(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a = b OR EXISTS (
    SELECT 1 FROM public.connections
    WHERE user_a = LEAST(a,b) AND user_b = GREATEST(a,b)
  );
$$;
GRANT EXECUTE ON FUNCTION public.are_connected(uuid, uuid) TO authenticated;

-- ============ INVITES ============
CREATE TABLE public.connection_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.connection_invites TO authenticated;
GRANT ALL ON public.connection_invites TO service_role;
ALTER TABLE public.connection_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own invites" ON public.connection_invites
  FOR SELECT TO authenticated USING (auth.uid() = inviter_id);
CREATE POLICY "Create own invites" ON public.connection_invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Delete own invites" ON public.connection_invites
  FOR DELETE TO authenticated USING (auth.uid() = inviter_id);

CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inv record;
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _conn_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.connection_invites
    WHERE code = _code AND used_by IS NULL AND expires_at > now()
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired code'; END IF;
  IF _inv.inviter_id = _me THEN RAISE EXCEPTION 'Cannot redeem your own code'; END IF;
  _a := LEAST(_inv.inviter_id, _me);
  _b := GREATEST(_inv.inviter_id, _me);
  INSERT INTO public.connections (user_a, user_b) VALUES (_a, _b)
    ON CONFLICT (user_a, user_b) DO UPDATE SET created_at = public.connections.created_at
    RETURNING id INTO _conn_id;
  UPDATE public.connection_invites SET used_by = _me, used_at = now() WHERE id = _inv.id;
  RETURN _conn_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;

-- ============ TASKS ============
ALTER TABLE public.tasks
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN seen_at timestamptz;
UPDATE public.tasks SET owner_id = user_id WHERE owner_id IS NULL;
ALTER TABLE public.tasks ALTER COLUMN owner_id SET NOT NULL;

DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
CREATE POLICY "View tasks own/assigned/connected" ON public.tasks
  FOR SELECT TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Insert tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (owner_id = auth.uid() OR public.are_connected(auth.uid(), owner_id))
  );
CREATE POLICY "Update tasks own/connected" ON public.tasks
  FOR UPDATE TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Delete tasks own/connected" ON public.tasks
  FOR DELETE TO authenticated USING (
    auth.uid() = owner_id OR public.are_connected(auth.uid(), owner_id)
  );

-- ============ NOTES ============
ALTER TABLE public.notes
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.notes SET owner_id = user_id WHERE owner_id IS NULL;
ALTER TABLE public.notes ALTER COLUMN owner_id SET NOT NULL;

DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
CREATE POLICY "View notes own/assigned/connected" ON public.notes
  FOR SELECT TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Insert notes" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (owner_id = auth.uid() OR public.are_connected(auth.uid(), owner_id))
  );
CREATE POLICY "Update notes own/connected" ON public.notes
  FOR UPDATE TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Delete notes own/connected" ON public.notes
  FOR DELETE TO authenticated USING (
    auth.uid() = owner_id OR public.are_connected(auth.uid(), owner_id)
  );

-- ============ ALARMS ============
ALTER TABLE public.alarms
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.alarms SET owner_id = user_id WHERE owner_id IS NULL;
ALTER TABLE public.alarms ALTER COLUMN owner_id SET NOT NULL;

DROP POLICY IF EXISTS "Users manage own alarms" ON public.alarms;
CREATE POLICY "View alarms own/assigned/connected" ON public.alarms
  FOR SELECT TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Insert alarms" ON public.alarms
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (owner_id = auth.uid() OR public.are_connected(auth.uid(), owner_id))
  );
CREATE POLICY "Update alarms own/connected" ON public.alarms
  FOR UPDATE TO authenticated USING (
    auth.uid() = owner_id
    OR auth.uid() = assignee_user_id
    OR public.are_connected(auth.uid(), owner_id)
  );
CREATE POLICY "Delete alarms own/connected" ON public.alarms
  FOR DELETE TO authenticated USING (
    auth.uid() = owner_id OR public.are_connected(auth.uid(), owner_id)
  );

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_invites;
