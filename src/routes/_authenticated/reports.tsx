import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: subs } = useQuery({
    queryKey: ["report-subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("body, amount, period_month, period_year, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const byBody = (subs ?? []).reduce<Record<string, number>>((a, s) => {
    a[s.body] = (a[s.body] ?? 0) + Number(s.amount);
    return a;
  }, {});

  const total = Object.values(byBody).reduce((a, b) => a + b, 0);

  function exportCsv() {
    const rows = (subs ?? []).map((s) => `${s.body},${s.period_month}/${s.period_year},${s.amount},${s.status}`);
    const csv = ["Body,Period,Amount,Status", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `zedcompliance-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Analytics</p>
          <h1 className="text-lg font-bold tracking-tight">Reports</h1>
        </div>
        <button onClick={exportCsv} className="px-4 py-2 border text-sm font-medium rounded-[4px] hover:bg-muted inline-flex items-center gap-2">
          <Download className="size-4" /> Export CSV
        </button>
      </header>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["NAPSA", "PAYE", "NHIMA", "WCFCB"].map((b) => (
            <div key={b} className="p-5 border rounded-xl">
              <p className="text-[10px] font-mono uppercase text-foreground/40 mb-2">{b}</p>
              <p className="text-2xl font-bold font-mono tabular-nums">
                {(byBody[b] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-foreground/40 mt-1">ZMW total remitted</p>
            </div>
          ))}
        </div>

        <div className="border rounded-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="size-4 text-foreground/40" />
            <h2 className="text-sm font-bold">Distribution by body</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(byBody).map(([body, amt]) => (
              <div key={body}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>{body}</span>
                  <span className="tabular-nums">{amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="h-2 bg-muted rounded">
                  <div className="h-full bg-emerald-deep rounded" style={{ width: `${total ? (amt / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {!Object.keys(byBody).length && <p className="text-sm text-foreground/50">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
