"use client";

import * as React from "react";
import { Plus, Wrench, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { MonthCalendar, type CalendarEvent } from "@/components/calendar/month-calendar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  requestNumber: string;
  equipmentName: string;
  type: string;
  status: string;
  scheduledDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface EquipmentOption {
  id: string;
  name: string;
}

const typeVariant = { preventive: "accent", corrective: "warning", replacement: "danger" } as const;

const emptyForm = { equipmentId: "", type: "preventive", scheduledDate: "", notes: "" };

export default function AEServiceRequestsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [substationId, setSubstationId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [equipmentOptions, setEquipmentOptions] = React.useState<EquipmentOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

    const [{ data }, { data: equipmentRows }] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id, request_number, type, status, scheduled_date, notes, created_at, equipment(name)")
        .eq("substation_id", profile.substation_id)
        .order("created_at", { ascending: false }),
      supabase.from("equipment").select("id, name").eq("substation_id", profile.substation_id).order("name"),
    ]);

    setEquipmentOptions(equipmentRows ?? []);
    if (data) {
      setRows(
        data.map((sr) => ({
          id: sr.id,
          requestNumber: sr.request_number,
          equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
          type: sr.type,
          status: sr.status,
          scheduledDate: sr.scheduled_date,
          notes: sr.notes,
          createdAt: sr.created_at,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter((r) => r.requestNumber.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setForm({ ...emptyForm, equipmentId: equipmentOptions[0]?.id ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!substationId) return;
    if (form.type === "preventive" && !form.scheduledDate) {
      setError("Please pick a scheduled date for preventive maintenance.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("service_requests").insert({
      substation_id: substationId,
      equipment_id: form.equipmentId || null,
      type: form.type,
      scheduled_date: form.scheduledDate || null,
      notes: form.notes || null,
      requested_by: user?.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const equipmentName = equipmentOptions.find((e) => e.id === form.equipmentId)?.name;
    await supabase.from("notifications").insert({
      title: "New Service Request",
      description: `${form.type} request submitted${equipmentName ? ` for ${equipmentName}` : ""}`,
      type: "service_request",
      target_role: "spectrum_admin",
      substation_id: substationId,
    });

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const calendarEvents: CalendarEvent[] = rows
    .filter((r) => r.scheduledDate)
    .map((r) => ({
      id: r.id,
      date: r.scheduledDate!,
      label: `${r.requestNumber} · ${r.equipmentName}`,
      variant: typeVariant[r.type as keyof typeof typeVariant],
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Service Requests</h1>
          <p className="text-sm text-foreground-secondary mt-1">Preventive, corrective &amp; replacement requests for your substation</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-border bg-background-secondary p-1">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list" ? "bg-white shadow-sm text-foreground" : "text-foreground-secondary"
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-white shadow-sm text-foreground" : "text-foreground-secondary"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Raise Request
        </Button>
      </div>

      {view === "list" ? (
        <>
          <PageToolbar search={search} onSearchChange={setSearch} placeholder="Search requests…" />
          <Card className="overflow-hidden">
            {loading ? (
              <EmptyState title="Loading service requests…" description="Fetching data for your substation." />
            ) : filtered.length === 0 ? (
              <EmptyState title="No service requests yet" description="Raise a preventive, corrective, or replacement request above." />
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
                        {sr.equipmentName}
                        {sr.scheduledDate ? ` · Scheduled ${new Date(sr.scheduledDate).toLocaleDateString()}` : ""} ·{" "}
                        {new Date(sr.createdAt).toLocaleDateString()}
                      </p>
                      {sr.notes && <p className="text-xs text-foreground-secondary mt-1">{sr.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-5">
          <MonthCalendar events={calendarEvents} />
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise Service Request</DialogTitle>
            <DialogDescription>Submit a preventive, corrective, or replacement request for your substation.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v })}>
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
            </div>
            {form.type === "preventive" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="date">
                  Scheduled date <span className="text-danger">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                />
                <p className="text-xs text-foreground-secondary">This will appear on the maintenance calendar.</p>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional context for this request…"
                rows={3}
                className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
              />
            </div>
            {error && <p className="text-xs text-danger sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Submitting…" : "Raise request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
