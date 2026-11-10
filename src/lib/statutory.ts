// Zambia 2024 statutory calculation engine
// Sources: NAPSA Act, ZRA PAYE schedules 2024, NHIMA Act, Workers' Compensation Fund

export interface PayrollInput {
  employee_name: string;
  employee_id?: string;
  ssn?: string;
  tpin?: string;
  nhima_no?: string;
  gross_salary: number;
  allowances?: number;
  other_deductions?: number;
}

export interface PayrollComputed extends Required<Omit<PayrollInput, "employee_id" | "ssn" | "tpin" | "nhima_no">> {
  employee_id?: string;
  ssn?: string;
  tpin?: string;
  nhima_no?: string;
  napsa: number;
  paye: number;
  nhima: number;
  wcfcb: number;
  net_pay: number;
  errors: string[];
}

// NAPSA: 5% employee contribution, capped at ZMW 1,221.80/month (2024 ceiling)
const NAPSA_RATE = 0.05;
const NAPSA_CEILING = 1861.8;

// NHIMA: 1% of basic salary (employee share)
const NHIMA_RATE = 0.01;

// WCFCB: employer-only, default 1.5% of gross (industry-dependent in reality)
const WCFCB_RATE = 0.015;

// PAYE 2024 monthly bands (ZMW)
const PAYE_BANDS: Array<{ upTo: number; rate: number }> = [
  { upTo: 5100, rate: 0 },
  { upTo: 7100, rate: 0.2 },
  { upTo: 9200, rate: 0.3 },
  { upTo: Infinity, rate: 0.37 },
];

export function calcNAPSA(gross: number): number {
  return Math.min(gross * NAPSA_RATE, NAPSA_CEILING);
}

export function calcNHIMA(gross: number): number {
  return gross * NHIMA_RATE;
}

export function calcWCFCB(gross: number): number {
  return gross * WCFCB_RATE;
}

export function calcPAYE(taxable: number): number {
  let tax = 0;
  let prev = 0;
  for (const band of PAYE_BANDS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, band.upTo) - prev;
    tax += slice * band.rate;
    prev = band.upTo;
  }
  return Math.max(0, tax);
}

export function computeRecord(input: PayrollInput): PayrollComputed {
  const errors: string[] = [];
  const gross = Number(input.gross_salary) || 0;
  const allowances = Number(input.allowances) || 0;
  const otherDeductions = Number(input.other_deductions) || 0;

  if (!input.employee_name?.trim()) errors.push("Missing employee name");
  if (gross <= 0) errors.push("Gross salary must be greater than 0");
  if (gross > 1_000_000) errors.push("Gross salary unusually high — please verify");
  if (input.tpin && !/^\d{10}$/.test(input.tpin)) errors.push("TPIN must be 10 digits");
  if (input.ssn && input.ssn.length < 6) errors.push("SSN looks invalid");

  const totalGross = gross + allowances;
  const napsa = calcNAPSA(gross);
  const nhima = calcNHIMA(gross);
  const wcfcb = calcWCFCB(gross);
  // Taxable income = gross + allowances - NAPSA (tax-deductible)
  const taxable = Math.max(0, totalGross - napsa);
  const paye = calcPAYE(taxable);
  const net_pay = totalGross - napsa - nhima - paye - otherDeductions;

  return {
    employee_name: input.employee_name?.trim() ?? "",
    employee_id: input.employee_id,
    ssn: input.ssn,
    tpin: input.tpin,
    nhima_no: input.nhima_no,
    gross_salary: gross,
    allowances,
    other_deductions: otherDeductions,
    napsa: round(napsa),
    paye: round(paye),
    nhima: round(nhima),
    wcfcb: round(wcfcb),
    net_pay: round(net_pay),
    errors,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Map common CSV header variants to canonical keys
const HEADER_MAP: Record<string, keyof PayrollInput> = {
  "name": "employee_name", "employee": "employee_name", "employee name": "employee_name", "full name": "employee_name",
  "employee id": "employee_id", "id": "employee_id", "emp id": "employee_id", "staff id": "employee_id",
  "ssn": "ssn", "napsa": "ssn", "napsa no": "ssn", "social security": "ssn",
  "tpin": "tpin", "tax id": "tpin",
  "nhima": "nhima_no", "nhima no": "nhima_no",
  "gross": "gross_salary", "gross salary": "gross_salary", "basic": "gross_salary", "basic salary": "gross_salary", "salary": "gross_salary",
  "allowances": "allowances", "allowance": "allowances", "benefits": "allowances",
  "other deductions": "other_deductions", "deductions": "other_deductions",
};

export function normalizeRow(row: Record<string, unknown>): PayrollInput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = HEADER_MAP[k.toLowerCase().trim()];
    if (key) out[key] = v;
  }
  return {
    employee_name: String(out.employee_name ?? "").trim(),
    employee_id: out.employee_id ? String(out.employee_id) : undefined,
    ssn: out.ssn ? String(out.ssn) : undefined,
    tpin: out.tpin ? String(out.tpin) : undefined,
    nhima_no: out.nhima_no ? String(out.nhima_no) : undefined,
    gross_salary: parseNum(out.gross_salary),
    allowances: parseNum(out.allowances),
    other_deductions: parseNum(out.other_deductions),
  };
}

function parseNum(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
