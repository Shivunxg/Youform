// @ts-nocheck
"use client";

import * as React from "react";
import { Plus, ChevronRight, Network, MapPin, Phone, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Node {
  id: string; name: string; code: string | null; level: number;
  parent_id: string | null; status: string;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  latitude: number | null; longitude: number | null;
}
interface Settings { level_1_label: string; level_2_label: string; level_3_label: string; level_4_label: string }

export default function HierarchyPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [settings, setSettings] = React.useState<Settings>({
    level_1_label: "Zone", level_2_label: "Circle",
    level_3_label: "Division", level_4_label: "Station",
  });
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedStation, setSelectedStation] = React.useState<Node | null>(null);

  // Add node dialog
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", level: "1", parent_id: "", lat: "", lng: "" });
  const [saving, setSaving] = React.useState(false);

  // Contact & location
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [stationLat, setStationLat] = React.useState("");
  const [stationLng, setStationLng] = React.useState("");
  const [savingContact, setSavingContact] = React.useState(false);

  React.useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: nodeData }, { data: settingsData }] = await Promise.all([
      supabase.from("hierarchy_nodes").select("*").order("level").order("name"),
      supabase.from("app_settings").select("key, value"),
    ]);
    setNodes(nodeData ?? []);
    if (settingsData) {
      const m: Record<string, string> = {};
      for (const s of settingsData) m[s.key] = s.value;
      setSettings({
        level_1_label: m["level_1_label"] ?? "Zone",
        level_2_label: m["level_2_label"] ?? "Circle",
        level_3_label: m["level_3_label"] ?? "Division",
        level_4_label: m["level_4_label"] ?? "Station",
      });
    }
  }

  function levelLabel(l: number) {
    return settings[`level_${l}_label` as keyof Settings] ?? `Level ${l}`;
  }

  function parentOptions() {
    const target = parseInt(form.level, 10);
    return target === 1 ? [] : nodes.filter((n) => n.level === target - 1);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const isStation = parseInt(form.level, 10) === 4;
    await supabase.from("hierarchy_nodes").insert({
      name: form.name.trim(),
      code: form.code.trim() || null,
      level: parseInt(form.level, 10),
      parent_id: form.parent_id || null,
      latitude:  isStation && form.lat ? parseFloat(form.lat) : null,
      longitude: isStation && form.lng ? parseFloat(form.lng) : null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", code: "", level: "1", parent_id: "", lat: "", lng: "" });
    load();
  }

  async function saveContactAndLocation() {
    if (!selectedStation) return;
    setSavingContact(true);
    const lat = stationLat ? parseFloat(stationLat) : null;
    const lng = stationLng ? parseFloat(stationLng) : null;
    await supabase.from("hierarchy_nodes").update({
      contact_name:  contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      latitude: lat, longitude: lng,
    }).eq("id", selectedStation.id);
    setSavingContact(false);
    setNodes((prev) => prev.map((n) =>
      n.id === selectedStation.id
        ? { ...n, contact_name: contactName.trim() || null, contact_email: contactEmail.trim() || null, contact_phone: contactPhone.trim() || null, latitude: lat, longitude: lng }
        : n
    ));
    setSelectedStation((s) => s ? { ...s, contact_name: contactName.trim() || null, contact_email: contactEmail.trim() || null, contact_phone: contactPhone.trim() || null, latitude: lat, longitude: lng } : s);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectStation(node: Node) {
    if (selectedStation?.id === node.id) { setSelectedStation(null); return; }
    setSelectedStation(node);
    setContactName(node.contact_name ?? "");
    setContactEmail(node.contact_email ?? "");
    setContactPhone(node.contact_phone ?? "");
    setStationLat(node.latitude != null ? String(node.latitude) : "");
    setStationLng(node.longitude != null ? String(node.longitude) : "");
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const children = nodes.filter((n) => n.parent_id === parentId);
    if (!children.length) return null;
    return (
      <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
        {children.map((node) => {
          const hasSub = nodes.some((n) => n.parent_id === node.id);
          const expanded = expandedIds.has(node.id);
          const isStation = node.level === 4;
          const isSelected = selectedStation?.id === node.id;
          return (
            <div key={node.id} className="py-1">
              <div
                className={`flex items-center gap-2 rounded-lg px-1 -mx-1 transition-colors ${isStation ? "cursor-pointer hover:bg-hover/50" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                onClick={isStation ? () => selectStation(node) : undefined}
              >
                {hasSub ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="text-slate-400 hover:text-foreground shrink-0">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                ) : <span className="h-3.5 w-3.5 inline-block shrink-0" />}
                <span className="text-sm font-medium text-foreground">{node.name}</span>
                {node.code && <span className="text-xs text-foreground-secondary">({node.code})</span>}
                {isStation && node.latitude != null && <MapPin className="h-3 w-3 text-green-500 shrink-0" title="GPS set" />}
                <Badge variant="default" className="text-[10px] px-1.5 py-0">{levelLabel(node.level)}</Badge>
                <Badge variant={node.status === "active" ? "success" : "danger"} className="text-[10px] px-1.5 py-0">{node.status}</Badge>
              </div>
              {hasSub && expanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Hierarchy</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {levelLabel(1)} → {levelLabel(2)} → {levelLabel(3)} → {levelLabel(4)}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Node</Button>
      </div>

      <div className={`grid gap-5 ${selectedStation ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Tree */}
        <Card>
          <CardHeader>
            <CardTitle>Network Tree</CardTitle>
            <CardDescription>
              {nodes.length === 0
                ? "No nodes yet. Add your first Zone."
                : `${nodes.length} node${nodes.length !== 1 ? "s" : ""} · click a ${levelLabel(4)} to view details`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-foreground-secondary">
                <Network className="h-10 w-10 text-slate-200" />
                <p className="text-sm">Click "Add Node" to build your hierarchy.</p>
              </div>
            ) : renderTree(null, 0)}
          </CardContent>
        </Card>

        {/* Station detail */}
        {selectedStation && (
          <div className="space-y-4">
            {/* Quick action */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedStation.name}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5">Manage equipment catalog and assets for this station</p>
                  </div>
                  <Button
                    onClick={() => router.push(`/admin/equipment?station=${selectedStation.id}`)}
                    className="gap-2 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" /> Open Equipment Register
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-blue-500" /> Contact &amp; Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. AEE / EE Whitefield" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. ee.whitefield@kptcl.gov.in" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. +91 98800 00000" />
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> GPS Location
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Latitude</Label>
                      <Input type="number" step="any" value={stationLat} onChange={(e) => setStationLat(e.target.value)} placeholder="e.g. 12.9716" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Longitude</Label>
                      <Input type="number" step="any" value={stationLng} onChange={(e) => setStationLng(e.target.value)} placeholder="e.g. 77.5946" />
                    </div>
                  </div>
                  {selectedStation.latitude != null && selectedStation.longitude != null && (
                    <a href={`https://www.google.com/maps?q=${selectedStation.latitude},${selectedStation.longitude}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline mt-2">
                      <ExternalLink className="h-3 w-3" /> Open in Google Maps
                    </a>
                  )}
                </div>
                <Button onClick={saveContactAndLocation} disabled={savingContact} size="sm">
                  {savingContact ? "Saving…" : "Save"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Node dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hierarchy Node</DialogTitle></DialogHeader>
          <div className="space-y-4 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value, parent_id: "", lat: "", lng: "" }))}>
                {[1, 2, 3, 4].map((l) => <option key={l} value={String(l)}>Level {l} — {levelLabel(l)}</option>)}
              </select>
            </div>
            {parseInt(form.level, 10) > 1 && (
              <div className="space-y-1.5">
                <Label>Parent {levelLabel(parseInt(form.level, 10) - 1)}</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
                  <option value="">— select parent —</option>
                  {parentOptions().map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={`e.g. Bangalore North ${levelLabel(parseInt(form.level, 10))}`} />
            </div>
            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. BLR-N-01" />
            </div>
            {parseInt(form.level, 10) === 4 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> GPS Location (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="12.9716" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="77.5946" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
