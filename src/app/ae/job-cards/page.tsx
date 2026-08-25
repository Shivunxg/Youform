// @ts-nocheck
"use client";

import * as React from "react";
import { ClipboardList, Plus } from "lucide-react";
import { JobCardTimeline, type TimelineData } from "@/components/job-cards/timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
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

interface VoltageClass { id: string; name: string }
interface EquipmentType { id: string; voltage_class_id: string; name: string }
interface Component { id: string; equipment_type_id: string; name: string }

export default function AEJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [stationId, setStationId] = React.useState<string | null>(null);

  const [newDialog, setNewDialog] = React.useState(false);
  const [voltageClasses, setVoltageClasses] = React.useState<VoltageClass[]>([]);
  const [equipmentTypes, setEquipmentTypes] = React.useState<EquipmentType[]>([]);
  const [components, setComponents] = React.useState<Component[]>([]);
  const [form, setForm] = React.useState({
    voltageClassId: "",
    equipmentTypeId: "",
    componentId: "",
    componentDescription: "",
    issueDescription: "",
    priority: "medium",
    quotationAmount: "",
    remarks: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("station_id")
        .eq("id", user.id)
        .single();
      if (profile?.station_id) {
        setStationId(profile.station_id);
        loadData(profile.station_id, user.id);
      }
    })();
  }, []);

  async function loadData(sid: string, uid: string) {
    setLoading(true);
    const [{ data: jcData }, { data: histData }, { data: vcData }] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_card_number, current_status, priority, issue_description, component_description, quotation_amount, order_amount, remarks, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)"
        )
        .eq("station_id", sid)
        .order("created_at", { ascending: false }),
      supabase
        .from("status_history")
        .select("job_card_id, to_status, created_at, note, profiles!changed_by(name)")
        .order("created_at", { ascending: true }),
      supabase.from("voltage_classes").select("id, name").eq("station_id", sid),
    ]);

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

    setVoltageClasses(vcData ?? []);
    setRows(
      (jcData ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
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

  async function loadEquipmentTypes(vcId: string) {
    const { data } = await supabase
      .from("equipment_types")
      .select("id, voltage_class_id, name")
      .eq("voltage_class_id", vcId);
    setEquipmentTypes(data ?? []);
    setComponents([]);
  }

  async function loadComponents(etId: string) {
    const { data } = await supabase
      .from("equipment_components")
      .select("id, equipment_type_id, name")
      .eq("equipment_type_id", etId);
    setComponents(data ?? []);
  }

  async function handleCreate() {
    if (!stationId || !form.issueDescription.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("job_cards").insert({
      station_id: stationId,
      voltage_class_id: form.voltageClassId || null,
      equipment_type_id: form.equipmentTypeId || null,
      component_id: form.componentId || null,
      component_description: form.componentId ? null : (form.componentDescription || null),
      issue_description: form.issueDescription,
      priority: form.priority,
      quotation_amount: form.quotationAmount ? parseFloat(form.quotationAmount) : null,
      remarks: form.remarks || null,
      raised_by: user?.id,
      current_status: "quotation_shared",
    });
    setSaving(false);
    setNewDialog(false);
    setForm({
      voltageClassId: "",
      equipmentTypeId: "",
      componentId: "",
      componentDescription: "",
      issueDescription: "",
      priority: "medium",
      quotationAmount: "",
      remarks: "",
    });
    if (stationId && user) loadData(stationId, user.id);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
          <p className="text-sm text-foreground-secondary mt-1">Service requests at your station</p>
        </div>
        <Button onClick={() => setNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Raise Job Card
        </Button>
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
            <CardTitle>My Job Cards ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-foreground-secondary py-6 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No job cards"
                description="Raise a job card to track a service request."
              />
            ) : (
              <div className="space-y-1">
                {filtered.map((row) => (
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
                        {row.voltageClass ?? "—"}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{selected.jobCardNumber}</CardTitle>
                  <p className="text-xs text-foreground-secondary mt-0.5">
                    {selected.voltageClass ?? "—"}
                    {selected.equipmentType ? ` · ${selected.equipmentType}` : ""}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[selected.currentStatus] ?? "default"} dot>
                  {STATUS_LABEL[selected.currentStatus]}
                </Badge>
              </div>
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

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Job Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Voltage Class</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.voltageClassId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, voltageClassId: e.target.value, equipmentTypeId: "", componentId: "" }));
                  if (e.target.value) loadEquipmentTypes(e.target.value);
                  else { setEquipmentTypes([]); setComponents([]); }
                }}
              >
                <option value="">— select —</option>
                {voltageClasses.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.name}
                  </option>
                ))}
              </select>
            </div>
            {equipmentTypes.length > 0 && (
              <div className="space-y-1.5">
                <Label>Equipment Type</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.equipmentTypeId}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, equipmentTypeId: e.target.value, componentId: "" }));
                    if (e.target.value) loadComponents(e.target.value);
                    else setComponents([]);
                  }}
                >
                  <option value="">— select —</option>
                  {equipmentTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {components.length > 0 && (
              <div className="space-y-1.5">
                <Label>Component</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.componentId}
                  onChange={(e) => setForm((f) => ({ ...f, componentId: e.target.value }))}
                >
                  <option value="">— select —</option>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {components.length === 0 && (
              <div className="space-y-1.5">
                <Label>Component (optional)</Label>
                <Input
                  value={form.componentDescription}
                  onChange={(e) => setForm((f) => ({ ...f, componentDescription: e.target.value }))}
                  placeholder="e.g. Bushing, CT, PT…"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Issue Description *</Label>
              <Input
                value={form.issueDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issueDescription: e.target.value }))
                }
                placeholder="Describe the issue…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  {["low", "medium", "high", "critical"].map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Quotation Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.quotationAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quotationAmount: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Any additional notes…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.issueDescription.trim()}>
              {saving ? "Saving…" : "Raise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
