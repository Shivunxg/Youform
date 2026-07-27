"use client";

import * as React from "react";
import { Plus, Boxes, MoreHorizontal, Pencil, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  sku: string | null;
  componentName: string;
  description: string | null;
  remarks: string | null;
  equipmentName: string;
  availableQty: number;
  minQty: number;
  unit: string;
  conditionStatus: "green" | "yellow" | "red";
}

const emptyForm = {
  equipmentName: "",
  componentName: "",
  sku: "",
  description: "",
  remarks: "",
  availableQty: "",
  minQty: "0",
  unit: "Nos",
  conditionStatus: "green" as "green" | "yellow" | "red",
};

const conditionConfig = {
  green: { label: "Good", variant: "success" as const },
  yellow: { label: "Needs Attention", variant: "warning" as const },
  red: { label: "Critical", variant: "danger" as const },
};

export default function AEInventoryPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [substationId, setSubstationId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<Row | null>(null);
  const [editing, setEditing] = React.useState<Row | null>(null);
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
      .from("inventory")
      .select(
        "id, available_qty, min_qty, unit, condition_status, components(name, sku, description, remarks, equipment(name))"
      )
      .eq("substation_id", profile.substation_id)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows(
      (data ?? []).map((i) => {
        const comp = i.components as unknown as {
          name: string;
          sku: string | null;
          description: string | null;
          remarks: string | null;
          equipment?: { name: string };
        } | null;
        return {
          id: i.id,
          sku: comp?.sku ?? null,
          componentName: comp?.name ?? "Unnamed component",
          description: comp?.description ?? null,
          remarks: comp?.remarks ?? null,
          equipmentName: comp?.equipment?.name ?? "—",
          availableQty: i.available_qty,
          minQty: i.min_qty,
          unit: i.unit,
          conditionStatus: (i.condition_status as "green" | "yellow" | "red") ?? "green",
        };
      })
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter(
    (r) =>
      r.componentName.toLowerCase().includes(search.toLowerCase()) ||
      r.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      (r.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditQty(r: Row) {
    setEditing(r);
    setForm({
      equipmentName: r.equipmentName,
      componentName: r.componentName,
      sku: r.sku ?? "",
      description: r.description ?? "",
      remarks: r.remarks ?? "",
      availableQty: String(r.availableQty),
      minQty: String(r.minQty),
      unit: r.unit,
      conditionStatus: r.conditionStatus,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!substationId) return;
    if (!form.componentName.trim() || form.availableQty === "") return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editing) {
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          available_qty: Number(form.availableQty),
          min_qty: Number(form.minQty || 0),
          unit: form.unit || "Nos",
          condition_status: form.conditionStatus,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
      // keep component master data (sku/description/remarks) in sync too
      const compId = await getComponentIdForInventory(editing.id);
      if (compId) {
        await supabase
          .from("components")
          .update({ sku: form.sku || null, description: form.description || null, remarks: form.remarks || null })
          .eq("id", compId);
      }
    } else {
      if (!form.equipmentName.trim()) {
        setError("Equipment name is required.");
        setSaving(false);
        return;
      }
      let equipmentId: string;
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
        if (eqError || !newEquipment) {
          setError(eqError?.message ?? "Could not create equipment.");
          setSaving(false);
          return;
        }
        equipmentId = newEquipment.id;
      }

      let componentId: string;
      const { data: existingComponent } = await supabase
        .from("components")
        .select("id")
        .eq("equipment_id", equipmentId)
        .ilike("name", form.componentName.trim())
        .maybeSingle();

      if (existingComponent) {
        componentId = existingComponent.id;
        await supabase
          .from("components")
          .update({ sku: form.sku || null, description: form.description || null, remarks: form.remarks || null })
          .eq("id", componentId);
      } else {
        const { data: newComponent, error: compError } = await supabase
          .from("components")
          .insert({
            name: form.componentName.trim(),
            equipment_id: equipmentId,
            min_qty: Number(form.minQty || 0),
            sku: form.sku || null,
            description: form.description || null,
            remarks: form.remarks || null,
          })
          .select("id")
          .single();
        if (compError || !newComponent) {
          setError(compError?.message ?? "Could not create component.");
          setSaving(false);
          return;
        }
        componentId = newComponent.id;
      }

      const { error: invError } = await supabase.from("inventory").insert({
        component_id: componentId,
        substation_id: substationId,
        available_qty: Number(form.availableQty),
        min_qty: Number(form.minQty || 0),
        unit: form.unit || "Nos",
        condition_status: form.conditionStatus,
        updated_by: user?.id,
      });
      if (invError) {
        setError(invError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  async function getComponentIdForInventory(inventoryId: string): Promise<string | null> {
    const { data } = await supabase.from("inventory").select("component_id").eq("id", inventoryId).single();
    return data?.component_id ?? null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Inventory</h1>
          <p className="text-sm text-foreground-secondary mt-1">Stock levels at your substation</p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by SKU, component or equipment…"
        right={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Stock
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading inventory…" description="Fetching stock levels for your substation." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No inventory recorded yet"
            description="Add your first component and stock quantity — it'll show up on the Admin dashboard immediately."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">SKU</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Component</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Available Qty</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Stock</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Condition</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const low = r.availableQty < r.minQty;
                  const cond = conditionConfig[r.conditionStatus];
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.sku ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setDetailRow(r)}
                          className="flex items-center gap-3 text-left hover:text-accent transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                            <Boxes className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground">{r.componentName}</span>
                          {(r.description || r.remarks) && <Info className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.equipmentName}</td>
                      <td className="px-5 py-3.5 text-foreground-secondary">
                        {r.availableQty} {r.unit}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={low ? "danger" : "success"} dot>
                          {low ? "Low stock" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={cond.variant} dot>
                          {cond.label}
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
                            <DropdownMenuItem onClick={() => openEditQty(r)}>
                              <Pencil /> Update stock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Update dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Update Stock" : "Add Stock"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update quantity, condition, and notes for this component." : "Record a new component and its stock at your substation."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="equipment">
                Equipment <span className="text-danger">*</span>
              </Label>
              <Input
                id="equipment"
                value={form.equipmentName}
                onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
                placeholder="e.g. Power Transformer T1"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="component">
                Product / Component name <span className="text-danger">*</span>
              </Label>
              <Input
                id="component"
                value={form.componentName}
                onChange={(e) => setForm({ ...form, componentName: e.target.value })}
                placeholder="e.g. Cooling Fan"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. TXF-CF-001" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Product details / description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Specs, rating, or other identifying details…"
                rows={2}
                className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <textarea
                id="remarks"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Any notes for this component…"
                rows={2}
                className="flex w-full rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">
                Available quantity <span className="text-danger">*</span>
              </Label>
              <Input
                id="qty"
                type="number"
                min={0}
                value={form.availableQty}
                onChange={(e) => setForm({ ...form, availableQty: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minqty">Minimum quantity</Label>
              <Input
                id="minqty"
                type="number"
                min={0}
                value={form.minQty}
                onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Nos" />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={form.conditionStatus} onValueChange={(v) => setForm({ ...form, conditionStatus: v as "green" | "yellow" | "red" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" /> Good
                    </span>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-warning" /> Needs Attention
                    </span>
                  </SelectItem>
                  <SelectItem value="red">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-danger" /> Critical
                    </span>
                  </SelectItem>
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
              {saving ? "Saving…" : editing ? "Save changes" : "Add stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail view dialog */}
      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRow?.componentName}</DialogTitle>
            <DialogDescription>{detailRow?.equipmentName}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {detailRow?.sku && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary">SKU</p>
                <p className="text-sm text-foreground mt-0.5">{detailRow.sku}</p>
              </div>
            )}
            {detailRow?.description && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary">Description</p>
                <p className="text-sm text-foreground mt-0.5">{detailRow.description}</p>
              </div>
            )}
            {detailRow?.remarks && (
              <div>
                <p className="text-xs font-medium text-foreground-secondary">Remarks</p>
                <p className="text-sm text-foreground mt-0.5">{detailRow.remarks}</p>
              </div>
            )}
            {!detailRow?.sku && !detailRow?.description && !detailRow?.remarks && (
              <p className="text-sm text-foreground-secondary">No additional details recorded for this component.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
