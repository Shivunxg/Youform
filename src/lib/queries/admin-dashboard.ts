// @ts-nocheck
import { createClient } from "@/lib/supabase/server";

export async function getAdminDashboardData() {
  const supabase = await createClient();

  const [jobCardsRes, settingsRes, recentRes] = await Promise.all([
    supabase.from("job_cards").select("id, current_status, order_amount, created_at"),
    supabase.from("app_settings").select("key, value"),
    supabase
      .from("job_cards")
      .select(
        "id, job_card_number, current_status, priority, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)"
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const all = jobCardsRes.data ?? [];
  const settings: Record<string, string> = {};
  for (const s of settingsRes.data ?? []) settings[s.key] = s.value;
  const ageingThreshold = parseInt(settings["ageing_threshold_days"] ?? "30", 10);

  const open = ["quotation_shared", "order_received", "supply_service_given"];
  const won = ["order_received", "supply_service_given", "bills_submitted", "payment_received"];
  const lost = ["offer_dropped", "order_lost"];

  const now = Date.now();
  const ageingCount = all.filter((jc) => {
    if (!open.includes(jc.current_status)) return false;
    const days = (now - new Date(jc.created_at).getTime()) / 86400000;
    return days > ageingThreshold;
  }).length;

  const totalWon = all.filter((jc) => won.includes(jc.current_status)).length;
  const totalDecided = all.filter(
    (jc) => won.includes(jc.current_status) || lost.includes(jc.current_status)
  ).length;
  const winRate = totalDecided === 0 ? 0 : Math.round((totalWon / totalDecided) * 100);

  const revenueBilled = all
    .filter((jc) => ["bills_submitted", "payment_received"].includes(jc.current_status))
    .reduce((sum, jc) => sum + (jc.order_amount ?? 0), 0);

  const revenueCollected = all
    .filter((jc) => jc.current_status === "payment_received")
    .reduce((sum, jc) => sum + (jc.order_amount ?? 0), 0);

  const kpis = {
    openJobCards: all.filter((jc) => open.includes(jc.current_status)).length,
    billsSubmitted: all.filter((jc) => jc.current_status === "bills_submitted").length,
    winRate,
    revenueBilled,
    revenueCollected,
    ageingCount,
  };

  const recent = (recentRes.data ?? []).map((jc) => ({
    id: jc.id,
    jobCardNumber: jc.job_card_number,
    stationName:
      (jc.hierarchy_nodes as unknown as { name: string } | null)?.name ?? "—",
    voltageClass: (jc.voltage_classes as unknown as { name: string } | null)?.name ?? null,
    equipmentType: (jc.equipment_types as unknown as { name: string } | null)?.name ?? null,
    priority: jc.priority,
    currentStatus: jc.current_status,
    createdAt: jc.created_at,
  }));

  return { kpis, recent, settings };
}
