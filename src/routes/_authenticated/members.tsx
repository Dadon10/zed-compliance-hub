import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Users, UserPlus, Trash2 } from "lucide-react";

type Role = "admin" | "hr" | "finance" | "compliance";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

function MembersPage() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("hr");

  const { data: companies } = useQuery({
    queryKey: ["companies-min-m"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      if (data?.length && !companyId) setCompanyId(data[0].id);
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, role, user_id, created_at")
        .eq("company_id", companyId);
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, email, full_name").in("id", ids)
        : { data: [] };
      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m) => ({ ...m, profile: pMap.get(m.user_id) }));
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!companyId || !email) throw new Error("Company and email required");
      const { data: userId, error: pErr } = await supabase
        .rpc("find_user_id_by_email", { _email: email.trim().toLowerCase() });
      if (pErr) throw pErr;
      if (!userId) throw new Error("No user with that email — they must sign up first");
      const { error } = await supabase.from("company_members").insert({
        company_id: companyId,
        user_id: userId as string,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member added");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["members", companyId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", companyId] });
      toast.success("Removed");
    },
  });

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Access Control</p>
          <h1 className="text-lg font-bold tracking-tight">Team Members</h1>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {!companies?.length ? (
          <p className="text-foreground/60">Register a company first.</p>
        ) : (
          <>
            <section className="border rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-foreground/60 block mb-1">Company</label>
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 border rounded-[4px] bg-background">
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-foreground/60 block mb-1">User email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" className="w-full px-3 py-2 border rounded-[4px] bg-background" />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-foreground/60 block mb-1">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full px-3 py-2 border rounded-[4px] bg-background">
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => add.mutate()} disabled={add.isPending} className="w-full px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    <UserPlus className="size-4" /> Add member
                  </button>
                </div>
              </div>
              <p className="text-xs text-foreground/40 mt-3">User must have signed up to ZedCompliance before they can be added.</p>
            </section>

            <section className="border rounded-xl">
              <div className="p-6 border-b">
                <h2 className="text-sm font-bold inline-flex items-center gap-2"><Users className="size-4" /> Members</h2>
              </div>
              {!members?.length ? (
                <p className="p-12 text-center text-foreground/50">No members yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      {["Name", "Email", "Role", "Joined", ""].map((h) => (
                        <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase text-foreground/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="px-6 py-3 font-medium">{m.profile?.full_name ?? "—"}</td>
                        <td className="px-6 py-3 text-foreground/60">{m.profile?.email ?? "—"}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-soft text-emerald-deep">{m.role}</span>
                        </td>
                        <td className="px-6 py-3 text-xs font-mono text-foreground/40">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3">
                          <button onClick={() => remove.mutate(m.id)} className="text-destructive hover:underline text-xs inline-flex items-center gap-1">
                            <Trash2 className="size-3" /> Remove
                          </button>
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
