// @ts-nocheck
import { createClient } from "@/lib/supabase/server";

export async function getAeDashboardData(stationId: string) {
  const supabase = await createClient();

  const [stationRes, jobCardsRes, settingsRes] = await Promise.all([
    supabase
      .from("hierarchy_nodes")
      .select("id, name, code, parent_id")
      .eq("id", stationId)
      .single(),
    supabase
      .from("job_cards")
      .select(
        "id, job_card_number, current_status, priority, created_at, voltage_classes(name), equipment_types(name)"
      )
      .eq("station_id", stationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("app_settings").select("key, value"),
  ]);

  const settings: Record<string, string> = {};
  for (const s of settingsRes.data ?? []) settings[s.key] = s.value;
  const ageingThreshold = parseInt(settings["ageing_threshold_days"] ?? "30", 10);

  const open = ["quotation_shared", "order_received", "supply_service_given"];
  const now = Date.now();
  const allCards = jobCardsRes.data ?? [];

  const kpis = {
    openJobCards: allCards.filter((jc) => open.includes(jc.current_status)).length,
    billsSubmitted: allCards.filter((jc) => jc.current_status === "bills_submitted").length,
    paymentReceived: allCards.filter((jc) => jc.current_status === "payment_received").length,
    ageingCount: allCards.filter((jc) => {
      if (!open.includes(jc.current_status)) return false;
      return (now - new Date(jc.created_at).getTime()) / 86400000 > ageingThreshold;
    }).length,
  };

  const jobCards = allCards.map((jc) => ({
    id: jc.id,
    jobCardNumber: jc.job_card_number,
    currentStatus: jc.current_status,
    priority: jc.priority,
    voltageClass: (jc.voltage_classes as unknown as { name: string } | null)?.name ?? null,
    equipmentType: (jc.equipment_types as unknown as { name: string } | null)?.name ?? null,
    createdAt: jc.created_at,
  }));

  return { station: stationRes.data, kpis, jobCards, ageingThreshold };
}
