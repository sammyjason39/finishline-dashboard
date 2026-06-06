import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, ChevronDown, Moon, Sun, Users, LayoutGrid, History } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type ReactNode } from "react";

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

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/dashboard" className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-bold">F</span>
      <span className="text-[15px] font-bold tracking-tight text-foreground">Finishit<span className="text-primary">!</span></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-[color:var(--mist)]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="hidden md:flex items-center gap-1 ml-2">
            <NavLink to="/dashboard" icon={<LayoutGrid className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink to="/team" icon={<Users className="h-4 w-4" />}>Team</NavLink>
            <NavLink to="/history" icon={<History className="h-4 w-4" />}>Memory</NavLink>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">{today}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <button className="hidden lg:inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground hover:bg-muted">
              <span>Team · ConextLab</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
              YO
            </div>
          </div>
        </div>
        {/* mobile nav */}
        <div className="md:hidden border-t border-border px-2 py-1.5 flex gap-1 overflow-x-auto">
          <NavLink to="/dashboard" icon={<LayoutGrid className="h-4 w-4" />}>Dashboard</NavLink>
          <NavLink to="/team" icon={<Users className="h-4 w-4" />}>Team</NavLink>
          <NavLink to="/history" icon={<History className="h-4 w-4" />}>Memory</NavLink>
        </div>
        {/* avoid unused warning */}
        <span className="hidden">{pathname}</span>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
