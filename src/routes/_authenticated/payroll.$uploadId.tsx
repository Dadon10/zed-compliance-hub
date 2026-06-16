import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { buildScheduleCsv, downloadCsv } from "@/lib/schedules";

export const Route = createFileRoute("/_authenticated/payroll/$uploadId")({
  component: UploadDetail,
});

function UploadDetail() {
  const { uploadId } = Route.useParams();

  const { data: upload } = useQuery({
    queryKey: ["upload", uploadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_uploads").select("*").eq("id", uploadId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: records } = useQuery({
    queryKey: ["upload-records", uploadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_records").select("*").eq("upload_id", uploadId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const errorRecords = records?.filter((r) => Array.isArray(r.errors) && r.errors.length > 0) ?? [];

  function exportFor(body: "NAPSA" | "PAYE" | "NHIMA" | "WCFCB") {
    if (!records?.length || !upload) return;
    const csv = buildScheduleCsv(body, records);
    const period = `${upload.period_year}-${String(upload.period_month).padStart(2, "0")}`;
    downloadCsv(`${body}-schedule-${period}.csv`, csv);
  }

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Link to="/payroll" className="text-foreground/40 hover:text-foreground"><ArrowLeft className="size-4" /></Link>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Upload</p>
            <h1 className="text-lg font-bold tracking-tight truncate max-w-[480px]">{upload?.file_name ?? "..."}</h1>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {upload && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Employees" value={String(upload.employee_count)} />
            <Stat label="NAPSA" value={fmt(upload.total_napsa)} />
            <Stat label="PAYE" value={fmt(upload.total_paye)} />
            <Stat label="NHIMA" value={fmt(upload.total_nhima)} />
            <Stat label="WCFCB" value={fmt(upload.total_wcfcb)} />
          </div>
        )}

        <section className="border rounded-xl p-6">
          <h2 className="text-sm font-bold mb-3">Export statutory schedules</h2>
          <p className="text-xs text-foreground/50 mb-4">Download filing-ready CSV schedules for each regulator.</p>
          <div className="flex flex-wrap gap-2">
            {(["NAPSA", "PAYE", "NHIMA", "WCFCB"] as const).map((b) => (
              <button key={b} onClick={() => exportFor(b)} className="px-3 py-2 border rounded-[4px] text-xs font-mono uppercase hover:bg-muted inline-flex items-center gap-2">
                <Download className="size-3" /> {b} schedule
              </button>
            ))}
          </div>
        </section>

        {errorRecords.length > 0 && (
          <section className="border border-destructive/30 bg-destructive/5 rounded-xl p-6">
            <h2 className="text-sm font-bold mb-3 inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Validation errors ({errorRecords.length})
            </h2>
            <ul className="space-y-2 text-sm">
              {errorRecords.slice(0, 20).map((r) => (
                <li key={r.id} className="flex justify-between gap-4 border-b border-destructive/10 pb-2">
                  <span className="font-medium">{r.employee_name}</span>
                  <span className="text-destructive text-xs font-mono">
                    {(r.errors as string[]).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border rounded-xl">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-sm font-bold">Computed payroll ({records?.length ?? 0})</h2>
            {upload?.status === "validated" && (
              <span className="inline-flex items-center gap-1 text-emerald-deep text-xs font-mono">
                <CheckCircle2 className="size-3" /> Ready to file
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {["Employee", "TPIN", "Gross", "NAPSA", "PAYE", "NHIMA", "WCFCB", "Net Pay"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-mono uppercase text-foreground/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records?.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-medium">{r.employee_name}</td>
                    <td className="px-4 py-2 font-mono text-foreground/60">{r.tpin ?? "—"}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{fmt(r.gross_salary)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{fmt(r.napsa)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{fmt(r.paye)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{fmt(r.nhima)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{fmt(r.wcfcb)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums font-bold">{fmt(r.net_pay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border rounded-xl">
      <p className="text-[10px] font-mono uppercase text-foreground/40 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
    </div>
  );
}

function fmt(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
