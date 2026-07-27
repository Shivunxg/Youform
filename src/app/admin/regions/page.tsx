"use client";

import * as React from "react";
import { Plus, MapPin, Building2, MoreHorizontal, Pencil, Ban, CheckCircle2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import type { DbRegion } from "@/lib/supabase/types";

type RegionWithCount = DbRegion & { substationCount: number };

export default function RegionsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [regions, setRegions] = React.useState<RegionWithCount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RegionWithCount | null>(null);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRegions = React.useCallback(async () => {
    setLoading(true);
    const { data: regionRows, error: regionError } = await supabase
      .from("regions")
      .select("*")
      .order("name");
    const { data: substationRows } = await supabase.from("substations").select("region_id");

    if (regionError) {
      setError(regionError.message);
      setLoading(false);
      return;
    }

    const counts = new Map<string, number>();
    (substationRows ?? []).forEach((s) => counts.set(s.region_id, (counts.get(s.region_id) ?? 0) + 1));

    setRegions((regionRows ?? []).map((r) => ({ ...r, substationCount: counts.get(r.id) ?? 0 })));
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const filtered = regions.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setName("");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(r: RegionWithCount) {
    setEditing(r);
    setName(r.name);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error: updateError } = await supabase.from("regions").update({ name }).eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("regions").insert({ name });
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadRegions();
  }

  async function toggleStatus(r: RegionWithCount) {
    const newStatus = r.status === "active" ? "inactive" : "active";
    await supabase.from("regions").update({ status: newStatus }).eq("id", r.id);
    loadRegions();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Regions</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {regions.length} regions · {regions.reduce((a, r) => a + r.substationCount, 0)} substations under management
          </p>
        </div>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search regions…"
        right={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Region
          </Button>
        }
      />

      {loading ? (
        <Card>
          <EmptyState title="Loading regions…" description="Fetching the latest data from your database." />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No regions found" description="Try a different search term, or add a new region to get started." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-accent">
                  <MapPin className="h-5 w-5" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-hover hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(r)}>
                      <Pencil /> Edit region
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toggleStatus(r)}>
                      {r.status === "active" ? (
                        <>
                          <Ban /> Disable region
                        </>
                      ) : (
                        <>
                          <CheckCircle2 /> Enable region
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="mt-4 text-base font-semibold text-foreground">{r.name}</h3>

              <div className="mt-3 flex items-center gap-2 text-sm text-foreground-secondary">
                <Building2 className="h-3.5 w-3.5" />
                {r.substationCount} substations
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <Badge variant={r.status === "active" ? "success" : "default"} dot className="capitalize">
                  {r.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Region" : "Add Region"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the region name below." : "Create a new region to group substations under."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-1.5">
            <Label htmlFor="region-name">
              Region name <span className="text-danger">*</span>
            </Label>
            <Input
              id="region-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bangalore North"
              autoFocus
            />
            {error && <p className="text-xs text-danger mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
