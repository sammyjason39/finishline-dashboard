import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/finishit/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Finishit!" },
      { name: "description", content: "Sign in to Finishit! and make your team's work visible." },
    ],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created — you're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <Link to="/" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {mode === "signin" ? "Welcome back." : "Create your account."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to see your team's work board."
            : "Start with your work email — it takes a moment."}
        </p>

        <form onSubmit={submit} className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {mode === "signin" ? "Log in" : "Create account"}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">or</span></div>
            </div>

            <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={google}>
              <GoogleIcon /> Continue with Google
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button type="button" onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))} className="font-medium text-primary hover:underline">
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Built for teams who want less delay and more done.
        </p>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.7H12z"/>
    </svg>
  );
}
