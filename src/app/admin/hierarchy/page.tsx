// @ts-nocheck
"use client";

import * as React from "react";
import {
  Plus, ChevronRight, Network, Zap, Wrench, Box, Trash2, Phone,
  MapPin, Camera, ExternalLink, Settings2, ClipboardList,
  Upload, Download, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Node {
  id: string; name: string; code: string | null; level: number;
  parent_id: string | null; status: string;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  latitude: number | null; longitude: number | null;
}
interface VoltageClass { id: string; station_id: string; name: string; status: string }
interface FieldDef { key: string; label: string; type: "text" | "number" | "date"; required: boolean }
interface EquipmentType {
  id: string; voltage_class_id: string; name: string; status: string;
  image_url: string | null; custom_field_definitions: FieldDef[];
}
interface Component { id: string; equipment_type_id: string; name: string }
interface EquipmentInstance {
  id: string; equipment_type_id: string; station_id: string;
  name: string; serial_number: string | null;
  status: "active" | "inactive" | "under_maintenance";
  custom_data: Record<string, string>;
  last_maintenance_date: string | null; next_due_date: string | null;
}
interface Settings { level_1_label: string; level_2_label: string; level_3_label: string; level_4_label: string }

const INSTANCE_STATUS_LABEL: Record<string, string> = {
  active: "Active", inactive: "Inactive", under_maintenance: "Under Maintenance",
};
const INSTANCE_STATUS_VARIANT: Record<string, any> = {
  active: "success", inactive: "default", under_maintenance: "warning",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysFromNow(d: string | null): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.round(diff / 86400000);
}

function dueBadge(nextDue: string | null) {
  const days = daysFromNow(nextDue);
  if (days === null) return null;
  if (days < 0) return <Badge variant="danger" className="text-[10px] px-1.5 py-0">Overdue</Badge>;
  if (days === 0) return <Badge variant="danger" className="text-[10px] px-1.5 py-0">Due Today</Badge>;
  if (days <= 3) return <Badge variant="warning" className="text-[10px] px-1.5 py-0">{days}d</Badge>;
  if (days <= 7) return <Badge variant="accent" className="text-[10px] px-1.5 py-0">{days}d</Badge>;
  return null;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HierarchyPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [settings, setSettings] = React.useState<Settings>({
    level_1_label: "Zone", level_2_label: "Circle",
    level_3_label: "Division", level_4_label: "Station",
  });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", level: "1", parent_id: "", lat: "", lng: "" });
  const [saving, setSaving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Station detail
  const [selectedStation, setSelectedStation] = React.useState<Node | null>(null);
  const [voltageClasses, setVoltageClasses] = React.useState<VoltageClass[]>([]);
  const [expandedVcs, setExpandedVcs] = React.useState<Set<string>>(new Set());
  const [equipmentTypes, setEquipmentTypes] = React.useState<EquipmentType[]>([]);
  const [expandedEts, setExpandedEts] = React.useState<Set<string>>(new Set());
  const [components, setComponents] = React.useState<Component[]>([]);

  // Add dialogs
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

  // Contact + location
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [stationLat, setStationLat] = React.useState("");
  const [stationLng, setStationLng] = React.useState("");
  const [savingContact, setSavingContact] = React.useState(false);

  // Equipment image upload
  const [uploadingEt, setUploadingEt] = React.useState<Record<string, boolean>>({});
  const [uploadTargetEtId, setUploadTargetEtId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Custom field definitions dialog
  const [fieldsDialog, setFieldsDialog] = React.useState(false);
  const [fieldsEt, setFieldsEt] = React.useState<EquipmentType | null>(null);
  const [fieldDefs, setFieldDefs] = React.useState<FieldDef[]>([]);
  const [savingFields, setSavingFields] = React.useState(false);

  // Equipment instances dialog
  const [instancesDialog, setInstancesDialog] = React.useState(false);
  const [instancesEt, setInstancesEt] = React.useState<EquipmentType | null>(null);
  const [instances, setInstances] = React.useState<EquipmentInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = React.useState(false);

  // Add instance dialog
  const [addInstDialog, setAddInstDialog] = React.useState(false);
  const [instForm, setInstForm] = React.useState<Record<string, string>>({});
  const [savingInst, setSavingInst] = React.useState(false);

  // Bulk CSV upload
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingCsv, setUploadingCsv] = React.useState(false);
  const [csvResult, setCsvResult] = React.useState<{ inserted: number; errors: string[] } | null>(null);

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
    setEquipmentTypes((etData ?? []).map((e) => ({
      ...e,
      custom_field_definitions: e.custom_field_definitions ?? [],
    })));
    setComponents(compData ?? []);
  }

  async function loadInstances(etId: string, stationId: string) {
    setLoadingInstances(true);
    const { data } = await supabase
      .from("equipment_instances")
      .select("*")
      .eq("equipment_type_id", etId)
      .eq("station_id", stationId)
      .order("name");
    setInstances(data ?? []);
    setLoadingInstances(false);
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
    const isStation = parseInt(form.level, 10) === 4;
    await supabase.from("hierarchy_nodes").insert({
      name: form.name.trim(),
      code: form.code.trim() || null,
      level: parseInt(form.level, 10),
      parent_id: form.parent_id || null,
      latitude: isStation && form.lat ? parseFloat(form.lat) : null,
      longitude: isStation && form.lng ? parseFloat(form.lng) : null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", code: "", level: "1", parent_id: "", lat: "", lng: "" });
    load();
  }

  async function addVoltageClass() {
    if (!vcName.trim() || !selectedStation) return;
    setSavingVc(true);
    await supabase.from("voltage_classes").insert({ station_id: selectedStation.id, name: vcName.trim() });
    setSavingVc(false); setVcDialog(false); setVcName("");
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
    setSavingEt(false); setEtDialog(false); setEtName("");
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
    setSavingComp(false); setCompDialog(false); setCompName("");
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function deleteComponent(id: string) {
    await supabase.from("equipment_components").delete().eq("id", id);
    if (selectedStation) loadStationDetail(selectedStation.id);
  }

  async function saveContactAndLocation() {
    if (!selectedStation) return;
    setSavingContact(true);
    const lat = stationLat ? parseFloat(stationLat) : null;
    const lng = stationLng ? parseFloat(stationLng) : null;
    await supabase.from("hierarchy_nodes").update({
      contact_name: contactName.trim() || null,
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
  }

  // ── Custom field definitions ──────────────────────────────────────────────
  function openFieldsDialog(et: EquipmentType) {
    setFieldsEt(et);
    setFieldDefs(et.custom_field_definitions?.length ? JSON.parse(JSON.stringify(et.custom_field_definitions)) : []);
    setFieldsDialog(true);
  }

  function addFieldDef() {
    setFieldDefs((prev) => [...prev, { key: `field_${Date.now()}`, label: "", type: "text", required: false }]);
  }

  function updateFieldDef(idx: number, patch: Partial<FieldDef>) {
    setFieldDefs((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }

  function removeFieldDef(idx: number) {
    setFieldDefs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveFieldDefs() {
    if (!fieldsEt) return;
    setSavingFields(true);
    const defs = fieldDefs
      .filter((f) => f.label.trim())
      .map((f) => ({ ...f, key: f.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }));
    await supabase.from("equipment_types").update({ custom_field_definitions: defs }).eq("id", fieldsEt.id);
    setEquipmentTypes((prev) => prev.map((e) => e.id === fieldsEt.id ? { ...e, custom_field_definitions: defs } : e));
    setSavingFields(false);
    setFieldsDialog(false);
  }

  // ── Equipment instances ───────────────────────────────────────────────────
  function openInstancesDialog(et: EquipmentType) {
    setInstancesEt(et);
    setInstances([]);
    setCsvResult(null);
    setInstancesDialog(true);
    if (selectedStation) loadInstances(et.id, selectedStation.id);
  }

  function openAddInstDialog() {
    setInstForm({ status: "active" });
    setCsvResult(null);
    setAddInstDialog(true);
  }

  async function saveInstance() {
    if (!instancesEt || !selectedStation || !instForm.name?.trim()) return;
    setSavingInst(true);

    const fieldDefs = instancesEt.custom_field_definitions ?? [];
    const custom_data: Record<string, string> = {};
    for (const fd of fieldDefs) {
      custom_data[fd.key] = instForm[`cf_${fd.key}`] ?? "";
    }

    await supabase.from("equipment_instances").insert({
      equipment_type_id: instancesEt.id,
      station_id: selectedStation.id,
      name: instForm.name.trim(),
      serial_number: instForm.serial_number?.trim() || null,
      status: instForm.status || "active",
      last_maintenance_date: instForm.last_maintenance_date || null,
      next_due_date: instForm.next_due_date || null,
      custom_data,
    });

    setSavingInst(false);
    setAddInstDialog(false);
    loadInstances(instancesEt.id, selectedStation.id);
  }

  async function deleteInstance(id: string) {
    await supabase.from("equipment_instances").delete().eq("id", id);
    if (instancesEt && selectedStation) loadInstances(instancesEt.id, selectedStation.id);
  }

  // ── CSV template download ─────────────────────────────────────────────────
  function downloadTemplate(et: EquipmentType) {
    const defs = et.custom_field_definitions ?? [];
    const fixedHeaders = ["name", "serial_number", "last_maintenance_date (YYYY-MM-DD)", "next_due_date (YYYY-MM-DD)", "status (active/inactive/under_maintenance)"];
    const customHeaders = defs.map((f) => `${f.label}${f.required ? " *" : ""}`);
    const headers = [...fixedHeaders, ...customHeaders];
    const sampleRow = ["Asset Tag / Name", "SN-001", "2026-01-15", "2026-07-15", "active", ...defs.map(() => "")];

    const csv = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${et.name.replace(/\s+/g, "_")}_equipment_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV bulk upload ───────────────────────────────────────────────────────
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !instancesEt || !selectedStation) return;
    setUploadingCsv(true);
    setCsvResult(null);

    const text = await file.text();
    const rows = parseCsv(text);
    const defs = instancesEt.custom_field_definitions ?? [];

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row["name"]?.trim();
      if (!name) { errors.push(`Row ${i + 2}: missing name — skipped`); continue; }

      // Validate required custom fields
      const missing = defs.filter((f) => f.required && !row[f.label]?.trim());
      if (missing.length) {
        errors.push(`Row ${i + 2} (${name}): missing required field(s): ${missing.map((f) => f.label).join(", ")} — skipped`);
        continue;
      }

      const custom_data: Record<string, string> = {};
      for (const fd of defs) {
        custom_data[fd.key] = row[fd.label]?.trim() ?? "";
      }

      const { error: insErr } = await supabase.from("equipment_instances").insert({
        equipment_type_id: instancesEt.id,
        station_id: selectedStation.id,
        name,
        serial_number: row["serial_number"]?.trim() || null,
        status: (row["status (active/inactive/under_maintenance)"]?.trim() || "active") as any,
        last_maintenance_date: row["last_maintenance_date (YYYY-MM-DD)"]?.trim() || null,
        next_due_date: row["next_due_date (YYYY-MM-DD)"]?.trim() || null,
        custom_data,
      });

      if (insErr) errors.push(`Row ${i + 2} (${name}): ${insErr.message}`);
      else inserted++;
    }

    setCsvResult({ inserted, errors });
    setUploadingCsv(false);
    e.target.value = "";
    if (inserted > 0) loadInstances(instancesEt.id, selectedStation.id);
  }

  // ── Equipment image upload ────────────────────────────────────────────────
  function triggerImageUpload(etId: string) {
    setUploadTargetEtId(etId);
    fileInputRef.current?.click();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetEtId || !selectedStation) return;
    setUploadingEt((prev) => ({ ...prev, [uploadTargetEtId]: true }));
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${selectedStation.id}/${uploadTargetEtId}.${ext}`;
    const { error: upErr } = await supabase.storage.from("equipment-images").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("equipment-images").getPublicUrl(path);
      await supabase.from("equipment_types").update({ image_url: publicUrl }).eq("id", uploadTargetEtId);
      setEquipmentTypes((prev) => prev.map((et) => et.id === uploadTargetEtId ? { ...et, image_url: publicUrl } : et));
    }
    setUploadingEt((prev) => ({ ...prev, [uploadTargetEtId]: false }));
    setUploadTargetEtId(null);
    e.target.value = "";
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function mapsUrl(lat: number, lng: number) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const children = nodes.filter((n) => n.parent_id === parentId);
    if (children.length === 0) return null;
    return (
      <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
        {children.map((node) => {
          const hasSubNodes = nodes.some((n) => n.parent_id === node.id);
          const expanded = expandedIds.has(node.id);
          const isStation = node.level === 4;
          const isSelected = selectedStation?.id === node.id;
          return (
            <div key={node.id} className="py-1">
              <div
                className={`flex items-center gap-2 rounded px-1 -mx-1 ${isStation ? "cursor-pointer hover:bg-hover/50" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                onClick={isStation ? () => {
                  if (isSelected) { setSelectedStation(null); }
                  else {
                    setSelectedStation(node);
                    setContactName(node.contact_name ?? "");
                    setContactEmail(node.contact_email ?? "");
                    setContactPhone(node.contact_phone ?? "");
                    setStationLat(node.latitude != null ? String(node.latitude) : "");
                    setStationLng(node.longitude != null ? String(node.longitude) : "");
                    loadStationDetail(node.id);
                    setExpandedVcs(new Set()); setExpandedEts(new Set());
                  }
                } : undefined}
              >
                {hasSubNodes ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="text-slate-400 hover:text-foreground">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </button>
                ) : <span className="h-3.5 w-3.5 inline-block" />}
                <span className="text-sm font-medium text-foreground">{node.name}</span>
                {node.code && <span className="text-xs text-foreground-secondary">({node.code})</span>}
                {isStation && node.latitude != null && <MapPin className="h-3 w-3 text-green-500 shrink-0" title="Location set" />}
                <Badge variant="default" className="text-[10px] px-1.5 py-0">{levelLabel(node.level)}</Badge>
                <Badge variant={node.status === "active" ? "success" : "danger"} className="text-[10px] px-1.5 py-0">{node.status}</Badge>
              </div>
              {hasSubNodes && expanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />

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
              {nodes.length === 0 ? "No nodes yet. Add your first Zone / Circle / Division / Station."
                : `${nodes.length} node${nodes.length !== 1 ? "s" : ""} · click a ${levelLabel(4)} to manage its catalog`}
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
            {/* Equipment catalog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> {selectedStation.name} — Catalog
                </CardTitle>
                <CardDescription>Voltage Classes → Equipment Types → Components &amp; Instances</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
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
                              <button onClick={() => setExpandedVcs((p) => { const n = new Set(p); n.has(vc.id) ? n.delete(vc.id) : n.add(vc.id); return n; })} className="text-slate-400 hover:text-foreground">
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

                            {vcExpanded && (
                              <div className="border-t border-border px-3 py-2 space-y-2">
                                {vcEts.length === 0 ? (
                                  <p className="text-xs text-foreground-secondary italic ml-5">No equipment types yet.</p>
                                ) : vcEts.map((et) => {
                                  const etComps = components.filter((c) => c.equipment_type_id === et.id);
                                  const etExpanded = expandedEts.has(et.id);
                                  const isUploading = uploadingEt[et.id];
                                  const fieldCount = et.custom_field_definitions?.length ?? 0;
                                  return (
                                    <div key={et.id} className="ml-5 rounded border border-border">
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 flex-wrap">
                                        <button onClick={() => setExpandedEts((p) => { const n = new Set(p); n.has(et.id) ? n.delete(et.id) : n.add(et.id); return n; })} className="text-slate-400 hover:text-foreground">
                                          <ChevronRight className={`h-3 w-3 transition-transform ${etExpanded ? "rotate-90" : ""}`} />
                                        </button>
                                        {et.image_url ? (
                                          <img src={et.image_url} alt={et.name} className="h-6 w-6 rounded object-cover border border-border shrink-0 cursor-pointer" onClick={() => triggerImageUpload(et.id)} title="Click to replace image" />
                                        ) : <Wrench className="h-3 w-3 text-blue-500 shrink-0" />}
                                        <span className="text-xs font-medium flex-1 min-w-0 truncate">{et.name}</span>

                                        {/* Action buttons */}
                                        <button onClick={() => triggerImageUpload(et.id)} disabled={isUploading} className="text-slate-300 hover:text-blue-500" title="Upload image">
                                          <Camera className={`h-3 w-3 ${isUploading ? "animate-pulse text-blue-400" : ""}`} />
                                        </button>
                                        <button onClick={() => openFieldsDialog(et)} className="text-slate-300 hover:text-purple-500" title="Custom fields">
                                          <Settings2 className="h-3 w-3" />
                                        </button>
                                        {fieldCount > 0 && <span className="text-[9px] text-purple-500 font-semibold">{fieldCount}f</span>}
                                        <button onClick={() => openInstancesDialog(et)} className="text-slate-300 hover:text-green-600" title="View instances">
                                          <ClipboardList className="h-3 w-3" />
                                        </button>
                                        <Button size="sm" variant="outline" className="h-5 px-1.5 text-[11px] gap-0.5" onClick={() => { setCompEtId(et.id); setCompDialog(true); }}>
                                          <Plus className="h-2.5 w-2.5" /> Comp.
                                        </Button>
                                        <button onClick={() => deleteEquipmentType(et.id)} className="text-slate-300 hover:text-red-500 ml-0.5">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>

                                      {etExpanded && et.image_url && (
                                        <div className="border-t border-border px-3 py-2">
                                          <img src={et.image_url} alt={et.name} className="w-full max-h-40 object-contain rounded-md border border-border bg-slate-50" />
                                        </div>
                                      )}
                                      {etExpanded && (
                                        <div className="border-t border-border px-3 py-1.5 space-y-1">
                                          {etComps.length === 0 ? (
                                            <p className="text-[11px] text-foreground-secondary italic ml-4">No components yet.</p>
                                          ) : etComps.map((comp) => (
                                            <div key={comp.id} className="flex items-center gap-2 ml-4">
                                              <Box className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                              <span className="text-[11px] flex-1">{comp.name}</span>
                                              <button onClick={() => deleteComponent(comp.id)} className="text-slate-300 hover:text-red-500">
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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

            {/* Contact + Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" /> Contact &amp; Location
                </CardTitle>
                <CardDescription>KPTCL officer contact and GPS coordinates for this substation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Location
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
                    <a href={mapsUrl(selectedStation.latitude, selectedStation.longitude)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
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

      {/* ── Add Hierarchy Node ─────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hierarchy Node</DialogTitle></DialogHeader>
          <div className="space-y-4 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value, parent_id: "", lat: "", lng: "" }))}>
                {[1, 2, 3, 4].map((l) => <option key={l} value={String(l)}>Level {l} — {levelLabel(l)}</option>)}
              </select>
            </div>
            {parseInt(form.level, 10) > 1 && (
              <div className="space-y-1.5">
                <Label>Parent {levelLabel(parseInt(form.level, 10) - 1)}</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
                  <option value="">— select parent —</option>
                  {parentOptions().map((p) => <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ""}</option>)}
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
                    <Input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="e.g. 12.9716" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="e.g. 77.5946" />
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

      {/* ── Add Voltage Class ──────────────────────────────────────────────── */}
      <Dialog open={vcDialog} onOpenChange={setVcDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Voltage Class</DialogTitle></DialogHeader>
          <div className="space-y-3 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. 11kV, 66kV, 110kV)</Label>
              <Input value={vcName} onChange={(e) => setVcName(e.target.value)} placeholder="e.g. 33kV" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVcDialog(false)}>Cancel</Button>
            <Button onClick={addVoltageClass} disabled={savingVc || !vcName.trim()}>{savingVc ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Equipment Type ─────────────────────────────────────────────── */}
      <Dialog open={etDialog} onOpenChange={setEtDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Equipment Type</DialogTitle></DialogHeader>
          <div className="space-y-3 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. Power Transformer, Circuit Breaker)</Label>
              <Input value={etName} onChange={(e) => setEtName(e.target.value)} placeholder="e.g. Power Transformer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtDialog(false)}>Cancel</Button>
            <Button onClick={addEquipmentType} disabled={savingEt || !etName.trim()}>{savingEt ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Component ──────────────────────────────────────────────────── */}
      <Dialog open={compDialog} onOpenChange={setCompDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
          <div className="space-y-3 px-6 py-2">
            <div className="space-y-1.5">
              <Label>Name (e.g. Bushing, Tap Changer, Cooling Fan)</Label>
              <Input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="e.g. HV Bushing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialog(false)}>Cancel</Button>
            <Button onClick={addComponent} disabled={savingComp || !compName.trim()}>{savingComp ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Field Definitions ───────────────────────────────────────── */}
      <Dialog open={fieldsDialog} onOpenChange={setFieldsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom Fields — {fieldsEt?.name}</DialogTitle>
            <DialogDescription>Define attributes captured for every instance of this equipment type. These become columns in the CSV template.</DialogDescription>
          </DialogHeader>
          <form id="fields-form" className="px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {fieldDefs.length === 0 && (
              <p className="text-sm text-foreground-secondary italic text-center py-4">No custom fields yet. Click "Add Field" to start.</p>
            )}
            {fieldDefs.map((fd, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={fd.label}
                  onChange={(e) => updateFieldDef(idx, { label: e.target.value })}
                  placeholder="Field label (e.g. Capacity MVA)"
                  className="flex-1 h-8 text-xs"
                />
                <select
                  value={fd.type}
                  onChange={(e) => updateFieldDef(idx, { type: e.target.value as any })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs h-8"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-foreground-secondary whitespace-nowrap">
                  <input type="checkbox" checked={fd.required} onChange={(e) => updateFieldDef(idx, { required: e.target.checked })} className="h-3 w-3" />
                  Req.
                </label>
                <button type="button" onClick={() => removeFieldDef(idx)} className="text-slate-300 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full" onClick={addFieldDef}>
              <Plus className="h-3.5 w-3.5" /> Add Field
            </Button>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldsDialog(false)}>Cancel</Button>
            <Button onClick={saveFieldDefs} disabled={savingFields}>{savingFields ? "Saving…" : "Save Fields"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Equipment Instances ────────────────────────────────────────────── */}
      <Dialog open={instancesDialog} onOpenChange={setInstancesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {instancesEt?.name} — Instances at {selectedStation?.name}
            </DialogTitle>
            <DialogDescription>Physical equipment records with maintenance tracking. {(instancesEt?.custom_field_definitions?.length ?? 0) === 0 && "Add custom fields to this equipment type to capture more attributes."}</DialogDescription>
          </DialogHeader>

          <div className="px-6 pt-2 pb-1 flex items-center gap-2 flex-wrap border-b border-border">
            <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={openAddInstDialog}>
              <Plus className="h-3.5 w-3.5" /> Add Instance
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => instancesEt && downloadTemplate(instancesEt)}>
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => csvInputRef.current?.click()} disabled={uploadingCsv}>
              <Upload className="h-3.5 w-3.5" /> {uploadingCsv ? "Uploading…" : "Bulk Upload CSV"}
            </Button>
          </div>

          {/* CSV result banner */}
          {csvResult && (
            <div className={`mx-6 mt-3 rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${csvResult.errors.length === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {csvResult.errors.length === 0
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium">{csvResult.inserted} row{csvResult.inserted !== 1 ? "s" : ""} inserted successfully.</p>
                {csvResult.errors.map((e, i) => <p key={i} className="text-xs text-foreground-secondary mt-0.5">{e}</p>)}
              </div>
            </div>
          )}

          <div className="px-6 py-3 max-h-[50vh] overflow-auto">
            {loadingInstances ? (
              <p className="text-sm text-foreground-secondary text-center py-8">Loading…</p>
            ) : instances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-foreground-secondary">
                <ClipboardList className="h-8 w-8 text-slate-200" />
                <p className="text-sm">No instances yet. Add one or bulk upload a CSV.</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold text-foreground-secondary">Name / Tag</th>
                    <th className="text-left py-2 pr-3 font-semibold text-foreground-secondary">Serial No.</th>
                    <th className="text-left py-2 pr-3 font-semibold text-foreground-secondary">Last Maint.</th>
                    <th className="text-left py-2 pr-3 font-semibold text-foreground-secondary">Next Due</th>
                    <th className="text-left py-2 pr-3 font-semibold text-foreground-secondary">Status</th>
                    {(instancesEt?.custom_field_definitions ?? []).map((fd) => (
                      <th key={fd.key} className="text-left py-2 pr-3 font-semibold text-foreground-secondary">{fd.label}</th>
                    ))}
                    <th className="py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {instances.map((inst) => {
                    const days = daysFromNow(inst.next_due_date);
                    const overdue = days !== null && days < 0;
                    return (
                      <tr key={inst.id} className={`border-b border-border last:border-0 ${overdue ? "bg-red-50" : ""}`}>
                        <td className="py-2 pr-3 font-medium">{inst.name}</td>
                        <td className="py-2 pr-3 text-foreground-secondary">{inst.serial_number ?? "—"}</td>
                        <td className="py-2 pr-3 text-foreground-secondary">{fmtDate(inst.last_maintenance_date)}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground-secondary">{fmtDate(inst.next_due_date)}</span>
                            {dueBadge(inst.next_due_date)}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={INSTANCE_STATUS_VARIANT[inst.status]} className="text-[10px] px-1.5 py-0">
                            {INSTANCE_STATUS_LABEL[inst.status]}
                          </Badge>
                        </td>
                        {(instancesEt?.custom_field_definitions ?? []).map((fd) => (
                          <td key={fd.key} className="py-2 pr-3 text-foreground-secondary">
                            {inst.custom_data?.[fd.key] ?? "—"}
                          </td>
                        ))}
                        <td className="py-2">
                          <button onClick={() => deleteInstance(inst.id)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Instance ───────────────────────────────────────────────────── */}
      <Dialog open={addInstDialog} onOpenChange={setAddInstDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Equipment Instance</DialogTitle>
            <DialogDescription>{instancesEt?.name} at {selectedStation?.name}</DialogDescription>
          </DialogHeader>
          <form id="inst-form" className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Asset Name / Tag <span className="text-danger">*</span></Label>
              <Input value={instForm.name ?? ""} onChange={(e) => setInstForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. T1 — 40MVA Transformer" />
            </div>
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input value={instForm.serial_number ?? ""} onChange={(e) => setInstForm((f) => ({ ...f, serial_number: e.target.value }))} placeholder="e.g. SN-2024-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={instForm.status ?? "active"} onChange={(e) => setInstForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="under_maintenance">Under Maintenance</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Last Maintenance Date</Label>
                <Input type="date" value={instForm.last_maintenance_date ?? ""} onChange={(e) => setInstForm((f) => ({ ...f, last_maintenance_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={instForm.next_due_date ?? ""} onChange={(e) => setInstForm((f) => ({ ...f, next_due_date: e.target.value }))} />
              </div>
            </div>

            {/* Dynamic custom fields */}
            {(instancesEt?.custom_field_definitions ?? []).length > 0 && (
              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">Custom Attributes</p>
                {(instancesEt?.custom_field_definitions ?? []).map((fd) => (
                  <div key={fd.key} className="space-y-1.5">
                    <Label>{fd.label}{fd.required && <span className="text-danger ml-0.5">*</span>}</Label>
                    <Input
                      type={fd.type === "number" ? "number" : fd.type === "date" ? "date" : "text"}
                      value={instForm[`cf_${fd.key}`] ?? ""}
                      onChange={(e) => setInstForm((f) => ({ ...f, [`cf_${fd.key}`]: e.target.value }))}
                      placeholder={fd.type === "number" ? "0" : fd.type === "date" ? "" : `Enter ${fd.label}`}
                      required={fd.required}
                    />
                  </div>
                ))}
              </div>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInstDialog(false)}>Cancel</Button>
            <Button type="button" onClick={saveInstance} disabled={savingInst || !instForm.name?.trim()}>
              {savingInst ? "Saving…" : "Add Instance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
