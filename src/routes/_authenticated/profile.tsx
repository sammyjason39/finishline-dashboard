import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/profile";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Edit profile · Finishit!" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { email, displayName, avatarUrl, updateDisplayName, uploadAvatar, removeAvatar, loading } = useProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setName(displayName); }, [displayName]);

  const initials = (name || email || "YO").slice(0, 2).toUpperCase();

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) toast.error(error);
    else toast.success("Photo updated");
  };

  const onSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name can't be empty.");
      return;
    }
    setSavingName(true);
    const { error } = await updateDisplayName(trimmed);
    setSavingName(false);
    if (error) toast.error(error);
    else toast.success("Profile saved");
  };

  const onRemovePhoto = async () => {
    const { error } = await removeAvatar();
    if (error) toast.error(error);
    else toast.success("Photo removed");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update how you appear across Finishit!.</p>

        <div className="mt-6 rounded-xl border border-border bg-background p-6">
          <div className="flex items-center gap-5">
            <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {uploading ? (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
                  <Camera className="mr-1.5 h-4 w-4" /> {avatarUrl ? "Change photo" : "Upload photo"}
                </Button>
                {avatarUrl ? (
                  <Button type="button" variant="ghost" size="sm" onClick={onRemovePhoto} disabled={uploading}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email ?? ""} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                disabled={loading}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={onSaveName} disabled={savingName || loading || name.trim() === displayName.trim()}>
                {savingName ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
