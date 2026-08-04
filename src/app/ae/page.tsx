import { redirect } from "next/navigation";
import Link from "next/link";
import { Boxes, AlertTriangle, ClipboardList, Clock, CheckCircle2, AlertOctagon, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getAeDashboardData } from "@/lib/queries/ae-dashboard";

export const dynamic = "force-dynamic";

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;

const STAGE_LABEL: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  inspecting: "Inspecting",
  mom_logged: "MOM Logged",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STAGE_VARIANT: Record<string, "default" | "accent" | "warning" | "danger" | "success"> = {
  open: "danger",
  assigned: "accent",
  inspecting: "accent",
  mom_logged: "accent",
  estimate_sent: "warning",
  approved: "success",
  rejected: "danger",
  closed: "default",
  in_progress: "warning",
  resolved: "success",
};

export default async function AEDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("substation_id").eq("id", user.id).single();
  if (!profile?.substation_id) return null;

  const { substation, kpis, lowStock, jobCards } = await getAeDashboardData(profile.substation_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {substation?.name ?? "My Substation"}
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">
          {substation?.code} · {(substation as unknown as { regions?: { name: string } })?.regions?.name ?? ""}
        </p>
      </div>

      {/* Job Cards — prominent, clickable */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Job Cards</CardTitle>
            <CardDescription>Issues you&apos;ve raised at this substation</CardDescription>
          </div>
          <Link href="/ae/job-cards" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline shrink-0">
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
                      <Badge variant={priorityVariant[jc.priority as keyof typeof priorityVariant]} className="capitalize">
                        {jc.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-secondary mt-0.5 truncate">{jc.equipmentName}</p>
                  </div>
                  <Badge variant={STAGE_VARIANT[jc.status] ?? "default"} dot className="shrink-0">
                    {STAGE_LABEL[jc.status] ?? jc.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Available Inventory" value={kpis.availableInventory.toLocaleString()} icon={Boxes} />
        <StatCard label="Low Stock" value={kpis.lowStockItems} icon={AlertTriangle} tone="danger" />
        <StatCard label="Open Job Cards" value={kpis.openJobCards} icon={ClipboardList} tone="warning" />
        <StatCard label="Pending Service" value={kpis.pendingServices} icon={Clock} tone="warning" />
        <StatCard label="Equipment Healthy" value={kpis.healthy} icon={CheckCircle2} tone="success" />
        <StatCard label="Needs Attention" value={kpis.serviceRequired + kpis.replacementRequired} icon={AlertOctagon} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Components</CardTitle>
          <CardDescription>Below minimum threshold at your substation</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {lowStock.length === 0 ? (
            <p className="text-sm text-foreground-secondary py-6 text-center">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-1">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <p className="text-sm font-medium text-foreground">{item.componentName}</p>
                  <Badge variant="danger">
                    {item.availableQty}/{item.minQty} {item.unit}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
