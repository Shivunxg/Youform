"use client";

import * as React from "react";
import { ClipboardList, UserCog, Paperclip, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  jobCardNumber: string;
  substationName: string;
  substationId: string;
  equipmentName: string;
  component: string | null;
  issueDescription: string;
  priority: string;
  status: string;
  raisedBy: string;
  assignedEngineer: string | null;
  momNotes: string | null;
  estimateAmount: number | null;
  estimateNotes: string | null;
  estimateDocumentUrl: string | null;
  estimateDocumentName: string | null;
  approvalNotes: string | null;
  createdAt: string;
  assignedAt: string | null;
  inspectingAt: string | null;
  momLoggedAt: string | null;
  estimateSentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  closedAt: string | null;
}

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;

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

const STAGE_TIMESTAMP_KEY: Record<string, keyof Row> = {
  assigned: "assignedAt",
  inspecting: "inspectingAt",
  mom_logged: "momLoggedAt",
  estimate_sent: "estimateSentAt",
  approved: "approvedAt",
  rejected: "rejectedAt",
  closed: "closedAt",
};

const NEXT_ACTIONS: Record<string, { label: string; nextStatus: string }[]> = {
  open: [{ label: "Assign Engineer", nextStatus: "assigned" }],
  assigned: [{ label: "Mark Inspecting", nextStatus: "inspecting" }],
  inspecting: [{ label: "Log MOM", nextStatus: "mom_logged" }],
  mom_logged: [{ label: "Send Estimate", nextStatus: "estimate_sent" }],
  estimate_sent: [],
  approved: [{ label: "Close Job Card", nextStatus: "closed" }],
  rejected: [{ label: "Re-send Estimate", nextStatus: "estimate_sent" }],
  closed: [],
};

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

