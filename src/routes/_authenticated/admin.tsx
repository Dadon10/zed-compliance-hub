import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { data: rates } = useQuery({
    queryKey: ["rate-tables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate_tables").select("*").order("body");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Administration</p>
          <h1 className="text-lg font-bold tracking-tight">Rate Tables</h1>
        </div>
      </header>
      <div className="p-8 space-y-4">
        <p className="text-sm text-foreground/60 max-w-2xl">
          Statutory rates currently configured in the system. These drive the calculation engine for NAPSA, PAYE, NHIMA and WCFCB.
        </p>
        {!rates?.length ? (
          <div className="border rounded-xl p-12 text-center text-foreground/50">
            <Settings className="size-10 mx-auto mb-3 text-foreground/30" />
            No rate tables configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rates.map((r) => (
              <div key={r.id} className="border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono uppercase text-foreground/40">{r.body}</p>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${r.is_active ? "bg-emerald-soft text-emerald-deep" : "bg-muted"}`}>
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <h3 className="font-bold tracking-tight mb-2">{r.name}</h3>
                <p className="text-xs text-foreground/40 mb-3 font-mono">Effective from {r.effective_from}</p>
                <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto font-mono">{JSON.stringify(r.config, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
