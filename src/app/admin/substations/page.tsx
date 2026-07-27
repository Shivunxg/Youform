"use client";

import * as React from "react";
import { Plus, MoreHorizontal, Pencil, Ban, CheckCircle2, Building2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import type { DbRegion, DbSubstation } from "@/lib/supabase/types";

interface Row extends DbSubstation {
  regionName: string;
  assistantEngineerName: string | null;
  equipmentCount: number;
}

const emptyForm = { code: "", name: "", regionId: "", address: "" };

export default function SubstationsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [items, setItems] = React.useState<Row[]>([]);
  const [regions, setRegions] = React.useState<DbRegion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState<string>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: regionRows }, { data: substationRows }, { data: equipmentRows }, { data: profileRows }] =
      await Promise.all([
        supabase.from("regions").select("*").order("name"),
        supabase.from("substations").select("*").order("name"),
        supabase.from("equipment").select("id, substation_id"),
        supabase.from("profiles").select("id, name, substation_id").eq("role", "assistant_engineer"),
      ]);

    const regionMap = new Map((regionRows ?? []).map((r) => [r.id, r.name]));
    const aeMap = new Map((profileRows ?? []).filter((p) => p.substation_id).map((p) => [p.substation_id as string, p.name]));
    const equipmentCounts = new Map<string, number>();
    (equipmentRows ?? []).forEach((e) => equipmentCounts.set(e.substation_id, (equipmentCounts.get(e.substation_id) ?? 0) + 1));

    setRegions(regionRows ?? []);
    setItems(
      (substationRows ?? []).map((s) => ({
        ...s,
        regionName: regionMap.get(s.region_id) ?? "—",
        assistantEngineerName: aeMap.get(s.id) ?? null,
        equipmentCount: equipmentCounts.get(s.id) ?? 0,
      }))
    );
    if (!form.regionId && regionRows?.length) setForm((f) => ({ ...f, regionId: regionRows[0].id }));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = items.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = regionFilter === "all" || s.region_id === regionFilter;
    return matchesSearch && matchesRegion;
  });

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", regionId: regions[0]?.id ?? "", address: "" });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(s: Row) {
    setEditing(s);
    setForm({ code: s.code, name: s.name, regionId: s.region_id, address: s.address ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim() || !form.regionId) return;
    setSaving(true);
    setError(null);

    const payload = { code: form.code, name: form.name, region_id: form.regionId, address: form.address };

    if (editing) {
      const { error: updateError } = await supabase.from("substations").update(payload).eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("substations").insert(payload);
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

  async function toggleStatus(s: Row) {
    const newStatus = s.status === "active" ? "inactive" : "active";
    await supabase.from("substations").update({ status: newStatus }).eq("id", s.id);
    loadData();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Substations</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {items.length} substations across {regions.length} regions
          </p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by name or code…"
        right={
          <>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Substation
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading substations…" description="Fetching the latest data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No substations found" description="Try a different search or filter, or add a new substation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60 sticky top-0">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Substation</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Region</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Assistant Engineer</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-xs text-foreground-secondary">{s.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{s.regionName}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">
                      {s.assistantEngineerName ?? <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{s.equipmentCount}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.status === "active" ? "success" : "default"} dot className="capitalize">
                        {s.status}
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
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil /> Edit substation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleStatus(s)}>
                            {s.status === "active" ? (
                              <>
                                <Ban /> Disable substation
                              </>
                            ) : (
                              <>
                                <CheckCircle2 /> Enable substation
                              </>
                            )}
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
            <DialogTitle>{editing ? "Edit Substation" : "Add Substation"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update substation details below." : "Register a new substation under a region."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                Substation code <span className="text-danger">*</span>
              </Label>
              <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SS-BLR-025" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">
                Region <span className="text-danger">*</span>
              </Label>
              <Select value={form.regionId} onValueChange={(v) => setForm({ ...form, regionId: v })}>
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">
                Substation name <span className="text-danger">*</span>
              </Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Whitefield 110kV SS" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area, city" />
            </div>
            <p className="text-xs text-foreground-secondary sm:col-span-2 -mt-1">
              Assign an Assistant Engineer from the Users page after creating this substation.
            </p>
            {error && <p className="text-xs text-danger sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create substation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
