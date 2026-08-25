// @ts-nocheck
import { createClient } from "@/lib/supabase/server";

const open = ["quotation_shared", "order_received", "supply_service_given"];
const won  = ["order_received", "supply_service_given", "bills_submitted", "payment_received"];
const lost = ["offer_dropped", "order_lost"];

export async function getAdminDashboardData() {
  const supabase = await createClient();

  const [
    settingsRes, recentRes,
    openCountRes, billsCountRes, wonCountRes, lostCountRes,
    revenueRes, collectedRes, openCardsRes,
  ] = await Promise.all([
    supabase.from("app_settings").select("key, value"),
    supabase
      .from("job_cards")
      .select("id, job_card_number, current_status, priority, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).in("current_status", open),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).eq("current_status", "bills_submitted"),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).in("current_status", won),
    supabase.from("job_cards").select("id", { count: "exact", head: true }).in("current_status", lost),
    supabase.from("job_cards").select("order_amount").in("current_status", ["bills_submitted", "payment_received"]),
    supabase.from("job_cards").select("order_amount").eq("current_status", "payment_received"),
    // Only open cards with created_at for ageing — much smaller than all cards
    supabase.from("job_cards").select("created_at").in("current_status", open),
  ]);

  const settings: Record<string, string> = {};
  for (const s of settingsRes.data ?? []) settings[s.key] = s.value;
  const ageingThreshold = parseInt(settings["ageing_threshold_days"] ?? "30", 10);

  const now = Date.now();
  const ageingCount = (openCardsRes.data ?? []).filter((jc) => {
    const days = (now - new Date(jc.created_at).getTime()) / 86400000;
    return days > ageingThreshold;
  }).length;

  const totalDecided = (wonCountRes.count ?? 0) + (lostCountRes.count ?? 0);
  const winRate = totalDecided === 0 ? 0 : Math.round(((wonCountRes.count ?? 0) / totalDecided) * 100);

  const kpis = {
    openJobCards:     openCountRes.count ?? 0,
    billsSubmitted:   billsCountRes.count ?? 0,
    winRate,
    revenueBilled:    (revenueRes.data ?? []).reduce((s, jc) => s + (jc.order_amount ?? 0), 0),
    revenueCollected: (collectedRes.data ?? []).reduce((s, jc) => s + (jc.order_amount ?? 0), 0),
    ageingCount,
  };

  const recent = (recentRes.data ?? []).map((jc) => ({
    id: jc.id,
    jobCardNumber: jc.job_card_number,
    stationName:   (jc.hierarchy_nodes as unknown as { name: string } | null)?.name ?? "—",
    voltageClass:  (jc.voltage_classes as unknown as { name: string } | null)?.name ?? null,
    equipmentType: (jc.equipment_types as unknown as { name: string } | null)?.name ?? null,
    priority:      jc.priority,
    currentStatus: jc.current_status,
    createdAt:     jc.created_at,
  }));

  return { kpis, recent, settings };
}
