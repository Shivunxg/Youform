// @ts-nocheck
"use client";

import * as React from "react";
import { Clock, UserPlus, Users, CheckCircle2 } from "lucide-react";
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
  bills_submitted: "Bills Submitted & Work Completed",
  payment_received: "Payment Received",
};

const STATUS_VARIANT: Record<string, "default" | "accent" | "warning" | "danger" | "success"> = {
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

const TRANSITIONS: Record<string, string[]> = {
  quotation_shared: ["order_received", "offer_dropped", "order_lost"],
  order_received: ["supply_service_given"],
  supply_service_given: ["bills_submitted"],
  bills_submitted: ["payment_received"],
  offer_dropped: [],
  order_lost: [],
  payment_received: [],
};

const CLOSED_STATUSES = ["payment_received", "offer_dropped", "order_lost"];
const OPEN_STATUSES = ["quotation_shared", "order_received", "supply_service_given"];

interface EngineerRef { id: string; name: string }
interface AckInfo { acknowledgedBy: string; createdAt: string }

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
  engineers: EngineerRef[];
  ack: AckInfo | null;
}

function ageBadgeColor(days: number, threshold: number) {
  if (days <= threshold) return "bg-green-50 border-green-200 text-green-700";
  if (days <= threshold * 2) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

function ageRowHighlight(days: number, threshold: number, isOpen: boolean) {
  if (!isOpen) return "";
  if (days <= threshold) return "";
  if (days <= threshold * 2) return "border-l-2 border-l-amber-400";
  return "border-l-2 border-l-red-500";
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

  // Engineer assignment
  const [allEngineers, setAllEngineers] = React.useState<EngineerRef[]>([]);
  const [engDialog, setEngDialog] = React.useState(false);
  const [selectedEngs, setSelectedEngs] = React.useState<Set<string>>(new Set());
  const [savingEngs, setSavingEngs] = React.useState(false);

  // Detail loaded lazily when a card is selected
  const [selectedDetail, setSelectedDetail] = React.useState<{ history: Row["history"]; ack: AckInfo | null } | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  React.useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: jcData }, { data: settingsData }, { data: engData }] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_card_number, station_id, current_status, priority, issue_description, component_description, quotation_amount, order_amount, remarks, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name), job_card_engineers(engineer_id, profiles!engineer_id(id, name))"
        )
        .order("created_at", { ascending: false }),
      supabase.from("app_settings").select("key, value"),
      supabase.from("profiles").select("id, name").eq("role", "service_engineer").eq("status", "active"),
    ]);

    if (settingsData) {
      const m: Record<string, string> = {};
      for (const s of settingsData) m[s.key] = s.value;
      if (m["ageing_threshold_days"]) setAgeingThreshold(parseInt(m["ageing_threshold_days"], 10));
    }

    setAllEngineers((engData ?? []).map((e) => ({ id: e.id, name: e.name })));

    setRows(
      (jcData ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        stationId: jc.station_id,
        stationName: (jc.hierarchy_nodes as { name: string } | null)?.name ?? "—",
        voltageClass: (jc.voltage_classes as { name: string } | null)?.name ?? null,
        equipmentType: (jc.equipment_types as { name: string } | null)?.name ?? null,
        componentDescription: jc.component_description,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        currentStatus: jc.current_status,
        quotationAmount: jc.quotation_amount,
        orderAmount: jc.order_amount,
        remarks: jc.remarks,
        createdAt: jc.created_at,
        history: [],
        engineers: ((jc.job_card_engineers as any[]) ?? []).map((jce) => ({
          id: jce.engineer_id,
          name: (jce.profiles as { name: string } | null)?.name ?? jce.engineer_id,
        })),
        ack: null,
      }))
    );
    setLoading(false);
  }

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    setSelectedDetail(null);
    const [{ data: histData }, { data: ackData }] = await Promise.all([
      supabase
        .from("status_history")
        .select("to_status, created_at, note, profiles!changed_by(name)")
        .eq("job_card_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("work_acknowledgements")
        .select("created_at, profiles!acknowledged_by(name)")
        .eq("job_card_id", id)
        .maybeSingle(),
    ]);
    setSelectedDetail({
      history: (histData ?? []).map((h) => ({
        toStatus: h.to_status,
        createdAt: h.created_at,
        note: h.note,
        changedByName: (h.profiles as any)?.name ?? null,
      })),
      ack: ackData
        ? { acknowledgedBy: (ackData.profiles as any)?.name ?? "KPTCL Engineer", createdAt: ackData.created_at }
        : null,
    });
    setLoadingDetail(false);
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
    if (!selectedId || !nextStatus || !selected) return;
    setChangingStatus(true);
    const { data: { user } } = await supabase.auth.getUser();
    const prevStatus = selected.currentStatus;
    await supabase.rpc("change_job_card_status", {
      p_job_card_id: selectedId,
      p_to_status: nextStatus,
      p_changed_by: user?.id,
      p_note: statusNote || null,
    });

    // Fire emails in background (best-effort)
    const emailBase = {
      jobCardId:        selectedId,
      jobCardNumber:    selected.jobCardNumber,
      stationId:        selected.stationId,
      stationName:      selected.stationName,
      voltageClass:     selected.voltageClass,
      equipmentType:    selected.equipmentType,
      issueDescription: selected.issueDescription,
      fromStatus:       prevStatus,
      toStatus:         nextStatus,
      note:             statusNote || null,
    };
    // Notify assigned engineers + AE of status change
    fetch("/api/email/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "job_card_status_changed", ...emailBase }),
    }).catch(() => {});
    // When service is given, notify KPTCL engineers to acknowledge
    if (nextStatus === "supply_service_given") {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kptcl_ack_required", ...emailBase }),
      }).catch(() => {});
    }

    setChangingStatus(false);
    setStatusDialog(false);
    setStatusNote("");
    setNextStatus("");
    load();
  }

  function openEngDialog() {
    if (!selected) return;
    setSelectedEngs(new Set(selected.engineers.map((e) => e.id)));
    setEngDialog(true);
  }

  async function saveEngineers() {
    if (!selectedId) return;
    setSavingEngs(true);
    const { data: { user } } = await supabase.auth.getUser();

    const prev = new Set((selected?.engineers ?? []).map((e) => e.id));
    const next = selectedEngs;

    const toAdd = [...next].filter((id) => !prev.has(id));
    const toRemove = [...prev].filter((id) => !next.has(id));

    // Remove de-assigned engineers
    if (toRemove.length > 0) {
      await supabase
        .from("job_card_engineers")
        .delete()
        .eq("job_card_id", selectedId)
        .in("engineer_id", toRemove);
    }

    // Add newly assigned engineers
    if (toAdd.length > 0) {
      await supabase.from("job_card_engineers").insert(
        toAdd.map((eid) => ({ job_card_id: selectedId, engineer_id: eid }))
      );
      // In-app notifications for newly assigned engineers
      await supabase.from("notifications_queue").insert(
        toAdd.map((eid) => ({
          target_user_id: eid,
          title: `Assigned to Job Card ${selected?.jobCardNumber ?? ""}`,
          body: `You have been assigned to job card ${selected?.jobCardNumber ?? ""} at ${selected?.stationName ?? ""}${selected?.voltageClass ? " · " + selected.voltageClass : ""}${selected?.equipmentType ? " · " + selected.equipmentType : ""}. Please review the details.`,
          is_read: false,
          created_by: user?.id ?? null,
        }))
      );
    }

    // Notify removed engineers
    if (toRemove.length > 0) {
      await supabase.from("notifications_queue").insert(
        toRemove.map((eid) => ({
          target_user_id: eid,
          title: `Removed from Job Card ${selected?.jobCardNumber ?? ""}`,
          body: `You have been removed from job card ${selected?.jobCardNumber ?? ""} at ${selected?.stationName ?? ""}.`,
          is_read: false,
          created_by: user?.id ?? null,
        }))
      );
    }

    // Email removed engineers
    if (toRemove.length > 0 && selected) {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:          "job_card_unassigned",
          engineerIds:   toRemove,
          jobCardNumber: selected.jobCardNumber,
          stationName:   selected.stationName,
        }),
      }).catch(() => {});
    }

    // Email newly assigned engineers
    if (toAdd.length > 0 && selected) {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:             "job_card_assigned",
          engineerIds:      toAdd,
          jobCardNumber:    selected.jobCardNumber,
          stationName:      selected.stationName,
          voltageClass:     selected.voltageClass,
          equipmentType:    selected.equipmentType,
          issueDescription: selected.issueDescription,
          priority:         selected.priority,
        }),
      }).catch(() => {});
    }

    setSavingEngs(false);
    setEngDialog(false);
    await load();
    if (selectedId) loadDetail(selectedId);
  }

  const transitions = selected ? TRANSITIONS[selected.currentStatus] ?? [] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Service management requests across all stations
        </p>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        right={
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Job Cards ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState title="No job cards" description="No job cards match your filters." />
            ) : (
              <div className="space-y-1">
                {filtered.map((row) => {
                  const days = ageingDays(row.createdAt);
                  const isOpen = OPEN_STATUSES.includes(row.currentStatus);
                  const isAgeing = isOpen && days > ageingThreshold;
                  const rowHighlight = ageRowHighlight(days, ageingThreshold, isOpen);
                  return (
                    <button
                      key={row.id}
                      onClick={() => {
                        if (row.id === selectedId) { setSelectedId(null); setSelectedDetail(null); }
                        else { setSelectedId(row.id); loadDetail(row.id); }
                      }}
                      className={`w-full text-left flex items-start gap-3 py-2.5 border-b border-border last:border-0 hover:bg-hover/50 -mx-2 px-2 rounded-lg transition-colors ${selectedId === row.id ? "bg-blue-50" : ""} ${rowHighlight}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{row.jobCardNumber}</p>
                          <Badge variant={PRIORITY_VARIANT[row.priority as keyof typeof PRIORITY_VARIANT]} className="capitalize">
                            {row.priority}
                          </Badge>
                          {isAgeing && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border ${ageBadgeColor(days, ageingThreshold)}`}>
                              <Clock className="h-2.5 w-2.5" /> {days}d
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                          {row.stationName}
                          {row.voltageClass ? ` · ${row.voltageClass}` : ""}
                          {row.equipmentType ? ` · ${row.equipmentType}` : ""}
                          {" · "}
                          {fmtDateIST(row.createdAt)}
                        </p>
                        {row.engineers.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Users className="h-3 w-3 text-foreground-secondary shrink-0" />
                            {row.engineers.map((e) => (
                              <span key={e.id} className="text-[11px] text-foreground-secondary bg-slate-100 rounded px-1.5 py-0.5">
                                {e.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[row.currentStatus] ?? "default"} dot className="shrink-0 mt-0.5">
                        {STATUS_LABEL[row.currentStatus] ?? row.currentStatus}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
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
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Issue</p>
                <p className="text-sm text-foreground">{selected.issueDescription}</p>
                {selected.componentDescription && (
                  <p className="text-xs text-foreground-secondary mt-1">Component: {selected.componentDescription}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selected.quotationAmount != null && (
                  <div>
                    <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Quotation</p>
                    <p className="text-sm font-medium text-foreground">₹{selected.quotationAmount.toLocaleString("en-IN")}</p>
                  </div>
                )}
                {selected.orderAmount != null && (
                  <div>
                    <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Order Value</p>
                    <p className="text-sm font-medium text-foreground">₹{selected.orderAmount.toLocaleString("en-IN")}</p>
                  </div>
                )}
              </div>

              {selected.remarks && (
                <div>
                  <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Remarks</p>
                  <p className="text-sm text-foreground">{selected.remarks}</p>
                </div>
              )}

              {/* Engineer assignment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold">Assigned Engineers</p>
                  <Button variant="outline" size="sm" onClick={openEngDialog} className="h-6 px-2 text-xs gap-1">
                    <UserPlus className="h-3 w-3" /> Assign
                  </Button>
                </div>
                {selected.engineers.length === 0 ? (
                  <p className="text-xs text-foreground-secondary italic">No engineers assigned yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.engineers.map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-0.5">
                        <Users className="h-3 w-3" /> {e.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* KPTCL Acknowledgement */}
              <div className="rounded-xl border p-3">
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-2">KPTCL Acknowledgement</p>
                {loadingDetail ? (
                  <p className="text-xs text-foreground-secondary italic">Loading…</p>
                ) : selectedDetail?.ack ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Acknowledged by {selectedDetail.ack.acknowledgedBy}</p>
                      <p className="text-xs text-foreground-secondary">{fmtIST(selectedDetail.ack.createdAt)}</p>
                    </div>
                  </div>
                ) : selected.currentStatus === "supply_service_given" ? (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">Awaiting KPTCL acknowledgement before billing.</p>
                  </div>
                ) : (
                  <p className="text-xs text-foreground-secondary italic">Not required at this stage.</p>
                )}
              </div>

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Raised</p>
                <p className="text-sm text-foreground">{fmtIST(selected.createdAt)}</p>
              </div>

              {transitions.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {transitions.map((t) => (
                    <Button key={t} variant="outline" size="sm" onClick={() => { setNextStatus(t); setStatusDialog(true); }}>
                      → {STATUS_LABEL[t]}
                    </Button>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-2">Progress</p>
                {loadingDetail ? (
                  <p className="text-xs text-foreground-secondary italic">Loading timeline…</p>
                ) : (
                  <JobCardTimeline data={{ currentStatus: selected.currentStatus, history: selectedDetail?.history ?? [] }} />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status change dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Move <strong>{selected?.jobCardNumber}</strong> to{" "}
              <strong>{STATUS_LABEL[nextStatus]}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add remarks about this status change…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button onClick={changeStatus} disabled={changingStatus}>
              {changingStatus ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engineer assignment dialog */}
      <Dialog open={engDialog} onOpenChange={setEngDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Service Engineers</DialogTitle>
            <DialogDescription>
              Select engineers for <strong>{selected?.jobCardNumber}</strong>. They will be notified automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-64 overflow-y-auto space-y-2">
            {allEngineers.length === 0 ? (
              <p className="text-sm text-foreground-secondary text-center py-4">No service engineers found. Create users with the Service Engineer role first.</p>
            ) : (
              allEngineers.map((eng) => (
                <label key={eng.id} className="flex items-center gap-3 cursor-pointer hover:bg-hover/40 rounded-lg px-2 py-1.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                    checked={selectedEngs.has(eng.id)}
                    onChange={(e) => {
                      setSelectedEngs((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(eng.id);
                        else next.delete(eng.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-foreground">{eng.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEngDialog(false)}>Cancel</Button>
            <Button onClick={saveEngineers} disabled={savingEngs}>
              {savingEngs ? "Saving…" : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
