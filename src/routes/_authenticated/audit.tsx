import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { data: logs } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*, companies(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Traceability</p>
          <h1 className="text-lg font-bold tracking-tight">Audit Log</h1>
        </div>
      </header>
      <div className="p-8">
        {!logs?.length ? (
          <div className="border rounded-xl p-12 text-center text-foreground/50">
            <ScrollText className="size-10 mx-auto mb-3 text-foreground/30" />
            No activity recorded yet.
          </div>
        ) : (
          <div className="border rounded-xl divide-y">
            {logs.map((l) => (
              <div key={l.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-mono text-xs text-foreground/40">{new Date(l.created_at).toLocaleString()}</p>
                  <p className="font-medium">{l.action}</p>
                </div>
                <div className="text-right text-xs text-foreground/60">
                  <p>{l.companies?.name ?? "—"}</p>
                  <p className="font-mono text-foreground/40">{l.entity_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
