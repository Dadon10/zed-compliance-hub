import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle2, Clock, XCircle, Loader2, FileDown } from "lucide-react";
import { useState } from "react";
import { downloadSubmissionPdf } from "@/lib/submission-pdf";

export const Route = createFileRoute("/_authenticated/submissions")({
  component: SubmissionsPage,
});

type Sub = {
  id: string;
  company_id: string;
  body: string;
  period_month: number;
  period_year: number;
  status: string;
  amount: number;
  due_date: string | null;
  reference: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  companies?: { name: string; tpin?: string | null } | null;
};

async function hasRole(companyId: string, roles: ("admin" | "finance" | "compliance")[]) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  for (const role of roles) {
    const { data } = await supabase.rpc("has_company_role", {
      _company: companyId,
      _user: u.user.id,
      _role: role,
    });
    if (data) return true;
  }
  return false;
}

async function audit(action: string, companyId: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    action,
    company_id: companyId,
    entity_type: "submission",
    entity_id: entityId,
    user_id: u.user?.id,
    metadata: metadata as never,
  });
}

function SubmissionsPage() {
  const qc = useQueryClient();
  const [rejectFor, setRejectFor] = useState<Sub | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: subs } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*, companies(name, tpin)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });

  const approve = useMutation({
    mutationFn: async (s: Sub) => {
      if (!(await hasRole(s.company_id, ["admin", "finance"]))) {
        throw new Error("Only admin or finance can approve");
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("submissions")
        .update({ status: "approved", approved_by: u.user?.id })
        .eq("id", s.id);
      if (error) throw error;
      await audit("submission.approved", s.company_id, s.id, { body: s.body, amount: s.amount });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submissions"] }); toast.success("Approved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submit = useMutation({
    mutationFn: async (s: Sub) => {
      if (!(await hasRole(s.company_id, ["admin", "compliance"]))) {
        throw new Error("Only admin or compliance can mark as submitted");
      }
      const { data: u } = await supabase.auth.getUser();
      const ref = `REF-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from("submissions")
        .update({ status: "submitted", submitted_at: new Date().toISOString(), submitted_by: u.user?.id, reference: ref })
        .eq("id", s.id);
      if (error) throw error;
      await audit("submission.filed", s.company_id, s.id, { body: s.body, reference: ref, amount: s.amount });
      return ref;
    },
    onSuccess: (ref) => { qc.invalidateQueries({ queryKey: ["submissions"] }); toast.success(`Submitted · ${ref}`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const reject = useMutation({
    mutationFn: async ({ s, reason }: { s: Sub; reason: string }) => {
      if (!(await hasRole(s.company_id, ["admin", "finance", "compliance"]))) {
        throw new Error("You don't have permission to reject");
      }
      const { error } = await supabase
        .from("submissions")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", s.id);
      if (error) throw error;
      await audit("submission.rejected", s.company_id, s.id, { body: s.body, reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Rejected");
      setRejectFor(null);
      setRejectReason("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Statutory</p>
          <h1 className="text-lg font-bold tracking-tight">Submissions</h1>
        </div>
      </header>

      <div className="p-8">
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b text-left">
              <tr>
                {["Company", "Body", "Period", "Amount (ZMW)", "Due", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase text-foreground/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!subs?.length ? (
                <tr><td colSpan={7} className="p-12 text-center text-foreground/50">No submissions yet — upload payroll first.</td></tr>
              ) : subs.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-6 py-3 font-medium">{s.companies?.name ?? "—"}</td>
                  <td className="px-6 py-3 font-mono text-xs">{s.body}</td>
                  <td className="px-6 py-3 font-mono">{String(s.period_month).padStart(2, "0")}/{s.period_year}</td>
                  <td className="px-6 py-3 font-mono tabular-nums">{Number(s.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3 text-foreground/60">{s.due_date ?? "—"}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={s.status} />
                    {s.status === "rejected" && s.rejection_reason && (
                      <p className="text-[10px] text-destructive mt-1 max-w-[200px]">{s.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-3 items-center">
                      {(s.status === "validated" || s.status === "draft") && (
                        <button onClick={() => approve.mutate(s)} disabled={approve.isPending} className="text-xs font-medium text-emerald-deep hover:underline">Approve</button>
                      )}
                      {s.status === "approved" && (
                        <button onClick={() => submit.mutate(s)} disabled={submit.isPending} className="text-xs font-medium text-emerald-deep hover:underline inline-flex items-center gap-1">
                          <Send className="size-3" /> Submit
                        </button>
                      )}
                      {(s.status === "validated" || s.status === "approved" || s.status === "draft") && (
                        <button onClick={() => setRejectFor(s)} className="text-xs font-medium text-destructive hover:underline">Reject</button>
                      )}
                      {s.status === "submitted" && <span className="text-xs text-foreground/40 font-mono">{s.reference}</span>}
                      {(s.status === "approved" || s.status === "submitted") && (
                        <button
                          onClick={() => downloadSubmissionPdf({
                            companyName: s.companies?.name ?? "Company",
                            tpin: s.companies?.tpin,
                            body: s.body,
                            periodMonth: s.period_month,
                            periodYear: s.period_year,
                            amount: Number(s.amount),
                            reference: s.reference,
                            status: s.status,
                            submittedAt: s.submitted_at,
                          })}
                          className="text-xs font-medium text-foreground/70 hover:text-foreground hover:underline inline-flex items-center gap-1"
                        >
                          <FileDown className="size-3" /> PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 bg-foreground/40 grid place-items-center p-4" onClick={() => setRejectFor(null)}>
          <div className="bg-background rounded-xl border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2">
              <XCircle className="size-5 text-destructive" /> Reject submission
            </h2>
            <p className="text-sm text-foreground/60 mb-4">
              {rejectFor.body} · {rejectFor.period_month}/{rejectFor.period_year} · {rejectFor.companies?.name}
            </p>
            <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 block mb-1">Reason</label>
            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this submission is being rejected…"
              className="w-full px-3 py-2 border rounded-[4px] bg-background focus:border-destructive focus:outline-none text-sm"
            />
            <div className="flex gap-2 pt-4">
              <button onClick={() => setRejectFor(null)} className="flex-1 py-2 border rounded-[4px] text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() => reject.mutate({ s: rejectFor, reason: rejectReason.trim() })}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-[4px] text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {reject.isPending && <Loader2 className="size-4 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; i?: React.ReactNode }> = {
    draft: { c: "bg-muted text-foreground/60", i: <Clock className="size-3" /> },
    validated: { c: "bg-emerald-soft text-emerald-deep", i: <CheckCircle2 className="size-3" /> },
    approved: { c: "bg-copper-soft text-copper", i: <CheckCircle2 className="size-3" /> },
    submitted: { c: "bg-foreground text-background", i: <Send className="size-3" /> },
    rejected: { c: "bg-destructive/10 text-destructive", i: <XCircle className="size-3" /> },
    failed: { c: "bg-destructive/10 text-destructive", i: <XCircle className="size-3" /> },
  };
  const s = map[status] ?? { c: "bg-muted" };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase inline-flex items-center gap-1 ${s.c}`}>{s.i}{status}</span>;
}
