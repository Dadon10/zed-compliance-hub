import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked read");
    },
  });

  const unread = items?.filter((n) => !n.read).length ?? 0;

  return (
    <div>
      <header className="h-16 border-b flex items-center justify-between px-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">Inbox</p>
          <h1 className="text-lg font-bold tracking-tight">Notifications {unread > 0 && <span className="text-copper">({unread})</span>}</h1>
        </div>
        {unread > 0 && (
          <button onClick={() => markAll.mutate()} className="px-4 py-2 border text-sm font-medium rounded-[4px] hover:bg-muted inline-flex items-center gap-2">
            <CheckCheck className="size-4" /> Mark all read
          </button>
        )}
      </header>

      <div className="p-8">
        {!items?.length ? (
          <div className="border rounded-xl p-12 text-center text-foreground/50">
            <Bell className="size-10 mx-auto mb-3 text-foreground/30" />
            No notifications yet.
          </div>
        ) : (
          <div className="border rounded-xl divide-y">
            {items.map((n) => (
              <div key={n.id} className={`px-6 py-4 flex items-start justify-between gap-4 ${!n.read ? "bg-emerald-soft/20" : ""}`}>
                <div className="flex gap-3 items-start">
                  <span className={`mt-1 size-2 rounded-full shrink-0 ${!n.read ? "bg-emerald-deep" : "bg-foreground/20"}`} />
                  <div>
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.message && <p className="text-xs text-foreground/60 mt-1">{n.message}</p>}
                    <p className="text-[10px] font-mono text-foreground/40 mt-2">{new Date(n.created_at).toLocaleString()} · {n.type}</p>
                  </div>
                </div>
                {!n.read && (
                  <button onClick={() => markRead.mutate(n.id)} className="text-xs text-emerald-deep hover:underline inline-flex items-center gap-1">
                    <Check className="size-3" /> Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-foreground/40">
          Notifications are created automatically when payroll is uploaded or a submission status changes. <Link to="/payroll" className="underline">Trigger one</Link> by uploading payroll.
        </p>
      </div>
    </div>
  );
}
