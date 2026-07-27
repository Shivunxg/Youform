import {
  MapPin,
  Building2,
  Cpu,
  PuzzleIcon,
  Boxes,
  AlertTriangle,
  ClipboardList,
  Clock,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { InventoryDistributionChart, MaintenanceTrendChart, EquipmentHealthChart } from "@/components/dashboard/charts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminDashboardData } from "@/lib/queries/admin-dashboard";

const priorityVariant = {
  low: "default",
  medium: "accent",
  high: "warning",
  critical: "danger",
} as const;

const jobStatusVariant = {
  open: "danger",
  in_progress: "warning",
  resolved: "success",
  closed: "default",
} as const;

const jobStatusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { kpis, inventoryDistribution, equipmentHealthDistribution, maintenanceTrend, lowStock, jobCards, serviceRequests } =
    await getAdminDashboardData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Network-wide overview across all regions and substations · Live data
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Regions" value={kpis.totalRegions} icon={MapPin} />
        <StatCard label="Substations" value={kpis.totalSubstations} icon={Building2} />
        <StatCard label="Equipment" value={kpis.totalEquipment} icon={Cpu} />
        <StatCard label="Components" value={kpis.totalComponents} icon={PuzzleIcon} />
        <StatCard label="Available Inventory" value={kpis.availableInventory.toLocaleString()} icon={Boxes} />
        <StatCard label="Low Stock Items" value={kpis.lowStockItems} icon={AlertTriangle} tone="danger" />
        <StatCard label="Open Job Cards" value={kpis.openJobCards} icon={ClipboardList} tone="warning" />
        <StatCard label="Pending Services" value={kpis.pendingServices} icon={Clock} tone="warning" />
        <StatCard label="Completed Services" value={kpis.completedServices} icon={CheckCircle2} tone="success" />
        <StatCard label="Replacement Requests" value={kpis.replacementRequests} icon={RefreshCw} tone="danger" />
        <StatCard label="Upcoming Maintenance" value={kpis.upcomingMaintenance} icon={CalendarClock} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preventive vs Corrective Maintenance Trend</CardTitle>
            <CardDescription>Last 6 months across all regions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <MaintenanceTrendChart data={maintenanceTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equipment Health Status</CardTitle>
            <CardDescription>Network-wide distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <EquipmentHealthChart data={equipmentHealthDistribution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Region-wise Inventory Distribution</CardTitle>
            <CardDescription>Total component stock by region</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {inventoryDistribution.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-foreground-secondary">
                No inventory recorded yet
              </div>
            ) : (
              <InventoryDistributionChart data={inventoryDistribution} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Components</CardTitle>
            <CardDescription>Below minimum threshold</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {lowStock.length === 0 ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">No low stock items right now.</p>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.componentName}</p>
                    <p className="text-xs text-foreground-secondary truncate">{item.substationName}</p>
                  </div>
                  <Badge variant="danger" className="shrink-0 ml-2">
                    {item.availableQty}/{item.minQty} {item.unit}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Job Cards</CardTitle>
              <CardDescription>Latest issues raised across substations</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {jobCards.length === 0 ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">
                No job cards yet. They&apos;ll appear here as soon as an Assistant Engineer raises one.
              </p>
            ) : (
              <div className="space-y-1">
                {jobCards.map((jc) => (
                  <div key={jc.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                        <Badge variant={priorityVariant[jc.priority as keyof typeof priorityVariant]} className="capitalize">
                          {jc.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                        {jc.substationName} · {jc.equipmentName}
                      </p>
                    </div>
                    <Badge variant={jobStatusVariant[jc.status as keyof typeof jobStatusVariant]} dot className="shrink-0">
                      {jobStatusLabel[jc.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Service Requests</CardTitle>
            <CardDescription>Preventive, corrective &amp; replacement requests</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {serviceRequests.length === 0 ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">
                No service requests yet. They&apos;ll appear here once submitted.
              </p>
            ) : (
              <div className="space-y-1">
                {serviceRequests.map((sr) => (
                  <div key={sr.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{sr.requestNumber}</p>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                        {sr.substationName} · {sr.equipmentName}
                      </p>
                    </div>
                    <Badge
                      variant={
                        sr.status === "completed"
                          ? "success"
                          : sr.status === "pending"
                          ? "warning"
                          : sr.status === "rejected"
                          ? "danger"
                          : "accent"
                      }
                      className="shrink-0 capitalize"
                    >
                      {sr.status.replace("_", " ")}
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
