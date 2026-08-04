"use client";

import * as React from "react";
import { Plus, ClipboardList, CheckCircle2, XCircle, Clock, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { JobCardTimeline } from "@/components/job-cards/timeline";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  jobCardNumber: string;
  equipmentName: string;
  component: string | null;
  issueDescription: string;
  priority: string;
  status: string;
  assignedEngineer: string | null;
  momNotes: string | null;
  estimateAmount: number | null;
  estimateNotes: string | null;
  estimateDocumentUrl: string | null;
  estimateDocumentName: string | null;
  createdAt: string;
  assignedAt: string | null;
  inspectingAt: string | null;
  momLoggedAt: string | null;
  estimateSentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  closedAt: string | null;
}

interface EquipmentOption {
  id: string;
  name: string;
}

interface ComponentOption {
  id: string;
  name: string;
  equipmentId: string;
}

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;

function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STAGE_TIMESTAMP_KEY: Record<string, keyof Row> = {
  assigned: "assignedAt",
  inspecting: "inspectingAt",
  mom_logged: "momLoggedAt",
  estimate_sent: "estimateSentAt",
  approved: "approvedAt",
  rejected: "rejectedAt",
  closed: "closedAt",
};

const STAGE_LABEL: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  inspecting: "Inspecting",
  mom_logged: "MOM Logged",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STAGE_VARIANT: Record<string, "default" | "accent" | "warning" | "danger" | "success"> = {
  open: "danger",
  assigned: "accent",
  inspecting: "accent",
  mom_logged: "accent",
  estimate_sent: "warning",
  approved: "success",
  rejected: "danger",
  closed: "default",
  in_progress: "warning",
  resolved: "success",
};

const emptyForm = { equipmentId: "", componentId: "", newComponentName: "", issueDescription: "", priority: "medium" };

