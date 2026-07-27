import { createClient } from "@/lib/supabase/server";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getAdminDashboardData() {
  const supabase = await createClient();

  const [
    regionsRes,
    substationsRes,
    equipmentRes,
    componentsRes,
    inventoryRes,
    allJobCardsRes,
    allServiceRequestsRes,
    jobCardsRes,
    serviceRequestsRes,
  ] = await Promise.all([
    supabase.from("regions").select("id, name, status"),
    supabase.from("substations").select("id, name, region_id, status"),
    supabase.from("equipment").select("id, status, substation_id"),
    supabase.from("components").select("id", { count: "exact", head: true }),
    supabase
      .from("inventory")
      .select("id, available_qty, min_qty, unit, component_id, substation_id, components(name), substations(name)"),
    supabase.from("job_cards").select("id, status"),
    supabase.from("service_requests").select("id, type, status, created_at"),
    supabase
      .from("job_cards")
      .select("id, job_card_number, priority, status, created_at, substations(name), equipment(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("service_requests")
      .select("id, request_number, type, status, created_at, substations(name), equipment(name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const regions = regionsRes.data ?? [];
  const substations = substationsRes.data ?? [];
  const equipment = equipmentRes.data ?? [];
  const inventory = inventoryRes.data ?? [];
  const allJobCards = allJobCardsRes.data ?? [];
  const allServiceRequests = allServiceRequestsRes.data ?? [];
  const jobCards = jobCardsRes.data ?? [];
  const serviceRequests = serviceRequestsRes.data ?? [];

  const lowStock = inventory.filter((i) => i.available_qty < i.min_qty);

  const kpis = {
    totalRegions: regions.length,
    totalSubstations: substations.length,
    totalEquipment: equipment.length,
    totalComponents: componentsRes.count ?? 0,
    availableInventory: inventory.reduce((sum, i) => sum + i.available_qty, 0),
    lowStockItems: lowStock.length,
    openJobCards: jobCards_status_count(allJobCards, ["open", "in_progress"]),
    pendingServices: sr_status_count(allServiceRequests, ["pending", "in_progress"]),
    completedServices: sr_status_count(allServiceRequests, ["completed"]),
    replacementRequests: allServiceRequests.filter((s) => s.type === "replacement").length,
    upcomingMaintenance: sr_status_count(allServiceRequests, ["approved"]),
  };

  // region-wise inventory distribution
  const regionMap = new Map(regions.map((r) => [r.id, r.name]));
  const substationRegionMap = new Map(substations.map((s) => [s.id, s.region_id]));
  const inventoryByRegion = new Map<string, number>();
  for (const item of inventory) {
    const regionId = substationRegionMap.get(item.substation_id);
    const regionName = regionId ? regionMap.get(regionId) : undefined;
    if (!regionName) continue;
    inventoryByRegion.set(regionName, (inventoryByRegion.get(regionName) ?? 0) + item.available_qty);
  }
  const inventoryDistribution = Array.from(inventoryByRegion.entries()).map(([region, value]) => ({ region, value }));

  // equipment health distribution
  const healthCounts = { healthy: 0, service_required: 0, replacement_required: 0 };
  for (const e of equipment) {
    if (e.status in healthCounts) healthCounts[e.status as keyof typeof healthCounts]++;
  }
  const equipmentHealthDistribution = [
    { name: "Healthy", value: healthCounts.healthy, color: "#22C55E" },
    { name: "Service Required", value: healthCounts.service_required, color: "#F59E0B" },
    { name: "Replacement Required", value: healthCounts.replacement_required, color: "#EF4444" },
  ];

  // maintenance trend — last 6 months, preventive vs corrective service requests
  const now = new Date();
  const months: { key: string; month: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTH_LABELS[d.getMonth()] });
  }
  const trendMap = new Map(months.map((m) => [m.key, { month: m.month, preventive: 0, corrective: 0 }]));
  for (const sr of allServiceRequests) {
    const d = new Date(sr.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = trendMap.get(key);
    if (!bucket) continue;
    if (sr.type === "preventive") bucket.preventive++;
    else if (sr.type === "corrective") bucket.corrective++;
  }
  const maintenanceTrend = Array.from(trendMap.values());

  return {
    kpis,
    inventoryDistribution,
    equipmentHealthDistribution,
    maintenanceTrend,
    lowStock: lowStock.slice(0, 6).map((i) => ({
      id: i.id,
      componentName: (i.components as unknown as { name: string } | null)?.name ?? "Unnamed component",
      substationName: (i.substations as unknown as { name: string } | null)?.name ?? "Unknown substation",
      availableQty: i.available_qty,
      minQty: i.min_qty,
      unit: i.unit,
    })),
    jobCards: jobCards.map((jc) => ({
      id: jc.id,
      jobCardNumber: jc.job_card_number,
      substationName: (jc.substations as unknown as { name: string } | null)?.name ?? "—",
      equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
      priority: jc.priority,
      status: jc.status,
    })),
    serviceRequests: serviceRequests.map((sr) => ({
      id: sr.id,
      requestNumber: sr.request_number,
      substationName: (sr.substations as unknown as { name: string } | null)?.name ?? "—",
      equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
      status: sr.status,
      type: sr.type,
    })),
  };
}

function jobCards_status_count(rows: { status: string }[], statuses: string[]) {
  return rows.filter((r) => statuses.includes(r.status)).length;
}
function sr_status_count(rows: { status: string }[], statuses: string[]) {
  return rows.filter((r) => statuses.includes(r.status)).length;
}
