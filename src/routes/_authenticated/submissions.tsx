import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/submissions")({
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const qc = useQueryClient();
  const { data: subs } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("submissions")
        .update({ status: "approved", approved_by: u.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submissions"] }); toast.success("Approved"); },
  });

  const submit = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const ref = `REF-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from("submissions")
        .update({ status: "submitted", submitted_at: new Date().toISOString(), submitted_by: u.user?.id, reference: ref })
        .eq("id", id);
      if (error) throw error;
      return ref;
    },
    onSuccess: (ref) => { qc.invalidateQueries({ queryKey: ["submissions"] }); toast.success(`Submitted · ${ref}`); },
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
                {["Company", "Body", "Period", "Amount (ZMW)", "Due", "Status", "Action"].map((h) => (
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
                  </td>
                  <td className="px-6 py-3">
                    {s.status === "validated" && (
                      <button onClick={() => approve.mutate(s.id)} className="text-xs font-medium text-emerald-deep hover:underline">Approve</button>
                    )}
                    {s.status === "approved" && (
                      <button onClick={() => submit.mutate(s.id)} className="text-xs font-medium text-emerald-deep hover:underline inline-flex items-center gap-1">
                        <Send className="size-3" /> Submit
                      </button>
                    )}
                    {s.status === "submitted" && <span className="text-xs text-foreground/40 font-mono">{s.reference}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; i?: React.ReactNode }> = {
    draft: { c: "bg-muted text-foreground/60", i: <Clock className="size-3" /> },
    validated: { c: "bg-emerald-soft text-emerald-deep", i: <CheckCircle2 className="size-3" /> },
    approved: { c: "bg-copper-soft text-copper", i: <CheckCircle2 className="size-3" /> },
    submitted: { c: "bg-foreground text-background", i: <Send className="size-3" /> },
    rejected: { c: "bg-destructive/10 text-destructive" },
    failed: { c: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? { c: "bg-muted" };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase inline-flex items-center gap-1 ${s.c}`}>{s.i}{status}</span>;
}
