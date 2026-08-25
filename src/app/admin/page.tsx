import {
  ClipboardList,
  Receipt,
  TrendingUp,
  IndianRupee,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminDashboardData } from "@/lib/queries/admin-dashboard";
import { fmtDateIST, ageingDays } from "@/lib/ist";

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

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default async function AdminDashboardPage() {
  const { kpis, recent, settings } = await getAdminDashboardData();
  const ageingThreshold = parseInt(settings["ageing_threshold_days"] ?? "30", 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          KTPCL service management overview · Live data
        </p>
      </div>

      {kpis.ageingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{kpis.ageingCount}</strong> job card{kpis.ageingCount !== 1 ? "s" : ""} open
            for more than {ageingThreshold} days and need attention.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Open Job Cards" value={kpis.openJobCards} icon={ClipboardList} tone="warning" />
        <StatCard label="Bills Submitted" value={kpis.billsSubmitted} icon={Receipt} tone="warning" />
        <StatCard label="Win Rate" value={`${kpis.winRate}%`} icon={TrendingUp} tone="success" />
        <StatCard label="Revenue Billed" value={fmtRupee(kpis.revenueBilled)} icon={IndianRupee} />
        <StatCard label="Revenue Collected" value={fmtRupee(kpis.revenueCollected)} icon={IndianRupee} tone="success" />
        <StatCard label="Ageing (>{ageingThreshold}d)" value={kpis.ageingCount} icon={Clock} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Job Cards</CardTitle>
          <CardDescription>Latest across all stations</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <p className="text-sm text-foreground-secondary py-6 text-center">
              No job cards yet.
            </p>
          ) : (
            <div className="space-y-1">
              {recent.map((jc) => {
                const ageing = ageingDays(jc.createdAt);
                const isAgeing =
                  !["payment_received", "offer_dropped", "order_lost"].includes(
                    jc.currentStatus
                  ) && ageing > ageingThreshold;
                return (
                  <div
                    key={jc.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                        <Badge
                          variant={
                            PRIORITY_VARIANT[jc.priority as keyof typeof PRIORITY_VARIANT]
                          }
                          className="capitalize"
                        >
                          {jc.priority}
                        </Badge>
                        {isAgeing && (
                          <Badge variant="danger" className="gap-1">
                            <Clock className="h-2.5 w-2.5" /> {ageing}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                        {jc.stationName}
                        {jc.voltageClass ? ` · ${jc.voltageClass}` : ""}
                        {jc.equipmentType ? ` · ${jc.equipmentType}` : ""}
                        {" · "}
                        {fmtDateIST(jc.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[jc.currentStatus] ?? "default"}
                      dot
                      className="shrink-0"
                    >
                      {STATUS_LABEL[jc.currentStatus] ?? jc.currentStatus}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
