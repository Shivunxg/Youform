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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import type { DbSubstation } from "@/lib/supabase/types";

interface ComponentOption {
  id: string;
  name: string;
  equipmentName: string;
  substationId: string;
}

interface Row {
  id: string;
  componentName: string;
  equipmentName: string;
  substationName: string;
  availableQty: number;
  minQty: number;
  unit: string;
  conditionStatus: "green" | "yellow" | "red";
}

const conditionConfig = {
  green: { label: "Good", variant: "success" as const },
  yellow: { label: "Needs Attention", variant: "warning" as const },
  red: { label: "Critical", variant: "danger" as const },
};

export default function AdminInventoryPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [substations, setSubstations] = React.useState<DbSubstation[]>([]);
  const [componentOptions, setComponentOptions] = React.useState<ComponentOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [substationFilter, setSubstationFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [form, setForm] = React.useState({ substationId: "", componentId: "", availableQty: "", minQty: "0", unit: "Nos" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: inventoryRows }, { data: substationRows }, { data: componentRows }] = await Promise.all([
      supabase
        .from("inventory")
        .select("id, available_qty, min_qty, unit, condition_status, components(name, equipment(name)), substations(name)")
        .order("updated_at", { ascending: false }),
      supabase.from("substations").select("*").order("name"),
      supabase.from("components").select("id, name, equipment_id, equipment(name, substation_id)"),
    ]);

    setSubstations(substationRows ?? []);
    setComponentOptions(
      (componentRows ?? []).map((c) => {
        const eq = c.equipment as unknown as { name: string; substation_id: string } | null;
        return { id: c.id, name: c.name, equipmentName: eq?.name ?? "—", substationId: eq?.substation_id ?? "" };
      })
    );

    setRows(
      (inventoryRows ?? []).map((i) => {
        const comp = i.components as unknown as { name: string; equipment?: { name: string } } | null;
        return {
          id: i.id,
          componentName: comp?.name ?? "Unnamed component",
          equipmentName: comp?.equipment?.name ?? "—",
          substationName: (i.substations as unknown as { name: string } | null)?.name ?? "—",
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

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.componentName.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase());
    const matchesSubstation = substationFilter === "all" || r.substationName === substations.find((s) => s.id === substationFilter)?.name;
    return matchesSearch && matchesSubstation;
  });

  function openCreate() {
    setEditing(null);
    setForm({ substationId: substations[0]?.id ?? "", componentId: "", availableQty: "", minQty: "0", unit: "Nos" });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(r: Row) {
    setEditing(r);
    setForm({ substationId: "", componentId: "", availableQty: String(r.availableQty), minQty: String(r.minQty), unit: r.unit });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    if (editing) {
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ available_qty: Number(form.availableQty), min_qty: Number(form.minQty || 0), unit: form.unit })
        .eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      if (!form.componentId || !form.substationId || form.availableQty === "") {
        setError("Please fill in all required fields.");
        setSaving(false);
        return;
      }
      const { error: insertError } = await supabase.from("inventory").insert({
        component_id: form.componentId,
        substation_id: form.substationId,
        available_qty: Number(form.availableQty),
        min_qty: Number(form.minQty || 0),
        unit: form.unit || "Nos",
      });
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  }

  const relevantComponents = componentOptions.filter((c) => !form.substationId || c.substationId === form.substationId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Inventory</h1>
          <p className="text-sm text-foreground-secondary mt-1">{rows.length} stock records across all substations</p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search components or substations…"
        right={
          <>
            <Select value={substationFilter} onValueChange={setSubstationFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="All substations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All substations</SelectItem>
                {substations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Stock
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading inventory…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No inventory found" description="Stock will also appear here automatically as AEs log it." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Component</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Substation</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Available</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Min Qty</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Status</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Condition</th>
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
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.substationName}</td>
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.availableQty} {r.unit}</td>
                      <td className="px-5 py-3.5 text-foreground-secondary">{r.minQty} {r.unit}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={low ? "danger" : "success"} dot>
                          {low ? "Low stock" : "In stock"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={conditionConfig[r.conditionStatus].variant} dot>
                          {conditionConfig[r.conditionStatus].label}
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
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil /> Update quantity
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
              {editing ? "Update the available quantity." : "Record stock for an existing component at a substation."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editing && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    Substation <span className="text-danger">*</span>
                  </Label>
                  <Select value={form.substationId} onValueChange={(v) => setForm({ ...form, substationId: v, componentId: "" })}>
                    <SelectTrigger>
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    Component <span className="text-danger">*</span>
                  </Label>
                  <Select value={form.componentId} onValueChange={(v) => setForm({ ...form, componentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a component" />
                    </SelectTrigger>
                    <SelectContent>
                      {relevantComponents.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.equipmentName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {relevantComponents.length === 0 && (
                    <p className="text-xs text-foreground-secondary">No components exist for this substation yet — add one on the Components page first.</p>
                  )}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="qty">
                Available quantity <span className="text-danger">*</span>
              </Label>
              <Input id="qty" type="number" min={0} value={form.availableQty} onChange={(e) => setForm({ ...form, availableQty: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minqty">Minimum quantity</Label>
              <Input id="minqty" type="number" min={0} value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} placeholder="0" />
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
