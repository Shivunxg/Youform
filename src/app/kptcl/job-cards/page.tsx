// @ts-nocheck
"use client";

import * as React from "react";
import { CheckCircle2, Clock, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JobCardTimeline, type TimelineData } from "@/components/job-cards/timeline";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { fmtDateIST, fmtIST } from "@/lib/ist";

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

interface AckInfo { id: string; acknowledgedBy: string; notes: string | null; createdAt: string }

interface Row {
  id: string;
  jobCardNumber: string;
  stationName: string;
  voltageClass: string | null;
  equipmentType: string | null;
  componentDescription: string | null;
  issueDescription: string;
  priority: string;
  currentStatus: string;
  createdAt: string;
  history: TimelineData["history"];
  ack: AckInfo | null;
}

export default function KPTCLJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  const [ackDialog, setAckDialog] = React.useState(false);
  const [ackNotes, setAckNotes] = React.useState("");
  const [ackLoading, setAckLoading] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("station_id")
      .eq("id", user.id)
      .single();

    if (!profile?.station_id) { setLoading(false); return; }

    const [{ data: jcData }, { data: histData }, { data: ackData }] = await Promise.all([
      supabase
        .from("job_cards")
        .select("id, job_card_number, station_id, current_status, priority, issue_description, component_description, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)")
        .eq("station_id", profile.station_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("status_history")
        .select("job_card_id, to_status, created_at, note, profiles!changed_by(name)")
        .order("created_at", { ascending: true }),
      supabase
        .from("work_acknowledgements")
        .select("id, job_card_id, notes, created_at, profiles!acknowledged_by(name)"),
    ]);

    const histByCard = new Map<string, Row["history"]>();
    for (const h of histData ?? []) {
      const list = histByCard.get(h.job_card_id) ?? [];
      list.push({ toStatus: h.to_status, createdAt: h.created_at, note: h.note, changedByName: (h.profiles as any)?.name ?? null });
      histByCard.set(h.job_card_id, list);
    }

    const ackByCard = new Map<string, AckInfo>();
    for (const a of ackData ?? []) {
      ackByCard.set(a.job_card_id, {
        id: a.id,
        acknowledgedBy: (a.profiles as any)?.name ?? "KPTCL Engineer",
        notes: a.notes,
        createdAt: a.created_at,
      });
    }

    setRows(
      (jcData ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        stationName: (jc.hierarchy_nodes as any)?.name ?? "—",
        voltageClass: (jc.voltage_classes as any)?.name ?? null,
        equipmentType: (jc.equipment_types as any)?.name ?? null,
        componentDescription: jc.component_description,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        currentStatus: jc.current_status,
        createdAt: jc.created_at,
        history: histByCard.get(jc.id) ?? [],
        ack: ackByCard.get(jc.id) ?? null,
      }))
    );
    setLoading(false);
  }

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.currentStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const canAck = selected?.currentStatus === "supply_service_given" && !selected.ack;

  async function submitAck() {
    if (!selectedId || !userId) return;
    setAckLoading(true);
    await supabase.from("work_acknowledgements").insert({
      job_card_id: selectedId,
      acknowledged_by: userId,
      notes: ackNotes || null,
    });
    setAckLoading(false);
    setAckDialog(false);
    setAckNotes("");
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
        <p className="text-sm text-foreground-secondary mt-1">Service records at your station</p>
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
                {filtered.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    className={`w-full text-left flex items-start gap-3 py-2.5 border-b border-border last:border-0 hover:bg-hover/50 -mx-2 px-2 rounded-lg transition-colors ${selectedId === row.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{row.jobCardNumber}</p>
                        {row.currentStatus === "supply_service_given" && !row.ack && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-700">
                            <Clock className="h-2.5 w-2.5" /> Awaiting Ack
                          </span>
                        )}
                        {row.ack && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-green-50 border-green-200 text-green-700">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Acknowledged
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
                    </div>
                    <Badge variant={STATUS_VARIANT[row.currentStatus] ?? "default"} dot className="shrink-0 mt-0.5">
                      {STATUS_LABEL[row.currentStatus] ?? row.currentStatus}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.jobCardNumber}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Issue</p>
                <p className="text-sm text-foreground">{selected.issueDescription}</p>
                {selected.componentDescription && (
                  <p className="text-xs text-foreground-secondary mt-1">Component: {selected.componentDescription}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Status</p>
                <Badge variant={STATUS_VARIANT[selected.currentStatus] ?? "default"} dot>
                  {STATUS_LABEL[selected.currentStatus] ?? selected.currentStatus}
                </Badge>
              </div>

              {/* Acknowledgement section */}
              <div className="rounded-xl border p-3 space-y-2">
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold">KPTCL Acknowledgement</p>
                {selected.ack ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Acknowledged by {selected.ack.acknowledgedBy}</p>
                      <p className="text-xs text-foreground-secondary">{fmtIST(selected.ack.createdAt)}</p>
                      {selected.ack.notes && (
                        <p className="text-xs text-foreground-secondary mt-1 italic">{selected.ack.notes}</p>
                      )}
                    </div>
                  </div>
                ) : canAck ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">Work has been completed at your station. Please review and acknowledge.</p>
                    </div>
                    <Button size="sm" onClick={() => setAckDialog(true)} className="w-full gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Acknowledge Work Completion
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-foreground-secondary italic">
                    Acknowledgement not required at this stage.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-1">Raised</p>
                <p className="text-sm text-foreground">{fmtIST(selected.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide font-semibold mb-2">Progress</p>
                <JobCardTimeline data={{ currentStatus: selected.currentStatus, history: selected.history }} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={ackDialog} onOpenChange={setAckDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Work Completion</DialogTitle>
            <DialogDescription>
              Confirm that the work described in <strong>{selected?.jobCardNumber}</strong> has been completed satisfactorily at your station.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                rows={3}
                placeholder="Any remarks about the completed work…"
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
              />
            </div>
            <p className="text-xs text-foreground-secondary">
              By submitting, you confirm that you have inspected the work and that it meets the required standards.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialog(false)}>Cancel</Button>
            <Button onClick={submitAck} disabled={ackLoading}>
              {ackLoading ? "Submitting…" : "Submit Acknowledgement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
