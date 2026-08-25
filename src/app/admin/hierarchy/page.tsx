// @ts-nocheck
"use client";

import * as React from "react";
import { Plus, ChevronRight, Network, Zap, Wrench, Box, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface Node {
  id: string;
  name: string;
  code: string | null;
  level: number;
  parent_id: string | null;
  status: string;
}

interface VoltageClass { id: string; station_id: string; name: string; status: string }
interface EquipmentType { id: string; voltage_class_id: string; name: string; status: string }
interface Component { id: string; equipment_type_id: string; name: string }

interface Settings {
  level_1_label: string;
  level_2_label: string;
  level_3_label: string;
  level_4_label: string;
}

export default function HierarchyPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [settings, setSettings] = React.useState<Settings>({
    level_1_label: "Zone",
    level_2_label: "Circle",
    level_3_label: "Division",
    level_4_label: "Station",
  });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", level: "1", parent_id: "" });
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Station detail
  const [selectedStation, setSelectedStation] = React.useState<Node | null>(null);
  const [voltageClasses, setVoltageClasses] = React.useState<VoltageClass[]>([]);
  const [expandedVcs, setExpandedVcs] = React.useState<Set<string>>(new Set());
  const [equipmentTypes, setEquipmentTypes] = React.useState<EquipmentType[]>([]);
  const [expandedEts, setExpandedEts] = React.useState<Set<string>>(new Set());
  const [components, setComponents] = React.useState<Component[]>([]);

  // Add dialogs for station-level items
  const [vcDialog, setVcDialog] = React.useState(false);
  const [vcName, setVcName] = React.useState("");
  const [savingVc, setSavingVc] = React.useState(false);

  const [etDialog, setEtDialog] = React.useState(false);
  const [etName, setEtName] = React.useState("");
  const [etVcId, setEtVcId] = React.useState("");
  const [savingEt, setSavingEt] = React.useState(false);

  const [compDialog, setCompDialog] = React.useState(false);
  const [compName, setCompName] = React.useState("");
  const [compEtId, setCompEtId] = React.useState("");
  const [savingComp, setSavingComp] = React.useState(false);

  React.useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: nodeData }, { data: settingsData }] = await Promise.all([
      supabase.from("hierarchy_nodes").select("*").order("level").order("name"),
      supabase.from("app_settings").select("key, value"),
    ]);
    setNodes(nodeData ?? []);
    if (settingsData) {
      const map: Record<string, string> = {};
      for (const s of settingsData) map[s.key] = s.value;
      setSettings({
        level_1_label: map["level_1_label"] ?? "Zone",
        level_2_label: map["level_2_label"] ?? "Circle",
        level_3_label: map["level_3_label"] ?? "Division",
        level_4_label: map["level_4_label"] ?? "Station",
      });
    }
  }

  async function loadStationDetail(stationId: string) {
    const [{ data: vcData }, { data: etData }, { data: compData }] = await Promise.all([
      supabase.from("voltage_classes").select("*").eq("station_id", stationId).order("name"),
      supabase.from("equipment_types").select("*").order("name"),
      supabase.from("equipment_components").select("*").order("name"),
    ]);
    setVoltageClasses(vcData ?? []);
    setEquipmentTypes(etData ?? []);
    setComponents(compData ?? []);
  }

  function levelLabel(level: number) {
    return settings[`level_${level}_label` as keyof Settings] ?? `Level ${level}`;
  }

  function parentOptions() {
    const targetLevel = parseInt(form.level, 10);
    if (targetLevel === 1) return [];
    return nodes.filter((n) => n.level === targetLevel - 1);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("hierarchy_nodes").insert({
      name: form.name.trim(),
      code: form.code.trim() || null,
      level: parseInt(form.level, 10),
      parent_id: form.parent_id || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", code: "", level: "1", parent_id: "" });
    load();
  }

  async function addVoltageClass() {
    if (!vcName.trim() || !selectedStation) return;
    setSavingVc(true);
    await supabase.from("voltage_classes").insert({ station_id: selectedStation.id, name: vcName.trim() });
    setSavingVc(false);
    setVcDialog(false);
    setVcName("");
    loadStationDetail(selectedStation.id);
  }

  async function deleteVoltageClass(id: string) {
    await supabase.from("voltage_classes").delete().eq("id", id);
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function addEquipmentType() {
    if (!etName.trim() || !etVcId) return;
    setSavingEt(true);
    await supabase.from("equipment_types").insert({ voltage_class_id: etVcId, name: etName.trim() });
    setSavingEt(false);
    setEtDialog(false);
    setEtName("");
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function deleteEquipmentType(id: string) {
    await supabase.from("equipment_types").delete().eq("id", id);
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function addComponent() {
    if (!compName.trim() || !compEtId) return;
    setSavingComp(true);
    await supabase.from("equipment_components").insert({ equipment_type_id: compEtId, name: compName.trim() });
    setSavingComp(false);
    setCompDialog(false);
    setCompName("");
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function deleteComponent(id: string) {
    await supabase.from("equipment_components").delete().eq("id", id);
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const children = nodes.filter((n) => n.parent_id === parentId);
    if (children.length === 0) return null;
    return (
      <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
        {children.map((node) => {
          const hasChildren = nodes.some((n) => n.parent_id === node.id) || node.level < 4;
          const hasSubNodes = nodes.some((n) => n.parent_id === node.id);
          const expanded = expandedIds.has(node.id);
          const isStation = node.level === 4;
          const isSelected = selectedStation?.id === node.id;
          return (
            <div key={node.id} className="py-1">
              <div
                className={`flex items-center gap-2 group rounded px-1 -mx-1 ${isStation ? "cursor-pointer hover:bg-hover/50" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                onClick={isStation ? () => {
                  if (isSelected) {
                    setSelectedStation(null);
                  } else {
                    setSelectedStation(node);
                    loadStationDetail(node.id);
                    setExpandedVcs(new Set());
                    setExpandedEts(new Set());
                  }
                } : undefined}
              >
                {hasSubNodes ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                    className="text-slate-400 hover:text-foreground transition-colors"
                  >
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                ) : (
                  <span className="h-3.5 w-3.5 inline-block" />
                )}
                <span className="text-sm font-medium text-foreground">{node.name}</span>
                {node.code && <span className="text-xs text-foreground-secondary">({node.code})</span>}
                <Badge variant="default" className="text-[10px] px-1.5 py-0">{levelLabel(node.level)}</Badge>
                <Badge variant={node.status === "active" ? "success" : "danger"} className="text-[10px] px-1.5 py-0">
                  {node.status}
                </Badge>
              </div>
              {hasSubNodes && expanded && renderTree(node.id, depth + 1)}
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
            {levelLabel(1)} → {levelLabel(2)} → {levelLabel(3)} → {levelLabel(4)} → Voltage Class → Equipment → Components
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Node
        </Button>
      </div>

      <div className={`grid gap-5 ${selectedStation ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Network tree */}
        <Card>
          <CardHeader>
            <CardTitle>Network Tree</CardTitle>
            <CardDescription>
              {nodes.length === 0
                ? "No nodes yet. Add your first Zone / Circle / Division / Station."
                : `${nodes.length} node${nodes.length !== 1 ? "s" : ""} · click a ${levelLabel(4)} to manage its catalog`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-foreground-secondary">
                <Network className="h-10 w-10 text-slate-200" />
                <p className="text-sm">Click &ldquo;Add Node&rdquo; to build your hierarchy.</p>
              </div>
            ) : (
              renderTree(null, 0)
            )}
          </CardContent>
        </Card>

        {/* Station detail panel */}
        {selectedStation && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {selectedStation.name} — Catalog
                </CardTitle>
                <CardDescription>Voltage Classes → Equipment Types → Components</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Voltage Classes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">Voltage Classes</p>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={() => setVcDialog(true)}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  {voltageClasses.length === 0 ? (
                    <p className="text-xs text-foreground-secondary italic">No voltage classes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {voltageClasses.map((vc) => {
                        const vcEts = equipmentTypes.filter((e) => e.voltage_class_id === vc.id);
                        const vcExpanded = expandedVcs.has(vc.id);
                        return (
                          <div key={vc.id} className="rounded-lg border border-border">
                            <div className="flex items-center gap-2 px-3 py-2">
                              <button
                                onClick={() => setExpandedVcs((p) => { const n = new Set(p); n.has(vc.id) ? n.delete(vc.id) : n.add(vc.id); return n; })}
                                className="text-slate-400 hover:text-foreground"
                              >
                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${vcExpanded ? "rotate-90" : ""}`} />
                              </button>
                              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="text-sm font-medium flex-1">{vc.name}</span>
                              <Button size="sm" variant="outline" className="h-5 px-1.5 text-[11px] gap-0.5" onClick={() => { setEtVcId(vc.id); setEtDialog(true); }}>
                                <Plus className="h-2.5 w-2.5" /> Equipment
                              </Button>
                              <button onClick={() => deleteVoltageClass(vc.id)} className="text-slate-300 hover:text-red-500 ml-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Equipment Types */}
                            {vcExpanded && (
                              <div className="border-t border-border px-3 py-2 space-y-2">
                                {vcEts.length === 0 ? (
                                  <p className="text-xs text-foreground-secondary italic ml-5">No equipment types yet.</p>
                                ) : (
                                  vcEts.map((et) => {
                                    const etComps = components.filter((c) => c.equipment_type_id === et.id);
                                    const etExpanded = expandedEts.has(et.id);
                                    return (
                                      <div key={et.id} className="ml-5 rounded border border-border">
                                        <div className="flex items-center gap-2 px-3 py-1.5">
                                          <button
                                            onClick={() => setExpandedEts((p) => { const n = new Set(p); n.has(et.id) ? n.delete(et.id) : n.add(et.id); return n; })}
                                            className="text-slate-400 hover:text-foreground"
                                          >
                                            <ChevronRight className={`h-3 w-3 transition-transform ${etExpanded ? "rotate-90" : ""}`} />
                                          </button>
                                          <Wrench className="h-3 w-3 text-blue-500 shrink-0" />
                                          <span className="text-xs font-medium flex-1">{et.name}</span>
                                          <Button size="sm" variant="outline" className="h-5 px-1.5 text-[11px] gap-0.5" onClick={() => { setCompEtId(et.id); setCompDialog(true); }}>
                                            <Plus className="h-2.5 w-2.5" /> Component
                                          </Button>
                                          <button onClick={() => deleteEquipmentType(et.id)} className="text-slate-300 hover:text-red-500 ml-1">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>

                                        {/* Components */}
                                        {etExpanded && (
                                          <div className="border-t border-border px-3 py-1.5 space-y-1">
                                            {etComps.length === 0 ? (
                                              <p className="text-[11px] text-foreground-secondary italic ml-4">No components yet.</p>
                                            ) : (
                                              etComps.map((comp) => (
                                                <div key={comp.id} className="flex items-center gap-2 ml-4">
                                                  <Box className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                                  <span className="text-[11px] flex-1">{comp.name}</span>
                                                  <button onClick={() => deleteComponent(comp.id)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 className="h-2.5 w-2.5" />
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Hierarchy Node */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Hierarchy Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value, parent_id: "" }))}
              >
                {[1, 2, 3, 4].map((l) => (
                  <option key={l} value={String(l)}>Level {l} — {levelLabel(l)}</option>
                ))}
              </select>
            </div>
            {parseInt(form.level, 10) > 1 && (
              <div className="space-y-1.5">
                <Label>Parent {levelLabel(parseInt(form.level, 10) - 1)}</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.parent_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                >
                  <option value="">— select parent —</option>
                  {parentOptions().map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={`e.g. Bangalore North ${levelLabel(parseInt(form.level, 10))}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. BLR-N-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Voltage Class */}
      <Dialog open={vcDialog} onOpenChange={setVcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Voltage Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. 11kV, 66kV, 110kV)</Label>
              <Input value={vcName} onChange={(e) => setVcName(e.target.value)} placeholder="e.g. 33kV" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVcDialog(false)}>Cancel</Button>
            <Button onClick={addVoltageClass} disabled={savingVc || !vcName.trim()}>
              {savingVc ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Equipment Type */}
      <Dialog open={etDialog} onOpenChange={setEtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. Power Transformer, Circuit Breaker)</Label>
              <Input value={etName} onChange={(e) => setEtName(e.target.value)} placeholder="e.g. Power Transformer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtDialog(false)}>Cancel</Button>
            <Button onClick={addEquipmentType} disabled={savingEt || !etName.trim()}>
              {savingEt ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Component */}
      <Dialog open={compDialog} onOpenChange={setCompDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. Bushing, Tap Changer, Cooling Fan)</Label>
              <Input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="e.g. HV Bushing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialog(false)}>Cancel</Button>
            <Button onClick={addComponent} disabled={savingComp || !compName.trim()}>
              {savingComp ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
