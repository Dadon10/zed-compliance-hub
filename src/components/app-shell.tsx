import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Upload, FileCheck2, Send, BarChart3, ScrollText, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/payroll", label: "Payroll Uploads", icon: Upload },
  { to: "/submissions", label: "Submissions", icon: Send },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/admin", label: "Admin", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r flex flex-col bg-surface-muted/30">
        <div className="h-16 border-b flex items-center px-6 gap-2">
          <div className="size-7 bg-emerald-deep rounded-[4px]" />
          <span className="font-bold tracking-tight">ZEDCOMPLY</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-md flex items-center gap-3 text-sm font-medium transition-colors ${
                  active ? "bg-emerald-soft text-emerald-deep" : "text-foreground/60 hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <button onClick={signOut} className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-sm font-medium text-foreground/60 hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
