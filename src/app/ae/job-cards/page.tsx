"use client";

import * as React from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  jobCardNumber: string;
  equipmentName: string;
  component: string | null;
  issueDescription: string;
  priority: string;
  status: string;
  createdAt: string;
}

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;
const statusVariant = { open: "danger", in_progress: "warning", resolved: "success", closed: "default" } as const;

const emptyForm = { equipmentName: "", component: "", issueDescription: "", priority: "medium" };

export default function AEJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [substationId, setSubstationId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
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

    const { data, error: fetchError } = await supabase
      .from("job_cards")
      .select("id, job_card_number, component, issue_description, priority, status, created_at, equipment(name)")
      .eq("substation_id", profile.substation_id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows(
      (data ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
        component: jc.component,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        status: jc.status,
        createdAt: jc.created_at,
      }))
    );
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
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!substationId || !form.issueDescription.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let equipmentId: string | null = null;
    if (form.equipmentName.trim()) {
      const { data: existingEquipment } = await supabase
        .from("equipment")
        .select("id")
        .eq("substation_id", substationId)
        .ilike("name", form.equipmentName.trim())
        .maybeSingle();

      if (existingEquipment) {
        equipmentId = existingEquipment.id;
      } else {
        const { data: newEquipment, error: eqError } = await supabase
          .from("equipment")
          .insert({ name: form.equipmentName.trim(), category: "General", substation_id: substationId, status: "healthy" })
          .select("id")
          .single();
        if (eqError) {
          setError(eqError.message);
          setSaving(false);
          return;
        }
        equipmentId = newEquipment?.id ?? null;
      }
    }

    const { error: insertError } = await supabase.from("job_cards").insert({
      substation_id: substationId,
      equipment_id: equipmentId,
      component: form.component || null,
      issue_description: form.issueDescription,
      priority: form.priority,
      raised_by: user?.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    // Notify admin
    await supabase.from("notifications").insert({
      title: "New Job Card Raised",
      description: `${form.priority.toUpperCase()} priority issue reported${form.equipmentName ? ` on ${form.equipmentName}` : ""}`,
      type: "job_card",
      target_role: "spectrum_admin",
      substation_id: substationId,
    });

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

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
                    <Badge variant={statusVariant[jc.status as keyof typeof statusVariant]} dot className="capitalize">
                      {jc.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">{jc.issueDescription}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {jc.equipmentName}
                    {jc.component ? ` · ${jc.component}` : ""} · {new Date(jc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise Job Card</DialogTitle>
            <DialogDescription>Report an equipment issue at your substation. Your Admin is notified immediately.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="equipment">Equipment</Label>
              <Input id="equipment" value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} placeholder="e.g. Power Transformer T1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="component">Component</Label>
              <Input id="component" value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} placeholder="e.g. Cooling Fan" />
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
    </div>
  );
}
