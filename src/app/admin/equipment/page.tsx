"use client";

import * as React from "react";
import { Plus, Cpu, MoreHorizontal, Pencil } from "lucide-react";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import type { DbSubstation } from "@/lib/supabase/types";

interface Row {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  substationName: string;
  status: string;
}

const statusVariant = { healthy: "success", service_required: "warning", replacement_required: "danger" } as const;
const statusLabel: Record<string, string> = {
  healthy: "Healthy",
  service_required: "Service Required",
  replacement_required: "Replacement Required",
};

const emptyForm = {
  name: "",
  category: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  substationId: "",
  status: "healthy",
};

export default function AdminEquipmentPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [substations, setSubstations] = React.useState<DbSubstation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: equipmentRows }, { data: substationRows }] = await Promise.all([
      supabase
        .from("equipment")
        .select("id, name, category, manufacturer, model, status, substations(name)")
        .order("name"),
      supabase.from("substations").select("*").order("name"),
    ]);

    setSubstations(substationRows ?? []);
    setRows(
      (equipmentRows ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        manufacturer: e.manufacturer,
        model: e.model,
        substationName: (e.substations as unknown as { name: string } | null)?.name ?? "—",
        status: e.status,
      }))
    );
    if (!form.substationId && substationRows?.length) setForm((f) => ({ ...f, substationId: substationRows[0].id }));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, substationId: substations[0]?.id ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim() || !form.substationId) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("equipment").insert({
      name: form.name,
      category: form.category,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serialNumber || null,
      substation_id: form.substationId,
      status: form.status,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function updateStatus(id: string, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("equipment").update({ status }).eq("id", id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Equipment</h1>
          <p className="text-sm text-foreground-secondary mt-1">{rows.length} equipment items across all substations</p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search equipment or substation…"
        right={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="service_required">Service Required</SelectItem>
                <SelectItem value="replacement_required">Replacement Required</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Equipment
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading equipment…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No equipment found" description="Add equipment, or it'll appear automatically when an AE logs inventory." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Category</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Substation</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Manufacturer</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Health Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-foreground">{e.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.category}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.substationName}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.manufacturer ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant[e.status as keyof typeof statusVariant]} dot>
                        {statusLabel[e.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-hover hover:text-foreground transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateStatus(e.id, "healthy")}>
                            <Pencil /> Mark Healthy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(e.id, "service_required")}>
                            <Pencil /> Mark Service Required
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(e.id, "replacement_required")}>
                            <Pencil /> Mark Replacement Required
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Register a new equipment item at a substation.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">
                Equipment name <span className="text-danger">*</span>
              </Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Power Transformer T2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category <span className="text-danger">*</span>
              </Label>
              <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Transformer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="substation">
                Substation <span className="text-danger">*</span>
              </Label>
              <Select value={form.substationId} onValueChange={(v) => setForm({ ...form, substationId: v })}>
                <SelectTrigger id="substation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {substations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Siemens" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. SIPROTEC 7SJ82" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="serial">Serial number</Label>
              <Input id="serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="e.g. SIE-2026-1182" />
            </div>
            {error && <p className="text-xs text-danger sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Add equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
