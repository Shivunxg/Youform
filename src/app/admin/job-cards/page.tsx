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
        const { data: publicUrlData } = supabase.storage.from("job-attachments")
