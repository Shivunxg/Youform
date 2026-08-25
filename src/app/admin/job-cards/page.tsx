"use client";

import * as React from "react";
import { ClipboardList, Plus, Clock } from "lucide-react";
import { JobCardTimeline, type TimelineData } from "@/components/job-cards/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import { fmtDateIST, fmtIST, ageingDays } from "@/lib/ist";

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

// Valid transitions from each status
const TRANSITIONS: Record<string, string[]> = {
  quotation_shared: ["order_received", "offer_dropped", "order_lost"],
  order_received: ["supply_service_given"],
  supply_service_given: ["bills_submitted"],
  bills_submitted: ["payment_received"],
  offer_dropped: [],
  order_lost: [],
  payment_received: [],
};

interface Row {
  id: string;
  jobCardNumber: string;
  stationId: string;
  stationName: string;
  voltageClass: string | null;
  equipmentType: string | null;
  componentDescription: string | null;
  issueDescription: string;
  priority: string;
  currentStatus: string;
  quotationAmount: number | null;
  orderAmount: number | null;
  remarks: string | null;
  createdAt: string;
  history: TimelineData["history"];
}

export default function AdminJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [ageingThreshold, setAgeingThreshold] = React.useState(30);

  // Status change dialog
  const [statusDialog, setStatusDialog] = React.useState(false);
  const [nextStatus, setNextStatus] = React.useState("");
  const [statusNote, setStatusNote] = React.useState("");
  const [changingStatus, setChangingStatus] = React.useState(false);

  React.useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: jcData }, { data: histData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_card_number, station_id, current_status, priority, issue_description, component_description, quotation_amount, order_amount, remarks, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("status_history")
        .select("job_card_id, to_status, created_at, note, profiles!changed_by(name)")
        .order("created_at", { ascending: true }),
      supabase.from("app_settings").select("key, value"),
    ]);

    if (settingsData) {
      const m: Record<string, string> = {};
      for (const s of settingsData) m[s.key] = s.value;
      if (m["ageing_threshold_days"]) setAgeingThreshold(parseInt(m["ageing_threshold_days"], 10));
    }

    const histByCard = new Map<string, Row["history"]>();
    for (const h of histData ?? []) {
      const list = histByCard.get(h.job_card_id) ?? [];
      list.push({
        toStatus: h.to_status,
        createdAt: h.created_at,
        note: h.note,
        changedByName:
          (h.profiles as unknown as { name: string } | null)?.name ?? null,
      });
      histByCard.set(h.job_card_id, list);
    }

    setRows(
      (jcData ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        stationId: jc.station_id,
        stationName:
          (jc.hierarchy_nodes as unknown as { name: string } | null)?.name ?? "—",
        voltageClass:
          (jc.voltage_classes as unknown as { name: string } | null)?.name ?? null,
        equipmentType:
          (jc.equipment_types as unknown as { name: string } | null)?.name ?? null,
        componentDescription: jc.component_description,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        currentStatus: jc.current_status,
        quotationAmount: jc.quotation_amount,
        orderAmount: jc.order_amount,
        remarks: jc.remarks,
        createdAt: jc.created_at,
        history: histByCard.get(jc.id) ?? [],
      }))
    );
    setLoading(false);
  }

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.stationName.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.currentStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  async function changeStatus() {
    if (!selectedId || !nextStatus) return;
    setChangingStatus(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.rpc("change_job_card_status", {
      p_job_card_id: selectedId,
      p_to_status: nextStatus,
      p_changed_by: user?.id,
      p_note: statusNote || null,
    });
    setChangingStatus(false);
    setStatusDialog(false);
    setStatusNote("");
    setNextStatus("");
    load();
  }

  const transitions = selected ? TRANSITIONS[selected.currentStatus] ?? [] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Service management requests across all stations
          </p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearch={setSearch}
        filters={
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Job Cards ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No job cards"
                description="No job cards match your filters."
              />
            ) : (
              <div className="space-y-1">
                {filtered.map((row) => {
                  const days = ageingDays(row.createdAt);
                  const isAgeing =
                    !["payment_received", "offer_dropped", "order_lost"].includes(
                      row.currentStatus
                    ) && days > ageingThreshold;
                  return (
                    <button
                      key={row.id}
                      onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                      className={`w-full text-left flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-hover/50 -mx-2 px-2 rounded-lg transition-colors ${selectedId === row.id ? "bg-blue-50" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            {row.jobCardNumber}
                          </p>
                          <Badge
                            variant={
                              PRIORITY_VARIANT[row.priority as keyof typeof PRIORITY_VARIANT]
                            }
                            className="capitalize"
                          >
                            {row.priority}
                          </Badge>
                          {isAgeing && (
                            <Badge variant="danger" className="gap-1">
                              <Clock className="h-2.5 w-2.5" /> {days}d
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                          {row.stationName}
                          {row.voltageClass ? ` · ${row.voltageClass}` : ""}
                          {row.equipmentType ? ` · ${row.equipmentType}` : ""}
                          {" · "}
                          {fmtDateIST(row.createdAt)}
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
                  );
                })}
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

              <div className="grid grid-cols-2 gap-4">
                {selected.quotationAmount != null && (
                  <div>
                    <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                      Quotation
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      ₹{selected.quotationAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
                {selected.orderAmount != null && (
                  <div>
                    <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                      Order Value
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      ₹{selected.orderAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>

              {selected.remarks && (
                <div>
                  <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                    Remarks
                  </p>
                  <p className="text-sm text-foreground">{selected.remarks}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">
                  Raised
                </p>
                <p className="text-sm text-foreground">{fmtIST(selected.createdAt)}</p>
              </div>

              {transitions.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {transitions.map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNextStatus(t);
                        setStatusDialog(true);
                      }}
                    >
                      → {STATUS_LABEL[t]}
                    </Button>
                  ))}
                </div>
              )}

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

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Move <strong>{selected?.jobCardNumber}</strong> to{" "}
              <strong>{STATUS_LABEL[nextStatus]}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note about this status change…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={changeStatus} disabled={changingStatus}>
              {changingStatus ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