export default function AEJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [substationId, setSubstationId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [equipmentOptions, setEquipmentOptions] = React.useState<EquipmentOption[]>([]);
  const [componentOptions, setComponentOptions] = React.useState<ComponentOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [approvalRow, setApprovalRow] = React.useState<Row | null>(null);
  const [approvalDecision, setApprovalDecision] = React.useState<"approved" | "rejected">("approved");
  const [approvalNotes, setApprovalNotes] = React.useState("");
  const [detailsRow, setDetailsRow] = React.useState<Row | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("substation_id").eq("id", user.id).single();
    if (!profile?.substation_id) {
      setLoading(false);
      return;
    }
    setSubstationId(profile.substation_id);

    const [{ data }, { data: equipmentRows }, { data: componentRows }] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_card_number, component, issue_description, priority, status, assigned_engineer, mom_notes, estimate_amount, estimate_notes, estimate_document_url, estimate_document_name, created_at, assigned_at, inspecting_at, mom_logged_at, estimate_sent_at, approved_at, rejected_at, closed_at, equipment(name)"
        )
        .eq("substation_id", profile.substation_id)
        .order("created_at", { ascending: false }),
      supabase.from("equipment").select("id, name").eq("substation_id", profile.substation_id).order("name"),
      supabase.from("components").select("id, name, equipment_id"),
    ]);

    setEquipmentOptions(equipmentRows ?? []);
    setComponentOptions((componentRows ?? []).map((c) => ({ id: c.id, name: c.name, equipmentId: c.equipment_id })));

    if (data) {
      setRows(
        data.map((jc) => ({
          id: jc.id,
          jobCardNumber: jc.job_card_number,
          equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
          component: jc.component,
          issueDescription: jc.issue_description,
          priority: jc.priority,
          status: jc.status,
          assignedEngineer: jc.assigned_engineer,
          momNotes: jc.mom_notes,
          estimateAmount: jc.estimate_amount,
          estimateNotes: jc.estimate_notes,
          estimateDocumentUrl: jc.estimate_document_url,
          estimateDocumentName: jc.estimate_document_name,
          createdAt: jc.created_at,
          assignedAt: jc.assigned_at,
          inspectingAt: jc.inspecting_at,
          momLoggedAt: jc.mom_logged_at,
          estimateSentAt: jc.estimate_sent_at,
          approvedAt: jc.approved_at,
          rejectedAt: jc.rejected_at,
          closedAt: jc.closed_at,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter(
    (r) =>
      r.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm({ ...emptyForm, equipmentId: equipmentOptions[0]?.id ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!substationId || !form.issueDescription.trim()) return;
    if (form.componentId === "__new__" && !form.newComponentName.trim()) {
      setError("Please enter a name for the new component.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let componentName = componentOptions.find((c) => c.id === form.componentId)?.name ?? null;

    if (form.componentId === "__new__" && form.newComponentName.trim() && form.equipmentId) {
      const { data: newComponent, error: compError } = await supabase
        .from("components")
        .insert({ name: form.newComponentName.trim(), equipment_id: form.equipmentId, min_qty: 0 })
        .select("id, name")
        .single();
      if (compError) {
        setError(compError.message);
        setSaving(false);
        return;
      }
      componentName = newComponent?.name ?? form.newComponentName.trim();
    }

    const { error: insertError } = await supabase.from("job_cards").insert({
      substation_id: substationId,
      equipment_id: form.equipmentId || null,
      component: componentName,
      issue_description: form.issueDescription,
      priority: form.priority,
      raised_by: user?.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const equipmentName = equipmentOptions.find((e) => e.id === form.equipmentId)?.name;
    await supabase.from("notifications").insert({
      title: "New Job Card Raised",
      description: `${form.priority.toUpperCase()} priority issue reported${equipmentName ? ` on ${equipmentName}` : ""}`,
      type: "job_card",
      target_role: "spectrum_admin",
      substation_id: substationId,
    });

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  function openApproval(row: Row) {
    setApprovalRow(row);
    setApprovalDecision("approved");
    setApprovalNotes("");
  }

  async function handleApprovalSubmit() {
    if (!approvalRow || !substationId) return;
    setSaving(true);

    await supabase
      .from("job_cards")
      .update({
        status: approvalDecision,
        approval_notes: approvalNotes || null,
        [approvalDecision === "approved" ? "approved_at" : "rejected_at"]: new Date().toISOString(),
      })
      .eq("id", approvalRow.id);

    await supabase.from("notifications").insert({
      title: approvalDecision === "approved" ? "Estimate Approved" : "Estimate Rejected",
      description: `${approvalRow.jobCardNumber} was ${approvalDecision} by the Assistant Engineer`,
      type: "job_card",
      target_role: "spectrum_admin",
      substation_id: substationId,
    });

    setSaving(false);
    setApprovalRow(null);
    loadData();
  }

  const relevantComponents = componentOptions.filter((c) => c.equipmentId === form.equipmentId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
          <p className="text-sm text-foreground-secondary mt-1">Issues raised for your substation</p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search job cards…"
        right={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Raise Job Card
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading job cards…" description="Fetching data for your substation." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No job cards yet"
            description="Raise a job card when equipment develops an issue — it reaches your Admin instantly."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((jc) => (
              <div key={jc.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                    <Badge variant={priorityVariant[jc.priority as keyof typeof priorityVariant]} className="capitalize">
                      {jc.priority}
                    </Badge>
                    <Badge variant={STAGE_VARIANT[jc.status] ?? "default"} dot>
                      {STAGE_LABEL[jc.status] ?? jc.status}
                    </Badge>
                    {STAGE_TIMESTAMP_KEY[jc.status] && fmtDateTime(jc[STAGE_TIMESTAMP_KEY[jc.status]] as string | null) && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" /> {fmtDateTime(jc[STAGE_TIMESTAMP_KEY[jc.status]] as string | null)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">{jc.issueDescription}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {jc.equipmentName}
                    {jc.component ? ` · ${jc.component}` : ""} · Raised {fmtDateTime(jc.createdAt)}
                  </p>
                  {jc.assignedEngineer && (
                    <p className="text-xs text-accent mt-1">Service Engineer (Spectrum): {jc.assignedEngineer}</p>
                  )}
                  {jc.momNotes && jc.status !== "open" && jc.status !== "assigned" && (
                    <p className="text-xs text-foreground-secondary mt-1">Inspection notes: {jc.momNotes}</p>
                  )}
                  {jc.estimateAmount != null && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 px-3.5 py-3 text-xs">
                        <div>
                          <p className="text-amber-700/70 font-medium">Amount</p>
                          <p className="text-foreground font-semibold mt-0.5">₹{jc.estimateAmount?.toLocaleString() ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-amber-700/70 font-medium">Date Sent</p>
                          <p className="text-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmtDateTime(jc.estimateSentAt) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-700/70 font-medium">Status</p>
                          <Badge
                            variant={jc.status === "approved" || jc.status === "closed" ? "success" : jc.status === "rejected" ? "danger" : "warning"}
                            dot
                            className="mt-0.5"
                          >
                            {jc.status === "approved" ? "Approved" : jc.status === "rejected" ? "Rejected" : jc.status === "closed" ? "Approved & Closed" : "Needs your review"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-amber-700/70 font-medium">Quote</p>
                          {jc.estimateDocumentUrl ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <a
                                href={jc.estimateDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-accent px-2.5 py-1 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={jc.estimateDocumentUrl}
                                download={jc.estimateDocumentName ?? undefined}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-secondary hover:bg-hover transition-colors"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ) : (
                            <p className="text-foreground-secondary mt-0.5">No file</p>
                          )}
                        </div>
                      </div>
                      {jc.estimateNotes && <p className="text-xs text-amber-800 px-3.5 pb-3 -mt-1">{jc.estimateNotes}</p>}
                    </div>
                  )}
                  <button
                    onClick={() => setDetailsRow(jc)}
                    className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline mt-2"
                  >
                    <ClipboardList className="h-3 w-3" /> Job Card Details
                  </button>
                </div>
                {jc.status === "estimate_sent" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => openApproval(jc)}>
                      Review Estimate
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Raise job card */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise Job Card</DialogTitle>
            <DialogDescription>Report an equipment issue at your substation. Your Admin is notified immediately.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              {equipmentOptions.length === 0 ? (
                <p className="text-xs text-foreground-secondary py-2">
                  No equipment registered yet at your substation. Add it from the Inventory page first, or ask your Admin.
                </p>
              ) : (
                <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v, componentId: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Component</Label>
              <Select
                value={form.componentId}
                onValueChange={(v) => setForm({ ...form, componentId: v })}
                disabled={!form.equipmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={relevantComponents.length ? "Select component" : "None registered"} />
                </SelectTrigger>
                <SelectContent>
                  {relevantComponents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Register new component</SelectItem>
                </SelectContent>
              </Select>
              {form.componentId === "__new__" && (
                <Input
                  value={form.newComponentName}
                  onChange={(e) => setForm({ ...form, newComponentName: e.target.value })}
                  placeholder="e.g. Cooling Fan"
                  className="mt-1.5"
                  autoFocus
                />
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="issue">
                Issue description <span className="text-danger">*</span>
              </Label>
              <textarea
                id="issue"
                value={form.issueDescription}
                onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
                placeholder="Describe what's wrong…"
                rows={3}
                className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-danger sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Submitting…" : "Raise job card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review estimate */}
      <Dialog open={!!approvalRow} onOpenChange={(open) => !open && setApprovalRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Estimate</DialogTitle>
            <DialogDescription>{approvalRow?.jobCardNumber}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg border border-border bg-background-secondary px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-foreground-secondary">Amount</p>
                  <p className="text-lg font-semibold text-foreground">₹{approvalRow?.estimateAmount?.toLocaleString() ?? "—"}</p>
                </div>
                {approvalRow?.estimateSentAt && (
                  <p className="text-xs text-foreground-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtDateTime(approvalRow.estimateSentAt)}
                  </p>
                )}
              </div>
              {approvalRow?.estimateNotes && <p className="text-sm text-foreground-secondary">{approvalRow.estimateNotes}</p>}
              {approvalRow?.estimateDocumentUrl && (
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={approvalRow.estimateDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-accent px-3 py-1 text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Quote
                  </a>
                  <a
                    href={approvalRow.estimateDocumentUrl}
                    download={approvalRow.estimateDocumentName ?? undefined}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-secondary hover:bg-hover transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setApprovalDecision("approved")}
                className={`flex items-center justify-center gap-2 rounded-[10px] border-2 py-2.5 text-sm font-medium transition-colors ${
                  approvalDecision === "approved" ? "border-success bg-green-50 text-success" : "border-border text-foreground-secondary"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => setApprovalDecision("rejected")}
                className={`flex items-center justify-center gap-2 rounded-[10px] border-2 py-2.5 text-sm font-medium transition-colors ${
                  approvalDecision === "rejected" ? "border-danger bg-red-50 text-danger" : "border-border text-foreground-secondary"
                }`}
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approvalnotes">Remarks (optional)</Label>
              <textarea
                id="approvalnotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                placeholder="Any comments for the Admin…"
                className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setApprovalRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleApprovalSubmit} disabled={saving}>
              {saving ? "Submitting…" : "Submit decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Card Details — full history */}
      <Dialog open={!!detailsRow} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Card Details</DialogTitle>
            <DialogDescription>{detailsRow?.jobCardNumber}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            <div>
              <p className="text-xs font-medium text-foreground-secondary">Issue reported</p>
              <p className="text-sm text-foreground mt-1">{detailsRow?.issueDescription}</p>
            </div>
            {detailsRow?.momNotes && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary">Inspection notes (MOM)</p>
                <p className="text-sm text-foreground mt-1">{detailsRow.momNotes}</p>
              </div>
            )}
            {detailsRow?.estimateAmount != null && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary mb-1.5">Quote</p>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">₹{detailsRow.estimateAmount?.toLocaleString()}</p>
                    {detailsRow.estimateSentAt && (
                      <p className="text-xs text-foreground-secondary flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmtDateTime(detailsRow.estimateSentAt)}
                      </p>
                    )}
                  </div>
                  {detailsRow.estimateNotes && <p className="text-xs text-amber-800 mt-1">{detailsRow.estimateNotes}</p>}
                  {detailsRow.estimateDocumentUrl && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <a
                        href={detailsRow.estimateDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-accent px-2.5 py-1 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View Quote
                      </a>
                      <a
                        href={detailsRow.estimateDocumentUrl}
                        download={detailsRow.estimateDocumentName ?? undefined}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-secondary hover:bg-hover transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(detailsRow?.status === "approved" || detailsRow?.status === "rejected" || detailsRow?.status === "closed") && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary">Your decision</p>
                <Badge variant={detailsRow?.status === "rejected" ? "danger" : "success"} dot className="mt-1 capitalize">
                  {detailsRow?.status === "rejected" ? "Rejected" : "Approved"}
                  {detailsRow?.status === "closed" ? " & Closed" : ""}
                </Badge>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-foreground-secondary mb-1">Full timeline</p>
              {detailsRow && (
                <JobCardTimeline
                  data={{
                    createdAt: detailsRow.createdAt,
                    assignedAt: detailsRow.assignedAt,
                    inspectingAt: detailsRow.inspectingAt,
                    momLoggedAt: detailsRow.momLoggedAt,
                    estimateSentAt: detailsRow.estimateSentAt,
                    approvedAt: detailsRow.approvedAt,
                    rejectedAt: detailsRow.rejectedAt,
                    closedAt: detailsRow.closedAt,
                    status: detailsRow.status,
                  }}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailsRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
