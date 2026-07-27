import { redirect } from "next/navigation";
import { Boxes, AlertTriangle, ClipboardList, Clock, CheckCircle2, AlertOctagon } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getAeDashboardData } from "@/lib/queries/ae-dashboard";

export const dynamic = "force-dynamic";

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;
const jobStatusVariant = { open: "danger", in_progress: "warning", resolved: "success", closed: "default" } as const;

export default async function AEDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("substation_id").eq("id", user.id).single();
  if (!profile?.substation_id) return null;

  const { substation, kpis, lowStock, jobCards, serviceRequests } = await getAeDashboardData(profile.substation_id);

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Available Inventory" value={kpis.availableInventory.toLocaleString()} icon={Boxes} />
        <StatCard label="Low Stock" value={kpis.lowStockItems} icon={AlertTriangle} tone="danger" />
        <StatCard label="Open Job Cards" value={kpis.openJobCards} icon={ClipboardList} tone="warning" />
        <StatCard label="Pending Service" value={kpis.pendingServices} icon={Clock} tone="warning" />
        <StatCard label="Equipment Healthy" value={kpis.healthy} icon={CheckCircle2} tone="success" />
        <StatCard label="Needs Attention" value={kpis.serviceRequired + kpis.replacementRequired} icon={AlertOctagon} tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Job Cards</CardTitle>
            <CardDescription>Issues you&apos;ve raised at this substation</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {jobCards.length === 0 ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">
                No job cards yet. Raise one from the Job Cards page.
              </p>
            ) : (
              <div className="space-y-1">
                {jobCards.slice(0, 5).map((jc) => (
                  <div key={jc.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                        <Badge variant={priorityVariant[jc.priority as keyof typeof priorityVariant]} className="capitalize">
                          {jc.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">{jc.equipmentName}</p>
                    </div>
                    <Badge variant={jobStatusVariant[jc.status as keyof typeof jobStatusVariant]} dot className="shrink-0">
                      {jc.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
