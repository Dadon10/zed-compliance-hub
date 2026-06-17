// Zambian statutory deadline calculator
export type StatutoryBody = "NAPSA" | "PAYE" | "NHIMA" | "WCFCB";

export interface Deadline {
  body: StatutoryBody;
  periodLabel: string;
  dueDate: Date;
  daysUntil: number;
  overdue: boolean;
}

// NAPSA, PAYE, NHIMA: due 10th of the month following the period.
// WCFCB: quarterly, due 10th of Apr/Jul/Oct/Jan (covers prior quarter).
export function computeDeadlines(reference: Date = new Date(), horizonMonths = 3): Deadline[] {
  const out: Deadline[] = [];
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());

  for (let offset = -1; offset <= horizonMonths; offset++) {
    const period = new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
    const due = new Date(period.getFullYear(), period.getMonth() + 1, 10);
    const label = `${String(period.getMonth() + 1).padStart(2, "0")}/${period.getFullYear()}`;
    for (const body of ["NAPSA", "PAYE", "NHIMA"] as const) {
      const days = Math.round((due.getTime() - today.getTime()) / 86400000);
      out.push({ body, periodLabel: label, dueDate: due, daysUntil: days, overdue: days < 0 });
    }
  }

  // WCFCB quarterly
  const year = reference.getFullYear();
  const quarters = [
    { due: new Date(year, 3, 10), label: `Q1 ${year}` },
    { due: new Date(year, 6, 10), label: `Q2 ${year}` },
    { due: new Date(year, 9, 10), label: `Q3 ${year}` },
    { due: new Date(year + 1, 0, 10), label: `Q4 ${year}` },
    { due: new Date(year, 0, 10), label: `Q4 ${year - 1}` },
  ];
  for (const q of quarters) {
    const days = Math.round((q.due.getTime() - today.getTime()) / 86400000);
    if (days < -45 || days > horizonMonths * 31) continue;
    out.push({ body: "WCFCB", periodLabel: q.label, dueDate: q.due, daysUntil: days, overdue: days < 0 });
  }

  return out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function formatDeadline(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
