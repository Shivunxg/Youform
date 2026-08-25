// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [jobCardsRes, settingsRes] = await Promise.all([
    supabase
      .from("job_cards")
      .select(
        "id, job_card_number, current_status, priority, order_amount, quotation_amount, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("app_settings").select("key, value"),
  ]);

  const all = jobCardsRes.data ?? [];
  const settings: Record<string, string> = {};
  for (const s of settingsRes.data ?? []) settings[s.key] = s.value;
  const threshold = parseInt(settings["ageing_threshold_days"] ?? "30", 10);

  const open = ["quotation_shared", "order_received", "supply_service_given"];
  const won = ["order_received", "supply_service_given", "bills_submitted", "payment_received"];
  const lost = ["offer_dropped", "order_lost"];

  const totalDecided = all.filter(
    (jc) => won.includes(jc.current_status) || lost.includes(jc.current_status)
  ).length;
  const totalWon = all.filter((jc) => won.includes(jc.current_status)).length;
  const winRate = totalDecided === 0 ? 0 : Math.round((totalWon / totalDecided) * 100);

  const revenueBilled = all
    .filter((jc) => ["bills_submitted", "payment_received"].includes(jc.current_status))
    .reduce((s, jc) => s + (jc.order_amount ?? 0), 0);
  const revenueCollected = all
    .filter((jc) => jc.current_status === "payment_received")
    .reduce((s, jc) => s + (jc.order_amount ?? 0), 0);

  const ageing = all.filter(
    (jc) => open.includes(jc.current_status) && ageingDays(jc.created_at) > threshold
  );

  const byStatus = new Map<string, number>();
  for (const jc of all) byStatus.set(jc.current_status, (byStatus.get(jc.current_status) ?? 0) + 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Reports</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Service management metrics · {all.length} total job cards
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: "Open", value: all.filter((jc) => open.includes(jc.current_status)).length, cls: "text-amber-600" },
          { label: "Bills Submitted", value: all.filter((jc) => jc.current_status === "bills_submitted").length, cls: "text-amber-600" },
          { label: "Win Rate", value: `${winRate}%`, cls: "text-green-600" },
          { label: "Revenue Billed", value: fmtRupee(revenueBilled), cls: "text-foreground" },
          { label: "Collected", value: fmtRupee(revenueCollected), cls: "text-green-600" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-foreground-secondary">{t.label}</p>
            <p className={`text-xl font-bold mt-1 ${t.cls}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>All job cards by current status</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Object.entries(STATUS_LABEL).map(([status, label]) => {
              const count = byStatus.get(status) ?? 0;
              const pct = all.length === 0 ? 0 : Math.round((count / all.length) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <Badge variant={STATUS_VARIANT[status]} dot>
                      {label}
                    </Badge>
                  </div>
                  <div className="flex-1 rounded-full bg-slate-100 h-2">
                    <div
                      className="rounded-full h-2 bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ageing list */}
      {ageing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ageing Job Cards</CardTitle>
            <CardDescription>
              Open more than {threshold} days · {ageing.length} card{ageing.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {ageing.map((jc) => {
                const days = ageingDays(jc.created_at);
                return (
                  <div
                    key={jc.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{jc.job_card_number}</p>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                        {(jc.hierarchy_nodes as unknown as { name: string } | null)?.name ?? "—"}
                        {" · "}
                        {fmtDateIST(jc.created_at)}
                      </p>
                    </div>
                    <Badge variant="danger">{days}d old</Badge>
                    <Badge variant={STATUS_VARIANT[jc.current_status] ?? "default"} dot>
                      {STATUS_LABEL[jc.current_status] ?? jc.current_status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
