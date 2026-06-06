import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  userId: string | null;
  email: string | null;
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type ProfileCtx = Profile & {
  loading: boolean;
  refresh: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error?: string }>;
  uploadAvatar: (file: File) => Promise<{ error?: string }>;
  removeAvatar: () => Promise<{ error?: string }>;
};

const Ctx = createContext<ProfileCtx | null>(null);

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) return null;
  return data.signedUrl;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Profile>({
    userId: null,
    email: null,
    displayName: "",
    avatarPath: null,
    avatarUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setState({ userId: null, email: null, displayName: "", avatarPath: null, avatarUrl: null });
      setLoading(false);
      return;
    }
    const meta = (user.user_metadata ?? {}) as { display_name?: string; avatar_path?: string };
    const path = meta.avatar_path ?? null;
    const url = await signedUrl(path);
    setState({
      userId: user.id,
      email: user.email ?? null,
      displayName: meta.display_name ?? (user.email ? user.email.split("@")[0] : ""),
      avatarPath: path,
      avatarUrl: url,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const updateDisplayName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) return { error: error.message };
    await load();
    return {};
  };

  const uploadAvatar = async (file: File) => {
    if (!state.userId) return { error: "Not signed in" };
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${state.userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) return { error: upErr.message };
    // Best-effort cleanup of previous file
    if (state.avatarPath && state.avatarPath !== path) {
      await supabase.storage.from("avatars").remove([state.avatarPath]);
    }
    const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_path: path } });
    if (metaErr) return { error: metaErr.message };
    await load();
    return {};
  };

  const removeAvatar = async () => {
    if (state.avatarPath) {
      await supabase.storage.from("avatars").remove([state.avatarPath]);
    }
    const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } });
    if (error) return { error: error.message };
    await load();
    return {};
  };

  return (
    <Ctx.Provider value={{ ...state, loading, refresh: load, updateDisplayName, uploadAvatar, removeAvatar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
