import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { normalizeRow, computeRecord, type PayrollInput } from "@/lib/statutory";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
  const [busy, setBusy] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ["companies-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      if (data?.length && !companyId) setCompanyId(data[0].id);
      return data ?? [];
    },
  });

  const { data: uploads } = useQuery({
    queryKey: ["uploads", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_uploads")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const processUpload = useMutation({
    mutationFn: async (file: File) => {
      if (!companyId) throw new Error("Select a company first");
      const rows = await parseFile(file);
      if (!rows.length) throw new Error("File is empty");

      const computed = rows.map((r) => computeRecord(normalizeRow(r)));
      const errorCount = computed.filter((c) => c.errors.length > 0).length;
      const totals = computed.reduce(
        (a, c) => ({
          gross: a.gross + c.gross_salary + c.allowances,
          napsa: a.napsa + c.napsa,
          paye: a.paye + c.paye,
          nhima: a.nhima + c.nhima,
          wcfcb: a.wcfcb + c.wcfcb,
        }),
        { gross: 0, napsa: 0, paye: 0, nhima: 0, wcfcb: 0 },
      );

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const { data: upload, error: upErr } = await supabase
        .from("payroll_uploads")
        .insert({
          company_id: companyId,
          uploaded_by: u.user.id,
          file_name: file.name,
          period_month: period.month,
          period_year: period.year,
          employee_count: computed.length,
          error_count: errorCount,
          status: errorCount > 0 ? "has_errors" : "validated",
          total_gross: totals.gross,
          total_napsa: totals.napsa,
          total_paye: totals.paye,
          total_nhima: totals.nhima,
          total_wcfcb: totals.wcfcb,
        })
        .select("id")
        .single();
      if (upErr) throw upErr;

      const records = computed.map((c) => ({
        company_id: companyId,
        upload_id: upload.id,
        employee_name: c.employee_name || "(unnamed)",
        employee_id: c.employee_id ?? null,
        ssn: c.ssn ?? null,
        tpin: c.tpin ?? null,
        nhima_no: c.nhima_no ?? null,
        gross_salary: c.gross_salary,
        allowances: c.allowances,
        other_deductions: c.other_deductions,
        napsa: c.napsa,
        paye: c.paye,
        nhima: c.nhima,
        wcfcb: c.wcfcb,
        net_pay: c.net_pay,
        errors: c.errors,
      }));

      // chunk inserts
      for (let i = 0; i < records.length; i += 500) {
        const slice = records.slice(i, i + 500);
        const { error } = await supabase.from("payroll_records").insert(slice);
        if (error) throw error;
      }

      // Create draft submissions for each statutory body
      const period_month = period.month;
      const period_year = period.year;
      const dueDate = new Date(period_year, period_month, 10).toISOString().slice(0, 10);
      const submissionsRows = [
        { body: "NAPSA" as const, amount: totals.napsa },
        { body: "PAYE" as const, amount: totals.paye },
        { body: "NHIMA" as const, amount: totals.nhima },
        { body: "WCFCB" as const, amount: totals.wcfcb },
      ].map((s) => ({
        company_id: companyId,
        upload_id: upload.id,
        body: s.body,
        amount: s.amount,
        period_month,
        period_year,
        due_date: dueDate,
        status: errorCount > 0 ? ("draft" as const) : ("validated" as const),
      }));
      await supabase.from("submissions").insert(submissionsRows);

      await supabase.from("audit_log").insert({
        company_id: companyId,
        user_id: u.user.id,
        action: "payroll.uploaded",
        entity_type: "payroll_upload",
        entity_id: upload.id,
        metadata: { file_name: file.name, employee_count: computed.length, error_count: errorCount },
      });

      return { id: upload.id, errorCount, total: computed.length };
    },
    onSuccess: (r) => {
      toast.success(`Processed ${r.total} employees${r.errorCount ? ` · ${r.errorCount} with errors` : ""}`);
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["recent-uploads"] });
      qc.invalidateQueries({ queryKey: ["recent-subs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
    onSettled: () => setBusy(false),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    processUpload.mutate(f);
    e.target.value = "";
  }

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Payroll</p>
          <h1 className="text-lg font-bold tracking-tight">Uploads & Validation</h1>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {!companies?.length ? (
          <div className="border rounded-xl p-8 text-center">
            <p className="text-foreground/60 mb-4">Register a company first.</p>
            <Link to="/companies" className="text-emerald-deep font-medium underline">Go to Companies →</Link>
          </div>
        ) : (
          <>
            <section className="border rounded-xl p-6">
              <h2 className="text-sm font-bold mb-4">New upload</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 block mb-1">Company</label>
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 border rounded-[4px] bg-background">
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 block mb-1">Month</label>
                  <select value={period.month} onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-[4px] bg-background">
                    {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString("en", { month: "long" })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 block mb-1">Year</label>
                  <input type="number" value={period.year} onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-[4px] bg-background" />
                </div>
                <div className="flex items-end">
                  <button
                    disabled={busy || !companyId}
                    onClick={() => fileRef.current?.click()}
                    className="w-full px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {busy ? "Processing..." : "Select file"}
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={onFile} />
                </div>
              </div>
              <p className="text-xs text-foreground/50">
                Supports CSV and Excel. Expected columns: <code className="font-mono">Employee Name, TPIN, SSN, Gross Salary, Allowances, Other Deductions</code>.
              </p>
            </section>

            <section className="border rounded-xl">
              <div className="p-6 border-b">
                <h2 className="text-sm font-bold">Upload history</h2>
              </div>
              {!uploads?.length ? (
                <div className="p-12 text-center text-foreground/50">
                  <FileSpreadsheet className="size-10 mx-auto mb-3 text-foreground/30" />
                  No uploads yet for this company.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      {["File", "Period", "Employees", "Gross (ZMW)", "Status", ""].map((h) => (
                        <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase text-foreground/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 text-sm">
                        <td className="px-6 py-3 font-medium truncate max-w-[260px]">{u.file_name}</td>
                        <td className="px-6 py-3 text-foreground/60 font-mono">{String(u.period_month).padStart(2, "0")}/{u.period_year}</td>
                        <td className="px-6 py-3 font-mono tabular-nums">{u.employee_count}</td>
                        <td className="px-6 py-3 font-mono tabular-nums">{Number(u.total_gross).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-3">
                          {u.status === "has_errors" ? (
                            <span className="inline-flex items-center gap-1 text-destructive text-xs font-mono">
                              <AlertTriangle className="size-3" /> {u.error_count} errors
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-deep text-xs font-mono">
                              <CheckCircle2 className="size-3" /> Validated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <Link to="/payroll/$uploadId" params={{ uploadId: u.id }} className="text-emerald-deep text-xs font-medium hover:underline">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

async function parseFile(file: File): Promise<Array<Record<string, unknown>>> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: reject,
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

declare module "@tanstack/react-router" {}
