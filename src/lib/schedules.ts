// Generate statutory body export schedules (CSV) for filing with NAPSA, ZRA PAYE, NHIMA, WCFCB
import type { Tables } from "@/integrations/supabase/types";

type PayrollRecord = Tables<"payroll_records">;

type Body = "NAPSA" | "PAYE" | "NHIMA" | "WCFCB";

const SCHEMAS: Record<Body, Array<{ header: string; key: (r: PayrollRecord) => string | number }>> = {
  NAPSA: [
    { header: "Employee Name", key: (r) => r.employee_name },
    { header: "SSN", key: (r) => r.ssn ?? "" },
    { header: "Basic Salary", key: (r) => r.gross_salary },
    { header: "Employee Contribution", key: (r) => r.napsa },
    { header: "Employer Contribution", key: (r) => r.napsa },
    { header: "Total Contribution", key: (r) => r.napsa * 2 },
  ],
  PAYE: [
    { header: "Employee Name", key: (r) => r.employee_name },
    { header: "TPIN", key: (r) => r.tpin ?? "" },
    { header: "Gross Income", key: (r) => r.gross_salary + r.allowances },
    { header: "NAPSA Deduction", key: (r) => r.napsa },
    { header: "Taxable Income", key: (r) => Math.max(0, r.gross_salary + r.allowances - r.napsa) },
    { header: "PAYE", key: (r) => r.paye },
  ],
  NHIMA: [
    { header: "Employee Name", key: (r) => r.employee_name },
    { header: "NHIMA No.", key: (r) => r.nhima_no ?? "" },
    { header: "Basic Salary", key: (r) => r.gross_salary },
    { header: "Employee Contribution", key: (r) => r.nhima },
    { header: "Employer Contribution", key: (r) => r.nhima },
  ],
  WCFCB: [
    { header: "Employee Name", key: (r) => r.employee_name },
    { header: "Gross Salary", key: (r) => r.gross_salary },
    { header: "WCFCB Contribution", key: (r) => r.wcfcb },
  ],
};

export function buildScheduleCsv(body: Body, records: PayrollRecord[]): string {
  const schema = SCHEMAS[body];
  const headers = schema.map((s) => s.header).join(",");
  const rows = records.map((r) =>
    schema.map((s) => csvEscape(s.key(r))).join(","),
  );
  const totals = schema.map((s, i) => {
    if (i === 0) return "TOTAL";
    const v = records.reduce((a, r) => a + (Number(s.key(r)) || 0), 0);
    return typeof s.key(records[0] ?? ({} as PayrollRecord)) === "number" ? String(Math.round(v * 100) / 100) : "";
  }).join(",");
  return [headers, ...rows, totals].join("\n");
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
