"use client";

import * as React from "react";
import { HardHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { JobCardTimeline, type TimelineData } from "@/components/job-cards/timeline";
import { createClient } from "@/lib/supabase/client";
import { fmtDateIST, fmtIST } from "@/lib/ist";

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

const PRIORITY_VARIANT = {
  low: "default",
  medium: "accent",
  high: "warning",
  critical: "danger",
} as const;

interface Row {
  id: string;
  jobCardNumber: string;
  stationName: string;
  currentStatus: string;
  priority: string;
  issueDescription: string;
  componentDescription: string | null;
  voltageClass: string | null;
  equipmentType: string | null;
  createdAt: string;
  history: TimelineData["history"];
}

export default function SEJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignments } = await supabase
        .from("job_card_engineers")
        .select(
          "job_card_id, job_cards(id, job_card_number, current_status, priority, issue_description, component_description, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name))"
        )
        .eq("engineer_id", user.id)
        .order("assigned_at", { ascending: false });

      const jobCardIds =
        assignments?.map((a) => (a.job_cards as unknown as { id: string }).id) ?? [];

      const { data: historyData } =
        jobCardIds.length > 0
          ? await supabase
              .from("status_history")
              .select("job_card_id, to_status, created_at, note, profiles!changed_by(name)")
              .in("job_card_id", jobCardIds)
              .order("created_at", { ascending: true })
          : { data: [] };

      const historyByCard = new Map<string, typeof historyData>();
      for (const h of historyData ?? []) {
        const list = historyByCard.get(h.job_card_id) ?? [];
        list.push(h);
        historyByCard.set(h.job_card_id, list);
      }

      setRows(
        (assignments ?? []).map((a) => {
          const jc = a.job_cards as unknown as {
            id: string;
            job_card_number: string;
            current_status: string;
            priority: string;
            issue_description: string;
            component_description: string | null;
            created_at: string;
            hierarchy_nodes: { name: string } | null;
            voltage_classes: { name: string } | null;
            equipment_types: { name: string } | null;
          };
          const hist = (historyByCard.get(jc.id) ?? []).map((h) => ({
            toStatus: h.to_status,
            createdAt: h.created_at,
            note: h.note,
            changedByName:
              (h.profiles as unknown as { name: string } | null)?.name ?? null,
          }));
          return {
            id: jc.id,
            jobCardNumber: jc.job_card_number,
            stationName: jc.hierarchy_nodes?.name ?? "—",
            currentStatus: jc.current_status,
            priority: jc.priority,
            issueDescription: jc.issue_description,
            componentDescription: jc.component_description,
            voltageClass: jc.voltage_classes?.name ?? null,
            equipmentType: jc.equipment_types?.name ?? null,
            createdAt: jc.created_at,
            history: hist,
          };
        })
      );
      setLoading(false);
    })();
  }, [supabase]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">My Jobs</h1>
        <p className="text-sm text-foreground-secondary mt-1">Job cards assigned to you</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Assigned Jobs ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-foreground-secondary">
                <HardHat className="h-8 w-8 text-slate-300" />
                <p className="text-sm">No jobs assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rows.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    className={`w-full text-left flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-hover/50 -mx-2 px-2 rounded-lg transition-colors ${selectedId === row.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{row.jobCardNumber}</p>
                        <Badge
                          variant={
                            PRIORITY_VARIANT[row.priority as keyof typeof PRIORITY_VARIANT]
                          }
                          className="capitalize"
                        >
                          {row.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                        {row.stationName} · {fmtDateIST(row.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[row.currentStatus] ?? "default"}
                      dot
                      className="shrink-0"
                    >
                      {STATUS_LABEL[row.currentStatus] ?? row.currentStatus}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.jobCardNumber}</CardTitle>
              <CardDescription>
                {selected.stationName}
                {selected.voltageClass ? ` · ${selected.voltageClass}` : ""}
                {selected.equipmentType ? ` · ${selected.equipmentType}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                  Issue
                </p>
                <p className="text-sm text-foreground">{selected.issueDescription}</p>
                {selected.componentDescription && (
                  <p className="text-xs text-foreground-secondary mt-1">
                    Component: {selected.componentDescription}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                  Raised
                </p>
                <p className="text-sm text-foreground">{fmtIST(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-2">
                  Progress
                </p>
                <JobCardTimeline
                  data={{ currentStatus: selected.currentStatus, history: selected.history }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
