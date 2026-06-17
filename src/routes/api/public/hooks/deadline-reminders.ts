import { createFileRoute } from "@tanstack/react-router";
import { computeDeadlines } from "@/lib/deadlines";

// Public webhook called by pg_cron daily.
// Inserts in-app notifications for company members about upcoming/overdue
// statutory deadlines (NAPSA/PAYE/NHIMA/WCFCB). De-duplicated per day.
export const Route = createFileRoute("/api/public/hooks/deadline-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Load all companies and their members
        const { data: members, error } = await supabaseAdmin
          .from("company_members")
          .select("user_id, company_id, companies(name)");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const deadlines = computeDeadlines().filter((d) =>
          [0, 1, 5].includes(d.daysUntil) || (d.overdue && d.daysUntil >= -1),
        );

        const today = new Date().toISOString().slice(0, 10);
        let inserted = 0;

        for (const m of members ?? []) {
          const companyName = (m as { companies?: { name: string } | null }).companies?.name ?? "Company";
          for (const d of deadlines) {
            const tag = `${d.body}-${d.periodLabel}-${d.daysUntil}`;
            const title =
              d.daysUntil === 0
                ? `${d.body} due today · ${companyName}`
                : d.overdue
                  ? `${d.body} overdue · ${companyName}`
                  : `${d.body} due in ${d.daysUntil} day${d.daysUntil === 1 ? "" : "s"} · ${companyName}`;
            const message = `${d.body} statutory filing for period ${d.periodLabel} is due ${d.dueDate.toDateString()}.`;

            // De-dupe: skip if same user already has this exact title today
            const { data: existing } = await supabaseAdmin
              .from("notifications")
              .select("id")
              .eq("user_id", m.user_id)
              .eq("title", title)
              .gte("created_at", `${today}T00:00:00Z`)
              .maybeSingle();
            if (existing) continue;

            const { error: insErr } = await supabaseAdmin.from("notifications").insert({
              user_id: m.user_id,
              company_id: m.company_id,
              type: d.overdue ? "deadline.overdue" : "deadline.reminder",
              title,
              message,
            });
            if (!insErr) inserted++;
            // tag is included implicitly in title; reserved for future metadata column
            void tag;
          }
        }

        return Response.json({ ok: true, inserted, deadlines: deadlines.length, members: members?.length ?? 0 });
      },
    },
  },
});
