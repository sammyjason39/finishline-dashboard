import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Calendar, ChevronDown, Moon, Sun, LayoutGrid, History, LogOut, User as UserIcon, CalendarDays, StickyNote } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/lib/profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-[color:var(--blue-soft)] text-primary hover:bg-[color:var(--blue-soft)] hover:text-primary" }}
      activeOptions={{ exact: false }}
    >
      {icon} {children}
    </Link>
  );
}

import logoAsset from "@/assets/finishit-logo.png.asset.json";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2", className)}>
      <img src={logoAsset.url} alt="Finishit logo" className="h-7 w-7 rounded-md object-contain" />
      <span className="text-[15px] font-bold tracking-tight text-foreground">Finishit<span className="text-primary">!</span></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email, displayName, avatarUrl } = useProfile();

  const initials = (displayName || email || "YO").slice(0, 2).toUpperCase();
  const firstName = displayName || (email ? email.split("@")[0] : "your");

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-[color:var(--mist)]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="hidden md:flex items-center gap-1 ml-2">
            <NavLink to="/dashboard" icon={<LayoutGrid className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink to="/upcoming" icon={<CalendarDays className="h-4 w-4" />}>Upcoming</NavLink>
            <NavLink to="/notes" icon={<StickyNote className="h-4 w-4" />}>Notes</NavLink>

          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">{today}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <button className="hidden lg:inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-muted">
              <span>{firstName}'s workflow</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={firstName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="truncate text-sm font-medium">{displayName || email || "—"}</div>
                  {displayName && email ? <div className="truncate text-xs text-muted-foreground">{email}</div> : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })} className="text-foreground">
                  <UserIcon className="mr-2 h-4 w-4" /> Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-foreground">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="md:hidden border-t border-border px-2 py-1.5 flex gap-1 overflow-x-auto">
          <NavLink to="/dashboard" icon={<LayoutGrid className="h-4 w-4" />}>Dashboard</NavLink>
          <NavLink to="/upcoming" icon={<CalendarDays className="h-4 w-4" />}>Upcoming</NavLink>
          <NavLink to="/notes" icon={<StickyNote className="h-4 w-4" />}>Notes</NavLink>

          
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
