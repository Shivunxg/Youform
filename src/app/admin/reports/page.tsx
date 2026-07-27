"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InventoryDistributionChart, MaintenanceTrendChart, EquipmentHealthChart } from "@/components/dashboard/charts";
import { createClient } from "@/lib/supabase/client";

interface DashboardData {
  kpis: {
    totalRegions: number;
    totalSubstations: number;
    totalEquipment: number;
    totalComponents: number;
    availableInventory: number;
    lowStockItems: number;
    openJobCards: number;
    pendingServices: number;
    completedServices: number;
    replacementRequests: number;
    upcomingMaintenance: number;
  };
  inventoryDistribution: { region: string; value: number }[];
  equipmentHealthDistribution: { name: string; value: number; color: string }[];
  maintenanceTrend: { month: string; preventive: number; corrective: number }[];
  lowStock: unknown[];
  jobCards: unknown[];
  serviceRequests: unknown[];
}

export default function AdminReportsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      // Client-side equivalent aggregation (reuses the same shape as the admin dashboard query)
      const [regionsRes, substationsRes, equipmentRes, inventoryRes, serviceRequestsRes] = await Promise.all([
        supabase.from("regions").select("id, name"),
        supabase.from("substations").select("id, name, region_id"),
        supabase.from("equipment").select("id, status"),
        supabase.from("inventory").select("id, available_qty, min_qty, substation_id"),
        supabase.from("service_requests").select("id, type, status, created_at"),
      ]);

      const regions = regionsRes.data ?? [];
      const substations = substationsRes.data ?? [];
      const equipment = equipmentRes.data ?? [];
      const inventory = inventoryRes.data ?? [];
      const serviceRequests = serviceRequestsRes.data ?? [];

      const regionMap = new Map(regions.map((r) => [r.id, r.name]));
      const substationRegionMap = new Map(substations.map((s) => [s.id, s.region_id]));
      const invByRegion = new Map<string, number>();
      for (const item of inventory) {
        const regionId = substationRegionMap.get(item.substation_id);
        const regionName = regionId ? regionMap.get(regionId) : undefined;
        if (!regionName) continue;
        invByRegion.set(regionName, (invByRegion.get(regionName) ?? 0) + item.available_qty);
      }

      const healthCounts = { healthy: 0, service_required: 0, replacement_required: 0 };
      for (const e of equipment) {
        if (e.status in healthCounts) healthCounts[e.status as keyof typeof healthCounts]++;
      }

      const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = new Date();
      const months: { key: string; month: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: monthLabels[d.getMonth()] });
      }
      const trendMap = new Map(months.map((m) => [m.key, { month: m.month, preventive: 0, corrective: 0 }]));
      for (const sr of serviceRequests) {
        const d = new Date(sr.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = trendMap.get(key);
        if (!bucket) continue;
        if (sr.type === "preventive") bucket.preventive++;
        else if (sr.type === "corrective") bucket.corrective++;
      }

      setData({
        kpis: {
          totalRegions: regions.length,
          totalSubstations: substations.length,
          totalEquipment: equipment.length,
          totalComponents: 0,
          availableInventory: inventory.reduce((s, i) => s + i.available_qty, 0),
          lowStockItems: inventory.filter((i) => i.available_qty < i.min_qty).length,
          openJobCards: 0,
          pendingServices: serviceRequests.filter((s) => s.status === "pending" || s.status === "in_progress").length,
          completedServices: serviceRequests.filter((s) => s.status === "completed").length,
          replacementRequests: serviceRequests.filter((s) => s.type === "replacement").length,
          upcomingMaintenance: serviceRequests.filter((s) => s.status === "approved").length,
        },
        inventoryDistribution: Array.from(invByRegion.entries()).map(([region, value]) => ({ region, value })),
        equipmentHealthDistribution: [
          { name: "Healthy", value: healthCounts.healthy, color: "#22C55E" },
          { name: "Service Required", value: healthCounts.service_required, color: "#F59E0B" },
          { name: "Replacement Required", value: healthCounts.replacement_required, color: "#EF4444" },
        ],
        maintenanceTrend: Array.from(trendMap.values()),
        lowStock: [],
        jobCards: [],
        serviceRequests: [],
      });
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Reports</h1>
        <p className="text-sm text-foreground-secondary mt-1">Network-wide analytics computed live from your data</p>
      </div>

      {loading || !data ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-foreground-secondary">Loading reports…</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preventive vs Corrective Maintenance Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <MaintenanceTrendChart data={data.maintenanceTrend} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Equipment Health Status</CardTitle>
              <CardDescription>Network-wide distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <EquipmentHealthChart data={data.equipmentHealthDistribution} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Region-wise Inventory Distribution</CardTitle>
              <CardDescription>Total available stock by region</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {data.inventoryDistribution.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-foreground-secondary">
                  No inventory recorded yet
                </div>
              ) : (
                <InventoryDistributionChart data={data.inventoryDistribution} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
