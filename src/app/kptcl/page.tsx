// @ts-nocheck
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const metadata = { title: "KPTCL Dashboard — KTPCL SIMMS" };

export default async function KPTCLDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/kptcl");

  const { data: profile } = await supabase
    .from("profiles")
    .select("station_id, name")
    .eq("id", user.id)
    .single();

  if (!profile?.station_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <p className="text-sm text-foreground-secondary">Your account is not assigned to a station yet. Contact your Spectrum Consultants administrator.</p>
        </div>
      </div>
    );
  }

  const [
    { data: stationData },
    { count: totalCount },
    { count: pendingAckCount },
    { count: acknowledgedCount },
  ] = await Promise.all([
    supabase.from("hierarchy_nodes").select("name").eq("id", profile.station_id).single(),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).eq("station_id", profile.station_id),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).eq("station_id", profile.station_id).eq("current_status", "supply_service_given"),
    supabase.from("work_acknowledgements")
      .select("id", { count: "exact", head: true })
      .in(
        "job_card_id",
        (await supabase.from("job_cards").select("id").eq("station_id", profile.station_id)).data?.map((j) => j.id) ?? []
      ),
  ]);

  const tiles = [
    {
      label: "Total Job Cards",
      value: totalCount ?? 0,
      icon: ClipboardList,
      color: "text-accent",
      bg: "bg-blue-50",
    },
    {
      label: "Awaiting Your Acknowledgement",
      value: pendingAckCount ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Work Acknowledged",
      value: acknowledgedCount ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">KPTCL Dashboard</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          {stationData?.name ?? "Your Station"} — service job overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground-secondary">{t.label}</CardTitle>
                <div className={`h-9 w-9 rounded-xl ${t.bg} flex items-center justify-center`}>
                  <t.icon className={`h-4 w-4 ${t.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(pendingAckCount ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {pendingAckCount} job card{pendingAckCount !== 1 ? "s" : ""} awaiting your acknowledgement
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Go to Job Cards to review and digitally acknowledge completed work at your station.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
