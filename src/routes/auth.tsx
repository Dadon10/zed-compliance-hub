import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Authentication failed";
      toast.error(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-foreground text-background">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 bg-emerald-deep rounded-[4px]" />
          <span className="font-bold tracking-tight text-lg">ZEDCOMPLY</span>
        </Link>
        <div className="max-w-md">
          <p className="text-xs font-mono text-copper uppercase tracking-widest mb-4">Audit-Grade Compliance</p>
          <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
            Upload payroll once. File NAPSA, PAYE, NHIMA and WCFCB returns automatically.
          </h2>
          <p className="text-background/60">
            Every action immutably logged. Every calculation traceable to a statutory rate table.
          </p>
        </div>
        <div className="text-xs font-mono text-background/40">&copy; 2026 ZEDCOMPLIANCE SYSTEMS LTD.</div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="size-7 bg-emerald-deep rounded-[4px]" />
            <span className="font-bold tracking-tight text-lg">ZEDCOMPLY</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
          </h1>
          <p className="text-sm text-foreground/60 mb-8">
            {mode === "signin" ? "Welcome back." : "14-day trial. No card required."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-foreground/60 block mb-2">Full Name</label>
                <input
                  required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-[4px] bg-background focus:border-emerald-deep focus:outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60 block mb-2">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-[4px] bg-background focus:border-emerald-deep focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60 block mb-2">Password</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-[4px] bg-background focus:border-emerald-deep focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-deep text-primary-foreground font-medium rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-foreground/60 text-center">
            {mode === "signin" ? "Don't have an account?" : "Already have one?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-emerald-deep font-medium hover:underline">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
