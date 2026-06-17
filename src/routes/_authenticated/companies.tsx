import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", tpin: "", napsa_employer_no: "", nhima_employer_no: "", wcfcb_no: "", industry: "" });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("companies").insert({ ...form, created_by: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company registered");
      setOpen(false);
      setForm({ name: "", tpin: "", napsa_employer_no: "", nhima_employer_no: "", wcfcb_no: "", industry: "" });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["my-companies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Tenants</p>
          <h1 className="text-lg font-bold tracking-tight">Companies</h1>
        </div>
        <button onClick={() => setOpen(true)} className="px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 inline-flex items-center gap-2">
          <Plus className="size-4" /> Register company
        </button>
      </header>

      <div className="p-8">
        {isLoading ? (
          <Loader2 className="size-5 animate-spin text-foreground/40" />
        ) : !companies?.length ? (
          <div className="border rounded-xl p-12 text-center">
            <Building2 className="size-10 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">No companies yet. Register your first tenant to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div key={c.id} className="p-5 border rounded-xl hover:border-emerald-deep/40 transition-colors">
                <div className="size-8 bg-emerald-soft text-emerald-deep grid place-items-center rounded mb-4">
                  <Building2 className="size-4" />
                </div>
                <h3 className="font-bold tracking-tight mb-1">{c.name}</h3>
                <p className="text-xs text-foreground/40 font-mono">TPIN: {c.tpin || "—"}</p>
                {c.industry && <p className="text-xs text-foreground/60 mt-2">{c.industry}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/40 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-xl border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold tracking-tight mb-4">Register company</h2>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
              {[
                { k: "name", l: "Company name", req: true },
                { k: "tpin", l: "TPIN" },
                { k: "napsa_employer_no", l: "NAPSA Employer No." },
                { k: "nhima_employer_no", l: "NHIMA Employer No." },
                { k: "wcfcb_no", l: "WCFCB No." },
                { k: "industry", l: "Industry" },
              ].map((f) => (
                <div key={f.k}>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 block mb-1">{f.l}</label>
                  <input
                    required={f.req}
                    value={(form as Record<string, string>)[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-[4px] bg-background focus:border-emerald-deep focus:outline-none"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border rounded-[4px] text-sm font-medium hover:bg-muted">Cancel</button>
                <button disabled={create.isPending} className="flex-1 py-2 bg-emerald-deep text-primary-foreground rounded-[4px] text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {create.isPending && <Loader2 className="size-4 animate-spin" />}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
