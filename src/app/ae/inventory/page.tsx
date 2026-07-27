"use client";

import * as React from "react";
import { Plus, Boxes, MoreHorizontal, Pencil } from "lucide-react";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  componentName: string;
  equipmentName: string;
  availableQty: number;
  minQty: number;
  unit: string;
}

const emptyForm = { equipmentName: "", componentName: "", availableQty: "", minQty: "", unit: "Nos" };

export default function AEInventoryPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [substationId, setSubstationId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
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
      .select("id, available_qty, min_qty, unit, components(name, equipment_id, equipment(name))")
      .eq("substation_id", profile.substation_id)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows(
      (data ?? []).map((i) => {
        const comp = i.components as unknown as { name: string; equipment?: { name: string } } | null;
        return {
          id: i.id,
          componentName: comp?.name ?? "Unnamed component",
          equipmentName: comp?.equipment?.name ?? "—",
          availableQty: i.available_qty,
          minQty: i.min_qty,
          unit: i.unit,
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
      r.equipmentName.toLowerCase().includes(search.toLowerCase())
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
      availableQty: String(r.availableQty),
      minQty: String(r.minQty),
      unit: r.unit,
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
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      if (!form.equipmentName.trim()) {
        setError("Equipment name is required.");
        setSaving(false);
        return;
      }
      // find or create equipment at this substation
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

      // find or create component under this equipment
      let componentId: string;
      const { data: existingComponent } = await supabase
        .from("components")
        .select("id")
        .eq("equipment_id", equipmentId)
        .ilike("name", form.componentName.trim())
        .maybeSingle();

      if (existingComponent) {
        componentId = existingComponent.id;
      } else {
        const { data: newComponent, error: compError } = await supabase
          .from("components")
          .insert({ name: form.componentName.trim(), equipment_id: equipmentId, min_qty: Number(form.minQty || 0) })
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
        placeholder="Search components or equipment…"
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
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Component</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Available Qty</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Min Qty</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const low = r.availableQty < r.minQty;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                            <Boxes className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-foreground">{r.componentName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.equipmentName}</td>
                      <td className="px-5 py-3.5 text-foreground-secondary">
                        {r.availableQty} {r.unit}
                      </td>
                      <td className="px-5 py-3.5 text-foreground-secondary">
                        {r.minQty} {r.unit}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={low ? "danger" : "success"} dot>
                          {low ? "Low stock" : "In stock"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Update Stock" : "Add Stock"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the available quantity for this component."
                : "Record a component and its stock quantity for your substation."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="component">
                Component <span className="text-danger">*</span>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Nos" />
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
    </div>
  );
}
