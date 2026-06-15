import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Upload, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: companies } = useQuery({
    queryKey: ["my-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, tpin, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: uploads } = useQuery({
    queryKey: ["recent-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_uploads")
        .select("id, file_name, period_month, period_year, status, employee_count, total_gross, error_count, created_at, company_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["recent-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, body, period_month, period_year, status, amount, due_date")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const companyCount = companies?.length ?? 0;
  const pendingSubs = subs?.filter((s) => s.status !== "submitted").length ?? 0;
  const totalRemittance = subs?.reduce((a, s) => a + Number(s.amount ?? 0), 0) ?? 0;

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Compliance Overview</p>
          <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
        </div>
        <Link to="/payroll" className="px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 inline-flex items-center gap-2">
          <Upload className="size-4" /> Upload payroll
        </Link>
      </header>

      <div className="p-8 space-y-8">
        {companyCount === 0 && (
          <div className="border rounded-xl p-8 bg-emerald-soft/30">
            <h2 className="text-xl font-bold tracking-tight mb-2">Welcome to ZedCompliance</h2>
            <p className="text-foreground/60 mb-6 max-w-xl">
              Start by registering your first company. You'll then be able to upload payroll, validate it, and file statutory returns.
            </p>
            <Link to="/companies" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90">
              <Building2 className="size-4" /> Register company <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI label="Companies" value={String(companyCount).padStart(2, "0")} hint="Under your administration" />
          <KPI label="Pending Submissions" value={String(pendingSubs).padStart(2, "0")} hint={`${pendingSubs} require action`} tone="copper" />
          <KPI label="Total Remittance" value={`ZMW ${totalRemittance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} hint="Across recent filings" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 border rounded-xl p-6">
            <h3 className="text-sm font-bold mb-4">Recent Payroll Uploads</h3>
            {!uploads?.length ? (
              <p className="text-sm text-foreground/50">No uploads yet.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    {["File", "Period", "Employees", "Status"].map((h) => (
                      <th key={h} className="py-3 text-[10px] font-mono text-foreground/40 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {uploads.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 font-medium truncate max-w-[200px]">{u.file_name}</td>
                      <td className="py-3 text-foreground/60">{u.period_month}/{u.period_year}</td>
                      <td className="py-3 font-mono tabular-nums">{u.employee_count}</td>
                      <td className="py-3">
                        <StatusPill status={u.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="border rounded-xl p-6 bg-foreground text-background">
            <h3 className="text-xs font-mono font-bold mb-4 flex items-center gap-2">
              <span className="size-1.5 bg-copper rounded-full" /> UPCOMING DEADLINES
            </h3>
            {!subs?.length ? (
              <p className="text-xs text-background/60">No upcoming deadlines.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {subs.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold">{s.body} · {s.period_month}/{s.period_year}</p>
                      <p className="text-[10px] text-background/40">{s.due_date ?? "No due date"}</p>
                    </div>
                    <span className="text-[10px] font-mono text-copper uppercase">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "copper" }) {
  return (
    <div className={`p-4 border rounded-xl ${tone === "copper" ? "border-copper/30 bg-copper-soft/40" : ""}`}>
      <p className={`text-[10px] font-mono uppercase mb-2 ${tone === "copper" ? "text-copper" : "text-foreground/40"}`}>{label}</p>
      <div className="text-3xl font-bold tracking-tight font-mono tabular-nums">{value}</div>
      {hint && <p className={`text-xs mt-1 ${tone === "copper" ? "text-copper font-medium" : "text-foreground/40"}`}>{hint}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    processing: "bg-muted text-foreground/60",
    validated: "bg-emerald-soft text-emerald-deep",
    has_errors: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-foreground/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${map[status] ?? "bg-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
