"use client";

import * as React from "react";
import { Plus, PuzzleIcon } from "lucide-react";
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

interface EquipmentOption {
  id: string;
  name: string;
  substationName: string;
}

interface Row {
  id: string;
  name: string;
  sku: string | null;
  equipmentName: string;
  substationName: string;
  minQty: number;
  status: string;
}

const emptyForm = { name: "", sku: "", description: "", remarks: "", equipmentId: "", minQty: "0" };

export default function AdminComponentsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [equipmentOptions, setEquipmentOptions] = React.useState<EquipmentOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: componentRows }, { data: equipmentRows }] = await Promise.all([
      supabase
        .from("components")
        .select("id, name, sku, min_qty, status, equipment(name, substations(name))")
        .order("name"),
      supabase.from("equipment").select("id, name, substations(name)").order("name"),
    ]);

    setEquipmentOptions(
      (equipmentRows ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        substationName: (e.substations as unknown as { name: string } | null)?.name ?? "—",
      }))
    );

    setRows(
      (componentRows ?? []).map((c) => {
        const eq = c.equipment as unknown as { name: string; substations?: { name: string } } | null;
        return {
          id: c.id,
          name: c.name,
          sku: c.sku,
          equipmentName: eq?.name ?? "—",
          substationName: eq?.substations?.name ?? "—",
          minQty: c.min_qty,
          status: c.status,
        };
      })
    );
    if (!form.equipmentId && equipmentRows?.length) setForm((f) => ({ ...f, equipmentId: equipmentRows[0].id }));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      r.substationName.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm({ name: "", sku: "", description: "", remarks: "", equipmentId: equipmentOptions[0]?.id ?? "", minQty: "0" });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.equipmentId) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("components").insert({
      name: form.name,
      sku: form.sku || null,
      description: form.description || null,
      remarks: form.remarks || null,
      equipment_id: form.equipmentId,
      min_qty: Number(form.minQty || 0),
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Components</h1>
          <p className="text-sm text-foreground-secondary mt-1">{rows.length} component types across all equipment</p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search components, equipment or substation…"
        right={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Component
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading components…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No components found"
            description="Add a component type, or it'll appear automatically when an AE logs inventory."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">SKU</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Component</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Substation</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Min Quantity</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-3.5 text-foreground-secondary">{c.sku ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                          <PuzzleIcon className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-foreground">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{c.equipmentName}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{c.substationName}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{c.minQty}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={c.status === "active" ? "success" : "default"} dot className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>Register a new replaceable component type under an equipment item.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="equipment">
                Equipment <span className="text-danger">*</span>
              </Label>
              <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v })}>
                <SelectTrigger id="equipment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equipmentOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.substationName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Component name <span className="text-danger">*</span>
              </Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cooling Fan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. TXF-CF-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specs or details" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minqty">Minimum quantity</Label>
              <Input id="minqty" type="number" min={0} value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} placeholder="0" />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Add component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
