import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileSpreadsheet, Shield, Workflow, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZedCompliance — Zambian Statutory Compliance Automation" },
      { name: "description", content: "Upload payroll once. File NAPSA, ZRA PAYE, NHIMA and WCFCB returns automatically. Audit-grade compliance for Zambian businesses." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-7 bg-emerald-deep rounded-[4px]" />
            <span className="font-bold tracking-tight text-lg">ZEDCOMPLY</span>
          </Link>
          <div className="flex items-center gap-8">
            <a href="#features" className="hidden sm:block text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Solutions</a>
            <a href="#dashboard" className="hidden sm:block text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">Platform</a>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <Link to="/auth" className="text-sm font-medium">Sign in</Link>
            <Link to="/auth" className="px-4 py-2 bg-emerald-deep text-primary-foreground text-sm font-medium rounded-[4px] hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        <div className="max-w-[800px] animate-reveal">
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-copper-soft border border-copper/20 mb-6">
            <span className="size-1.5 rounded-full bg-copper animate-pulse" />
            <span className="text-[10px] font-mono font-medium text-copper uppercase tracking-wider">
              New: ZRA PAYE Direct-File
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter leading-[0.95] mb-8">
            The Operating System for{" "}
            <span className="text-emerald-deep">Zambian Statutory Compliance.</span>
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed mb-10 max-w-[600px] text-pretty">
            Automate NAPSA, ZRA, WCFCB, and NHIMA filings with bank-grade precision.
            Built for the modern Zambian finance team.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-medium rounded-[4px] hover:opacity-90 transition-all">
              Start your 14-day trial <ArrowRight className="size-4" />
            </Link>
            <a href="#dashboard" className="px-8 py-4 border font-medium rounded-[4px] hover:bg-muted transition-all">
              See the platform
            </a>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t grid grid-cols-2 md:grid-cols-5 gap-8 items-center animate-reveal [animation-delay:200ms]">
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-foreground/40">
            Trusted by teams at
          </span>
          {["LUSAKA LOGISTICS", "KAFUE STEEL", "VICTORIA FIN", "ZEDBANK"].map((c, i) => (
            <div key={c} className={`font-bold text-foreground/30 text-xl tracking-tighter ${i % 2 ? "italic" : ""}`}>
              {c}
            </div>
          ))}
        </div>
      </header>

      {/* Statutory Bodies Grid */}
      <section id="features" className="px-6 py-20 max-w-7xl mx-auto border-t">
        <div className="grid md:grid-cols-4 gap-px bg-border border rounded-xl overflow-hidden shadow-sm">
          {[
            { n: "01", cat: "STATUTORY", name: "NAPSA", desc: "Automated pension contributions calculation and e-return generation for all employee tiers." },
            { n: "02", cat: "REVENUE", name: "ZRA PAYE", desc: "Direct integration with ZRA tax tables for seamless monthly payroll tax returns and reconciliation." },
            { n: "03", cat: "INSURANCE", name: "NHIMA", desc: "Unified health insurance reporting. Stay compliant with the latest National Health Insurance rules." },
            { n: "04", cat: "COMPENSATION", name: "WCFCB", desc: "Workers Compensation Fund Control Board assessments handled through verified payroll data." },
          ].map((it) => (
            <div key={it.name} className="bg-background p-8 hover:bg-emerald-soft/40 transition-colors">
              <div className="text-xs font-mono text-emerald-deep mb-4">{it.n}. {it.cat}</div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">{it.name}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="px-6 py-20 max-w-7xl mx-auto border-t">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { i: FileSpreadsheet, t: "Upload Once", d: "Drop your payroll CSV or Excel. Auto-detects columns, maps to the internal schema, stores both raw and processed versions." },
            { i: Shield, t: "Validate Everything", d: "TPIN format, NRC checks, salary inconsistencies, missing employees. Critical errors block submission until fixed." },
            { i: Workflow, t: "Approve & Submit", d: "Finance approves, compliance submits. Every action is logged immutably with timestamps and actor identity." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t}>
              <div className="size-10 rounded bg-emerald-soft text-emerald-deep grid place-items-center mb-5">
                <Icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2">{t}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview (dark band) */}
      <section id="dashboard" className="px-6 py-24 bg-foreground text-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Audit-grade dashboard</h2>
              <p className="text-background/60 max-w-md">
                Real-time monitoring across your entire corporate structure.
              </p>
            </div>
            <div className="flex gap-2 p-1 bg-background/5 rounded-lg border border-background/10">
              <button className="px-3 py-1.5 text-xs font-medium bg-background/10 rounded-md">Consolidated</button>
              <button className="px-3 py-1.5 text-xs font-medium text-background/40">Per company</button>
            </div>
          </div>

          <div className="bg-background text-foreground rounded-2xl overflow-hidden border border-background/10 grid grid-cols-1 md:grid-cols-[16rem_1fr] shadow-2xl">
            <aside className="border-r p-6 flex flex-col gap-6 bg-surface-muted/30">
              <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                <div className="size-8 bg-copper rounded-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono font-medium text-foreground/40 uppercase">Switch Company</p>
                  <p className="text-sm font-bold truncate">Mulungushi Ind.</p>
                </div>
              </div>
              <nav className="flex flex-col gap-1">
                <div className="px-3 py-2 bg-emerald-soft text-emerald-deep font-semibold rounded-md flex items-center gap-3 text-sm">
                  <div className="size-1.5 rounded-full bg-emerald-deep" /> Overview
                </div>
                {["Submissions", "Payroll Files", "Audit Logs"].map((l) => (
                  <div key={l} className="px-3 py-2 text-foreground/60 text-sm font-medium">{l}</div>
                ))}
              </nav>
            </aside>

            <main className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 border rounded-xl">
                  <p className="text-[10px] font-mono text-foreground/40 uppercase mb-2">Compliance Score</p>
                  <div className="text-3xl font-bold tracking-tight text-emerald-deep">98.4%</div>
                  <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-emerald-deep" />
                  </div>
                </div>
                <div className="p-4 border border-copper/30 rounded-xl bg-copper-soft/50">
                  <p className="text-[10px] font-mono text-copper uppercase mb-2">Pending Actions</p>
                  <div className="text-3xl font-bold tracking-tight">03</div>
                  <p className="text-xs text-copper font-medium mt-1">2 submissions overdue</p>
                </div>
                <div className="p-4 border rounded-xl">
                  <p className="text-[10px] font-mono text-foreground/40 uppercase mb-2">Total Remittance</p>
                  <div className="text-3xl font-bold tracking-tight font-mono tabular-nums">ZMW 142k</div>
                  <p className="text-xs text-foreground/40 mt-1">Current tax period</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-bold mb-4">Recent Submissions</h3>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        {["Statutory Body", "Period", "Status"].map((h) => (
                          <th key={h} className="py-3 text-[10px] font-mono text-foreground/40 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        { b: "ZRA PAYE", p: "Oct 2024", s: "FILED", c: "emerald" },
                        { b: "NAPSA", p: "Oct 2024", s: "PENDING", c: "copper" },
                        { b: "NHIMA", p: "Oct 2024", s: "FILED", c: "emerald" },
                      ].map((r) => (
                        <tr key={r.b} className="border-b border-border/50">
                          <td className="py-4 font-medium">{r.b}</td>
                          <td className="py-4 text-foreground/60">{r.p}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${r.c === "emerald" ? "bg-emerald-soft text-emerald-deep" : "bg-copper-soft text-copper"}`}>
                              {r.s}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-foreground text-background p-5 rounded-xl">
                    <h3 className="text-xs font-mono font-bold mb-4 flex items-center gap-2">
                      <span className="size-1.5 bg-copper rounded-full" /> DEADLINES
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold">NAPSA Return</p>
                          <p className="text-[10px] text-background/40">Nov 10</p>
                        </div>
                        <span className="text-[10px] font-mono text-copper">2D LEFT</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold">ZRA PAYE</p>
                          <p className="text-[10px] text-background/40">Nov 14</p>
                        </div>
                        <span className="text-[10px] font-mono text-background/40">6D LEFT</span>
                      </div>
                    </div>
                  </div>
                  <div className="border p-5 rounded-xl">
                    <h3 className="text-xs font-mono font-bold text-destructive mb-4">VALIDATION ERRORS (02)</h3>
                    <div className="flex flex-col gap-2">
                      <div className="p-2 bg-destructive/5 rounded border border-destructive/20 text-[10px] text-destructive font-medium">Missing SSN: Mutale, J.</div>
                      <div className="p-2 bg-destructive/5 rounded border border-destructive/20 text-[10px] text-destructive font-medium">TPIN format mismatch row 42.</div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 max-w-7xl mx-auto text-center border-t">
        <Zap className="size-10 text-emerald-deep mx-auto mb-6" />
        <h2 className="text-4xl font-bold tracking-tight mb-4">File your first return this week.</h2>
        <p className="text-foreground/60 max-w-xl mx-auto mb-8">
          14-day free trial. No credit card. Full access to all four statutory modules and unlimited validation runs.
        </p>
        <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-deep text-primary-foreground font-medium rounded-[4px] hover:opacity-90 transition-opacity">
          Create your workspace <ArrowRight className="size-4" />
        </Link>
        <div className="flex justify-center gap-8 mt-10 text-sm text-foreground/50">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4 text-emerald-deep" /> Multi-company</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4 text-emerald-deep" /> Audit-grade logs</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4 text-emerald-deep" /> ZRA-aligned</span>
        </div>
      </section>

      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-foreground/40 text-xs font-mono">
          <div>&copy; 2026 ZEDCOMPLIANCE SYSTEMS LTD.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-foreground transition-colors">AUDIT POLICY</a>
            <a href="#" className="hover:text-foreground transition-colors">STATUTORY UPDATES</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