export default function AdminJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [manageRow, setManageRow] = React.useState<Row | null>(null);
  const [pendingAction, setPendingAction] = React.useState<{ label: string; nextStatus: string } | null>(null);
  const [assignedEngineer, setAssignedEngineer] = React.useState("");
  const [momNotes, setMomNotes] = React.useState("");
  const [estimateAmount, setEstimateAmount] = React.useState("");
  const [estimateNotes, setEstimateNotes] = React.useState("");
  const [estimateFile, setEstimateFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("job_cards")
      .select(
        "id, job_card_number, component, issue_description, priority, status, assigned_engineer, mom_notes, estimate_amount, estimate_notes, estimate_document_url, estimate_document_name, approval_notes, created_at, assigned_at, inspecting_at, mom_logged_at, estimate_sent_at, approved_at, rejected_at, closed_at, substations(id, name), equipment(name), profiles(name)"
      )
      .order("created_at", { ascending: false });

    setRows(
      (data ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        substationName: (jc.substations as unknown as { name: string } | null)?.name ?? "—",
        substationId: (jc.substations as unknown as { id: string } | null)?.id ?? "",
        equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
        component: jc.component,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        status: jc.status,
        raisedBy: (jc.profiles as unknown as { name: string } | null)?.name ?? "—",
        assignedEngineer: jc.assigned_engineer,
        momNotes: jc.mom_notes,
        estimateAmount: jc.estimate_amount,
        estimateNotes: jc.estimate_notes,
        estimateDocumentUrl: jc.estimate_document_url,
        estimateDocumentName: jc.estimate_document_name,
        approvalNotes: jc.approval_notes,
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
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  function openAction(row: Row, action: { label: string; nextStatus: string }) {
    setManageRow(row);
    setPendingAction(action);
    setAssignedEngineer(row.assignedEngineer ?? "");
    setMomNotes(row.momNotes ?? "");
    setEstimateAmount(row.estimateAmount != null ? String(row.estimateAmount) : "");
    setEstimateNotes(row.estimateNotes ?? "");
    setEstimateFile(null);
    setUploadError(null);
  }

  async function handleConfirm() {
    if (!manageRow || !pendingAction) return;
    setSaving(true);
    setUploadError(null);

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = { status: pendingAction.nextStatus };
    const tsKey = STAGE_TIMESTAMP_KEY[pendingAction.nextStatus];
    if (tsKey) {
      const dbColumn = tsKey.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
      update[dbColumn] = nowIso;
    }
    if (pendingAction.nextStatus === "assigned") update.assigned_engineer = assignedEngineer;
    if (pendingAction.nextStatus === "mom_logged") update.mom_notes = momNotes;
    if (pendingAction.nextStatus === "estimate_sent") {
      update.estimate_amount = estimateAmount ? Number(estimateAmount) : null;
      update.estimate_notes = estimateNotes;

      if (estimateFile) {
        const filePath = `${manageRow.id}/${Date.now()}-${estimateFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("job-attachments").upload(filePath, estimateFile);
        if (uploadErr) {
          setUploadError(uploadErr.message);
          setSaving(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from("job-attachments").getPublicUrl(filePath);
        update.estimate_document_url = publicUrlData.publicUrl;
        update.estimate_document_name = estimateFile.name;
      }
    }

    await supabase.from("job_cards").update(update).eq("id", manageRow.id);

    let notifTitle = "Job Card Updated";
    let notifDesc = `${manageRow.jobCardNumber} is now ${STAGE_LABEL[pendingAction.nextStatus]}`;
    if (pendingAction.nextStatus === "estimate_sent") {
      notifTitle = "Estimate Ready for Review";
      notifDesc = `${manageRow.jobCardNumber}: estimate ₹${estimateAmount || "0"} — please approve or reject`;
    }
    await supabase.from("notifications").insert({
      title: notifTitle,
      description: notifDesc,
      type: "job_card",
      target_role: "assistant_engineer",
      substation_id: manageRow.substationId,
    });

    setSaving(false);
    setManageRow(null);
    setPendingAction(null);
    loadData();
  }

  const filtered = rows.filter(
    (r) =>
      r.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription.toLowerCase().includes(search.toLowerCase()) ||
      r.substationName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
        <p className="text-sm text-foreground-secondary mt-1">Issues raised by Assistant Engineers, tracked through resolution</p>
      </div>

      <PageToolbar search={search} onSearchChange={setSearch} placeholder="Search job cards…" />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading job cards…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No job cards found" description="They'll appear here as soon as an Assistant Engineer raises one." />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((jc) => {
              const stageTs = STAGE_TIMESTAMP_KEY[jc.status] ? fmtDateTime(jc[STAGE_TIMESTAMP_KEY[jc.status]] as string | null) : null;
              return (
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
                      {stageTs && <span className="text-[11px] text-slate-400">{stageTs}</span>}
                    </div>
                    <p className="text-sm text-foreground-secondary mt-1">{jc.issueDescription}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {jc.substationName} · {jc.equipmentName}
                      {jc.component ? ` · ${jc.component}` : ""} · Raised by {jc.raisedBy} on {fmtDateTime(jc.createdAt)}
                    </p>
                    {jc.assignedEngineer && (
                      <p className="text-xs text-accent mt-1 flex items-center gap-1">
                        <UserCog className="h-3 w-3" /> {jc.assignedEngineer}
                      </p>
                    )}
                    {jc.status === "estimate_sent" && (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-warning">Estimate ₹{jc.estimateAmount ?? "—"} — awaiting AE approval</p>
                        {jc.estimateDocumentUrl && (
                          
                            href={jc.estimateDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" /> {jc.estimateDocumentName ?? "View document"}
                          </a>
                        )}
                      </div>
                    )}
                    {jc.status === "rejected" && jc.approvalNotes && (
                      <p className="text-xs text-danger mt-1">AE remarks: {jc.approvalNotes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {(NEXT_ACTIONS[jc.status] ?? []).map((action) => (
                      <Button key={action.nextStatus} size="sm" variant="secondary" onClick={() => openAction(jc, action)}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!manageRow} onOpenChange={(open) => !open && setManageRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>
              {manageRow?.jobCardNumber} · {manageRow?.substationName}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {pendingAction?.nextStatus === "assigned" && (
              <div className="space-y-1.5">
                <Label htmlFor="engineer">Service Engineer</Label>
                <Input
                  id="engineer"
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                />
              </div>
            )}
            {pendingAction?.nextStatus === "mom_logged" && (
              <div className="space-y-1.5">
                <Label htmlFor="mom">Minutes of Meeting (site inspection notes)</Label>
                <textarea
                  id="mom"
                  value={momNotes}
                  onChange={(e) => setMomNotes(e.target.value)}
                  rows={4}
                  placeholder="What the engineer found on site…"
                  className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
                />
              </div>
            )}
            {pendingAction?.nextStatus === "estimate_sent" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Estimate amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={estimateAmount}
                    onChange={(e) => setEstimateAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimatenotes">Estimate details</Label>
                  <textarea
                    id="estimatenotes"
                    value={estimateNotes}
                    onChange={(e) => setEstimateNotes(e.target.value)}
                    rows={3}
                    placeholder="Parts, labor, breakdown…"
                    className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="file">Attach document (optional)</Label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="file"
                      className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground-secondary cursor-pointer hover:bg-hover transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                      {estimateFile ? estimateFile.name : "Choose file (PDF, image)"}
                    </label>
                    <input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setEstimateFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
                </div>
              </>
            )}
            {(pendingAction?.nextStatus === "inspecting" || pendingAction?.nextStatus === "closed") && (
              <p className="text-sm text-foreground-secondary">
                This will move the job card to <span className="font-medium text-foreground">{STAGE_LABEL[pendingAction.nextStatus]}</span>.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setManageRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
