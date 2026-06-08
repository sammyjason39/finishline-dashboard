import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finishit/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/finishit-store";
import { useState } from "react";
import { Copy, UserPlus, Users, Trash2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/team")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team · Finishit!" },
      { name: "description", content: "Connect with collaborators and assign work to each other." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { connections, invites, profiles, currentUserId, createInvite, redeemInvite, removeConnection } = useStore();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const activeInvites = invites.filter((i) => !i.usedBy && new Date(i.expiresAt) > new Date());

  const onCreate = async () => {
    setCreating(true);
    await createInvite();
    setCreating(false);
  };

  const onRedeem = async () => {
    if (!code.trim()) { toast.error("Enter a code"); return; }
    setRedeeming(true);
    const ok = await redeemInvite(code);
    setRedeeming(false);
    if (ok) setCode("");
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect with an assistant or partner so they can create tasks, reminders, and notes for you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite someone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Generate a code, send it to your collaborator. They paste it on their Team page.</p>
              <Button onClick={onCreate} disabled={creating} className="w-full">
                <Sparkles className="h-4 w-4 mr-1" /> {creating ? "Generating…" : "Generate invite code"}
              </Button>
              {activeInvites.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Active codes</Label>
                  {activeInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                      <div>
                        <div className="font-mono text-base font-semibold tracking-widest">{inv.code}</div>
                        <div className="text-xs text-muted-foreground">
                          Expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => copy(inv.code)} aria-label="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Got a code?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Paste a code someone shared with you to connect.</p>
              <div className="grid gap-1.5">
                <Label htmlFor="code">Invite code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD23"
                  className="font-mono uppercase tracking-widest"
                  maxLength={12}
                />
              </div>
              <Button onClick={onRedeem} disabled={redeeming || !code.trim()} className="w-full">
                {redeeming ? "Connecting…" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Your connections</CardTitle>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No connections yet. Share an invite code to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((c) => {
                  const otherId = c.userA === currentUserId ? c.userB : c.userA;
                  const p = profiles[otherId];
                  const name = p?.displayName || p?.email || otherId.slice(0, 8);
                  const initials = (p?.displayName || p?.email || "??").slice(0, 2).toUpperCase();
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{name}</div>
                          {p?.email && p?.displayName && <div className="text-xs text-muted-foreground">{p.email}</div>}
                          <div className="text-xs text-muted-foreground">
                            Connected {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeConnection(c.id)} aria-label="Disconnect">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
