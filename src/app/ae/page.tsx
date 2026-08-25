import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Receipt, CheckCircle2, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getAeDashboardData } from "@/lib/queries/ae-dashboard";
import { fmtDateIST } from "@/lib/ist";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quotation_shared: "Quotation Shared",
  order_received: "Order Received",
  offer_dropped: "Offer Dropped",
  order_lost: "Order Lost",
  supply_service_given: "Supply / Service Given",
  bills_submitted: "Bills Submitted",
  payment_received: "Payment Received",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "accent" | "warning" | "danger" | "success"
> = {
  quotation_shared: "accent",
  order_received: "warning",
  offer_dropped: "danger",
  order_lost: "danger",
  supply_service_given: "warning",
  bills_submitted: "warning",
  payment_received: "success",
};

const PRIORITY_VARIANT = {
  low: "default",
  medium: "accent",
  high: "warning",
  critical: "danger",
} as const;

export default async function AEDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("station_id")
    .eq("id", user.id)
    .single();

  if (!profile?.station_id) return null;

  const { station, kpis, jobCards, ageingThreshold } = await getAeDashboardData(
    profile.station_id
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {station?.name ?? "My Station"}
        </h1>
        {station?.code && (
          <p className="text-sm text-foreground-secondary mt-1">{station.code}</p>
        )}
      </div>

      {kpis.ageingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{kpis.ageingCount}</strong> job card{kpis.ageingCount !== 1 ? "s" : ""} open
            for more than {ageingThreshold} days.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Open Job Cards" value={kpis.openJobCards} icon={ClipboardList} tone="warning" />
        <StatCard label="Bills Submitted" value={kpis.billsSubmitted} icon={Receipt} tone="warning" />
        <StatCard label="Payment Received" value={kpis.paymentReceived} icon={CheckCircle2} tone="success" />
        <StatCard label={`Ageing >${ageingThreshold}d`} value={kpis.ageingCount} icon={Clock} tone="danger" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Job Cards</CardTitle>
            <CardDescription>Service requests at this station</CardDescription>
          </div>
          <Link
            href="/ae/job-cards"
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline shrink-0"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {jobCards.length === 0 ? (
            <Link
              href="/ae/job-cards"
              className="block text-sm text-foreground-secondary py-6 text-center hover:text-accent transition-colors"
            >
              No job cards yet. Click here to raise one.
            </Link>
          ) : (
            <div className="space-y-1">
              {jobCards.slice(0, 5).map((jc) => (
                <Link
                  key={jc.id}
                  href="/ae/job-cards"
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-hover/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                      <Badge
                        variant={
                          PRIORITY_VARIANT[jc.priority as keyof typeof PRIORITY_VARIANT]
                        }
                        className="capitalize"
                      >
                        {jc.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                      {jc.voltageClass ?? "—"}
                      {jc.equipmentType ? ` · ${jc.equipmentType}` : ""}
                      {" · "}
                      {fmtDateIST(jc.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[jc.currentStatus] ?? "default"} dot className="shrink-0">
                    {STATUS_LABEL[jc.currentStatus] ?? jc.currentStatus}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
