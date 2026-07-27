import { createClient } from "@/lib/supabase/server";

export async function getAeDashboardData(substationId: string) {
  const supabase = await createClient();

  const [substationRes, equipmentRes, inventoryRes, jobCardsRes, serviceRequestsRes] = await Promise.all([
    supabase.from("substations").select("*, regions(name)").eq("id", substationId).single(),
    supabase.from("equipment").select("id, name, status").eq("substation_id", substationId),
    supabase
      .from("inventory")
      .select("id, available_qty, min_qty, unit, components(name)")
      .eq("substation_id", substationId),
    supabase
      .from("job_cards")
      .select("id, job_card_number, priority, status, issue_description, created_at, equipment(name)")
      .eq("substation_id", substationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("service_requests")
      .select("id, request_number, type, status, created_at, equipment(name)")
      .eq("substation_id", substationId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const equipment = equipmentRes.data ?? [];
  const inventory = inventoryRes.data ?? [];
  const jobCards = jobCardsRes.data ?? [];
  const serviceRequests = serviceRequestsRes.data ?? [];

  const lowStock = inventory.filter((i) => i.available_qty < i.min_qty);
  const healthCounts = { healthy: 0, service_required: 0, replacement_required: 0 };
  for (const e of equipment) {
    if (e.status in healthCounts) healthCounts[e.status as keyof typeof healthCounts]++;
  }

  return {
    substation: substationRes.data,
    kpis: {
      totalEquipment: equipment.length,
      availableInventory: inventory.reduce((sum, i) => sum + i.available_qty, 0),
      lowStockItems: lowStock.length,
      openJobCards: jobCards.filter((j) => j.status === "open" || j.status === "in_progress").length,
      pendingServices: serviceRequests.filter((s) => s.status === "pending" || s.status === "in_progress").length,
      healthy: healthCounts.healthy,
      serviceRequired: healthCounts.service_required,
      replacementRequired: healthCounts.replacement_required,
    },
    lowStock: lowStock.map((i) => ({
      id: i.id,
      componentName: (i.components as unknown as { name: string } | null)?.name ?? "Unnamed component",
      availableQty: i.available_qty,
      minQty: i.min_qty,
      unit: i.unit,
    })),
    jobCards: jobCards.map((jc) => ({
      id: jc.id,
      jobCardNumber: jc.job_card_number,
      equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
      issueDescription: jc.issue_description,
      priority: jc.priority,
      status: jc.status,
    })),
    serviceRequests: serviceRequests.map((sr) => ({
      id: sr.id,
      requestNumber: sr.request_number,
      equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
      type: sr.type,
      status: sr.status,
    })),
  };
}
