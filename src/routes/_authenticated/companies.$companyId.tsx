import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeDeadlines, formatDeadline } from "@/lib/deadlines";
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies/$companyId")({
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const { companyId } = Route.useParams();

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: uploads } = useQuery({
    queryKey: ["company-uploads", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_uploads")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["company-subs", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const deadlines = computeDeadlines();
  const upcoming = deadlines.filter((d) => !d.overdue && d.daysUntil <= 45).slice(0, 8);
  const overdue = deadlines.filter((d) => d.overdue && d.daysUntil >= -30);

  const totalRemittance = subs?.reduce((a, s) => a + Number(s.amount ?? 0), 0) ?? 0;
  const pending = subs?.filter((s) => s.status !== "submitted").length ?? 0;
  const lastUpload = uploads?.[0];

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Link to="/companies" className="text-foreground/40 hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Company</p>
            <h1 className="text-lg font-bold tracking-tight">{company?.name ?? "Loading…"}</h1>
          </div>
        </div>
        <Link
          to="/payroll"
          className="px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 inline-flex items-center gap-2"
        >
          <Upload className="size-4" /> Upload payroll
        </Link>
      </header>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="TPIN" value={company?.tpin ?? "—"} mono />
          <KPI label="Pending submissions" value={String(pending).padStart(2, "0")} tone={pending > 0 ? "copper" : undefined} />
          <KPI label="Total remittance" value={`ZMW ${totalRemittance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <KPI
            label="Last upload"
            value={lastUpload ? `${lastUpload.employee_count} emp` : "None"}
            hint={lastUpload ? `${lastUpload.period_month}/${lastUpload.period_year}` : undefined}
          />
        </div>

        {overdue.length > 0 && (
          <section className="border border-destructive/30 bg-destructive/5 rounded-xl p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Overdue deadlines
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {overdue.map((d, i) => (
                <li key={i} className="flex justify-between">
                  <span className="font-mono">{d.body} · {d.periodLabel}</span>
                  <span className="text-destructive font-medium">
                    {Math.abs(d.daysUntil)}d overdue · {formatDeadline(d.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 border rounded-xl p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Clock className="size-4 text-foreground/40" /> Upcoming statutory deadlines
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-foreground/50">No deadlines in the next 45 days.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {["Body", "Period", "Due", "In"].map((h) => (
                      <th key={h} className="py-2 text-left text-[10px] font-mono text-foreground/40 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((d, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 font-mono text-xs">{d.body}</td>
                      <td className="py-3 text-foreground/70">{d.periodLabel}</td>
                      <td className="py-3 text-foreground/60">{formatDeadline(d.dueDate)}</td>
                      <td className="py-3">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${d.daysUntil <= 5 ? "bg-copper-soft text-copper" : "bg-muted text-foreground/60"}`}>
                          {d.daysUntil}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="border rounded-xl p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-deep" /> Recent uploads
            </h3>
            {!uploads?.length ? (
              <p className="text-sm text-foreground/50">No uploads yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {uploads.map((u) => (
                  <li key={u.id} className="flex justify-between border-b border-border/50 pb-2">
                    <div>
                      <p className="font-medium truncate max-w-[180px]">{u.file_name}</p>
                      <p className="text-[10px] font-mono text-foreground/40">
                        {u.period_month}/{u.period_year} · {u.employee_count} emp
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded h-fit ${
                      u.status === "validated" ? "bg-emerald-soft text-emerald-deep" :
                      u.status === "has_errors" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground/60"
                    }`}>
                      {u.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, hint, tone, mono }: { label: string; value: string; hint?: string; tone?: "copper"; mono?: boolean }) {
  return (
    <div className={`p-4 border rounded-xl ${tone === "copper" ? "border-copper/30 bg-copper-soft/40" : ""}`}>
      <p className={`text-[10px] font-mono uppercase mb-2 ${tone === "copper" ? "text-copper" : "text-foreground/40"}`}>{label}</p>
      <div className={`font-bold tracking-tight tabular-nums ${mono ? "font-mono text-lg" : "text-2xl font-mono"}`}>{value}</div>
      {hint && <p className="text-[10px] font-mono text-foreground/40 mt-1">{hint}</p>}
    </div>
  );
}
