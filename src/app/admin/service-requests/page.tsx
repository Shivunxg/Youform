"use client";

import * as React from "react";
import { Wrench, MoreHorizontal, UserCog } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  requestNumber: string;
  substationName: string;
  substationId: string;
  equipmentName: string;
  type: string;
  status: string;
  requestedBy: string;
  scheduledDate: string | null;
  notes: string | null;
  assignedEngineer: string | null;
  createdAt: string;
}

const typeVariant = { preventive: "accent", corrective: "warning", replacement: "danger" } as const;

export default function AdminServiceRequestsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [manageRow, setManageRow] = React.useState<Row | null>(null);
  const [assignedEngineer, setAssignedEngineer] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [status, setStatus] = React.useState("pending");
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select(
        "id, request_number, type, status, scheduled_date, notes, assigned_engineer, created_at, substations(id, name), equipment(name), profiles(name)"
      )
      .order("created_at", { ascending: false });

    setRows(
      (data ?? []).map((sr) => ({
        id: sr.id,
        requestNumber: sr.request_number,
        substationName: (sr.substations as unknown as { name: string } | null)?.name ?? "—",
        substationId: (sr.substations as unknown as { id: string } | null)?.id ?? "",
        equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
        type: sr.type,
        status: sr.status,
        requestedBy: (sr.profiles as unknown as { name: string } | null)?.name ?? "—",
        scheduledDate: sr.scheduled_date,
        notes: sr.notes,
        assignedEngineer: sr.assigned_engineer,
        createdAt: sr.created_at,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  function openManage(r: Row) {
    setManageRow(r);
    setAssignedEngineer(r.assignedEngineer ?? "");
    setScheduledDate(r.scheduledDate ?? "");
    setStatus(r.status);
  }

  async function handleSaveManage() {
    if (!manageRow) return;
    setSaving(true);

    await supabase
      .from("service_requests")
      .update({
        assigned_engineer: assignedEngineer || null,
        scheduled_date: scheduledDate || null,
        status,
      })
      .eq("id", manageRow.id);

    // Notify the AE at that substation their request was updated
    await supabase.from("notifications").insert({
      title: "Service Request Updated",
      description: assignedEngineer
        ? `${manageRow.requestNumber} assigned to ${assignedEngineer}${scheduledDate ? ` — visiting ${new Date(scheduledDate).toLocaleDateString()}` : ""}`
        : `${manageRow.requestNumber} status changed to ${status.replace("_", " ")}`,
      type: "service_request",
      target_role: "assistant_engineer",
      substation_id: manageRow.substationId,
    });

    setSaving(false);
    setManageRow(null);
    loadData();
  }

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Service Requests</h1>
        <p className="text-sm text-foreground-secondary mt-1">Preventive, corrective &amp; replacement requests across all substations</p>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search requests…"
        right={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading service requests…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No service requests found" description="They'll appear here as soon as one is submitted." />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((sr) => (
              <div key={sr.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{sr.requestNumber}</p>
                    <Badge variant={typeVariant[sr.type as keyof typeof typeVariant]} className="capitalize">
                      {sr.type}
                    </Badge>
                    <Badge
                      variant={sr.status === "completed" ? "success" : sr.status === "pending" ? "warning" : "accent"}
                      className="capitalize"
                    >
                      {sr.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {sr.substationName} · {sr.equipmentName} · Requested by {sr.requestedBy}
                    {sr.scheduledDate ? ` · Visit ${new Date(sr.scheduledDate).toLocaleDateString()}` : ""} ·{" "}
                    {new Date(sr.createdAt).toLocaleDateString()}
                  </p>
                  {sr.assignedEngineer && (
                    <p className="text-xs text-accent mt-1 flex items-center gap-1">
                      <UserCog className="h-3 w-3" /> Assigned to {sr.assignedEngineer}
                    </p>
                  )}
                  {sr.notes && <p className="text-xs text-foreground-secondary mt-1">{sr.notes}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-hover hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openManage(sr)}>
                      <UserCog /> Assign engineer &amp; manage
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!manageRow} onOpenChange={(open) => !open && setManageRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Service Request</DialogTitle>
            <DialogDescription>
              {manageRow?.requestNumber} · {manageRow?.substationName} · {manageRow?.equipmentName}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="engineer">Assign Service Engineer</Label>
              <Input
                id="engineer"
                value={assignedEngineer}
                onChange={(e) => setAssignedEngineer(e.target.value)}
                placeholder="e.g. Suresh Kumar"
              />
              <p className="text-xs text-foreground-secondary">Name of the engineer visiting the substation for this request.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visitdate">Visit date</Label>
              <Input id="visitdate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setManageRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveManage} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
