// @ts-nocheck
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications — KTPCL SIMMS" };

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function KPTCLNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/kptcl");

  const { data: notifications } = await supabase
    .from("notifications_queue")
    .select("*")
    .or(`target_role.eq.kptcl_engineer,target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Notifications</h1>
        <p className="text-sm text-foreground-secondary mt-1">Recent alerts and updates for your station</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({notifications?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!notifications?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Bell className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-foreground-secondary">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 py-3 border-b border-border last:border-0 ${!n.is_read ? "bg-blue-50/50 -mx-2 px-2 rounded-lg" : ""}`}
                >
                  <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.is_read ? "bg-accent" : "bg-slate-300"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="text-xs text-foreground-secondary mt-0.5 leading-relaxed">{n.body}</p>}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{fmtRelative(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
