// @ts-nocheck
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Download, Upload, AlertTriangle, Clock, CheckCircle2, Wrench,
  CheckCircle, XCircle, Plus, Trash2, Zap, Settings2, Image as ImageIcon, X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Station       { id: string; name: string; code: string | null }
interface VoltageClass  { id: string; name: string; station_id: string }
interface FieldDef      { key: string; label: string; type: string; required?: boolean }
interface EquipType {
  id: string; name: string; voltage_class_id: string;
  image_url: string | null; custom_field_definitions: FieldDef[];
}
interface Instance {
  id: string; name: string; serial_number: string | null;
  status: "active" | "inactive" | "under_maintenance";
  last_maintenance_date: string | null; next_due_date: string | null;
  custom_data: Record<string, string>; equipment_type_id: string;
}
interface EquipmentGroup {
  id: string; name: string; image_url: string | null;
  custom_field_definitions: FieldDef[]; instances: Instance[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function daysFromNow(d: string | null): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}
function dueBadge(nextDue: string | null) {
  const days = daysFromNow(nextDue);
  if (days === null) return null;
  if (days < 0)  return <Badge variant="danger"  className="text-[10px] px-1.5 py-0 ml-1">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge variant="danger"  className="text-[10px] px-1.5 py-0 ml-1">Due Today</Badge>;
  if (days <= 3)  return <Badge variant="warning" className="text-[10px] px-1.5 py-0 ml-1">Due in {days}d</Badge>;
  if (days <= 7)  return <Badge variant="accent"  className="text-[10px] px-1.5 py-0 ml-1">Due in {days}d</Badge>;
  return null;
}
const STATUS_LABEL: Record<string, string> = { active: "Active", inactive: "Inactive", under_maintenance: "Under Maintenance" };
const STATUS_VARIANT: Record<string, any>  = { active: "success", inactive: "default", under_maintenance: "warning" };
function rowClass(nextDue: string | null, status: string) {
  if (status === "under_maintenance") return "bg-amber-50";
  const d = daysFromNow(nextDue);
  if (d !== null && d < 0) return "bg-red-50";
  return "";
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
function downloadStationTemplate(station: Station, groups: EquipmentGroup[]) {
  const allCustomFields: { key: string; label: string; required: boolean }[] = [];
  const seenLabels = new Set<string>();
  for (const g of groups) {
    for (const fd of g.custom_field_definitions ?? []) {
      if (!seenLabels.has(fd.label)) { allCustomFields.push({ key: fd.key, label: fd.label, required: fd.required ?? false }); seenLabels.add(fd.label); }
    }
  }
  const fixedHeaders = ["equipment_type *", "name *", "serial_number", "last_maintenance_date (YYYY-MM-DD)", "next_due_date (YYYY-MM-DD)", "status (active/inactive/under_maintenance)"];
  const customHeaders = allCustomFields.map((f) => `${f.label}${f.required ? " *" : ""}`);
  const headers = [...fixedHeaders, ...customHeaders];
  const rows: string[][] = groups.map((g) => {
    return [g.name, "Asset Tag / Name", "SN-001", "2026-01-15", "2026-07-15", "active", ...allCustomFields.map(() => "")];
  });
  const etList = groups.map((g) => g.name).join(" | ");
  const hint = [`Valid equipment_type values: ${etList}`, ...Array(headers.length - 1).fill("")];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), hint.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `equipment_bulk_template_${station.name.replace(/\s+/g, "_")}.csv`; a.click();
  URL.revokeObjectURL(url);
}
function exportReport(station: Station, groups: EquipmentGroup[]) {
  const allCustomFields: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const g of groups) for (const fd of g.custom_field_definitions ?? []) if (!seen.has(fd.label)) { allCustomFields.push(fd); seen.add(fd.label); }
  const headers = ["Station", "Equipment Type", "Asset Name / Tag", "Serial Number", "Status", "Last Maintenance Date", "Next Due Date", "Days Until Due", ...allCustomFields.map((f) => f.label)];
  const rows: string[][] = [];
  for (const g of groups) {
    for (const inst of g.instances) {
      const d = daysFromNow(inst.next_due_date);
      rows.push([station.name, g.name, inst.name, inst.serial_number ?? "", STATUS_LABEL[inst.status] ?? inst.status, inst.last_maintenance_date ?? "", inst.next_due_date ?? "", d === null ? "" : d < 0 ? `Overdue ${Math.abs(d)}d` : `${d}d`, ...allCustomFields.map((f) => inst.custom_data?.[f.key] ?? "")]);
    }
  }
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `equipment_register_${station.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EquipmentRegisterPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  // Shared state
  const [tab, setTab] = React.useState<"assets" | "setup">("assets");
  const [stations, setStations] = React.useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [loadingStations, setLoadingStations] = React.useState(true);

  // Assets tab state
  const [groups, setGroups] = React.useState<EquipmentGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const csvRef = React.useRef<HTMLInputElement>(null);
  const [uploadingCsv, setUploadingCsv] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{ inserted: number; errors: string[] } | null>(null);

  // Setup tab state
  const [voltageClasses, setVoltageClasses] = React.useState<VoltageClass[]>([]);
  const [selectedVc, setSelectedVc] = React.useState<VoltageClass | null>(null);
  const [equipTypes, setEquipTypes] = React.useState<EquipType[]>([]);
  const [selectedEt, setSelectedEt] = React.useState<EquipType | null>(null);
  const [loadingSetup, setLoadingSetup] = React.useState(false);

  // Add VC dialog
  const [vcDialogOpen, setVcDialogOpen] = React.useState(false);
  const [vcName, setVcName] = React.useState("");
  const [savingVc, setSavingVc] = React.useState(false);

  // Add ET dialog
  const [etDialogOpen, setEtDialogOpen] = React.useState(false);
  const [etName, setEtName] = React.useState("");
  const [savingEt, setSavingEt] = React.useState(false);

  // Custom fields editor
  const [fields, setFields] = React.useState<FieldDef[]>([]);
  const [newField, setNewField] = React.useState({ label: "", type: "text", required: false });
  const [savingFields, setSavingFields] = React.useState(false);

  // Image upload
  const imgRef = React.useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = React.useState(false);

  // ── Load stations ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    supabase.from("hierarchy_nodes").select("id, name, code").eq("level", 4).eq("status", "active").order("name")
      .then(({ data }) => { setStations(data ?? []); setLoadingStations(false); });
  }, []);

  // Auto-select station from query param
  React.useEffect(() => {
    const qStation = searchParams?.get("station");
    if (qStation && stations.length > 0 && !selectedStation) {
      const s = stations.find((st) => st.id === qStation);
      if (s) handleSelectStation(s);
    }
  }, [stations, searchParams]);

  async function handleSelectStation(station: Station) {
    setSelectedStation(station);
    setSelectedVc(null); setSelectedEt(null); setEquipTypes([]); setVoltageClasses([]); setUploadResult(null);
    if (tab === "assets") { await loadEquipment(station); }
    if (tab === "setup")  { await loadVoltageClasses(station.id); }
  }

  // ── Assets tab ───────────────────────────────────────────────────────────────
  async function loadEquipment(station: Station) {
    setLoading(true); setGroups([]);
    const { data: instances } = await supabase
      .from("equipment_instances")
      .select("id, name, serial_number, status, last_maintenance_date, next_due_date, custom_data, equipment_type_id")
      .eq("station_id", station.id).order("name");

    const { data: vcs } = await supabase.from("voltage_classes").select("id").eq("station_id", station.id);
    const vcIds = (vcs ?? []).map((v) => v.id);
    const { data: etData } = await supabase.from("equipment_types").select("id, name, image_url, custom_field_definitions").in("voltage_class_id", vcIds.length ? vcIds : ["__none__"]).order("name");

    const groupMap = new Map<string, EquipmentGroup>();
    for (const et of etData ?? []) {
      groupMap.set(et.id, { id: et.id, name: et.name, image_url: et.image_url, custom_field_definitions: et.custom_field_definitions ?? [], instances: [] });
    }
    for (const inst of instances ?? []) {
      if (groupMap.has(inst.equipment_type_id)) groupMap.get(inst.equipment_type_id)!.instances.push(inst);
    }
    setGroups([...groupMap.values()]);
    setLoading(false);
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedStation) return;
    setUploadingCsv(true); setUploadResult(null);
    const text = await file.text();
    const rows = parseCsv(text).filter((r) => !r["equipment_type *"]?.startsWith("Valid equipment_type"));
    const etByName = new Map<string, EquipmentGroup>();
    for (const g of groups) etByName.set(g.name.trim().toLowerCase(), g);
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const etName = (row["equipment_type *"] ?? "").trim();
      const name   = (row["name *"] ?? "").trim();
      const rowNum = i + 2;
      if (!etName) { errors.push(`Row ${rowNum}: missing equipment_type — skipped`); continue; }
      if (!name)   { errors.push(`Row ${rowNum}: missing name — skipped`); continue; }
      const et = etByName.get(etName.toLowerCase());
      if (!et) { errors.push(`Row ${rowNum}: equipment type "${etName}" not found at this station — skipped`); continue; }
      const missing = (et.custom_field_definitions ?? []).filter((fd: any) => fd.required && !row[fd.label]?.trim());
      if (missing.length) { errors.push(`Row ${rowNum} (${name}): missing required field(s): ${missing.map((f: any) => f.label).join(", ")} — skipped`); continue; }
      const custom_data: Record<string, string> = {};
      for (const fd of et.custom_field_definitions ?? []) custom_data[fd.key] = row[fd.label]?.trim() ?? "";
      const rawStatus = row["status (active/inactive/under_maintenance)"]?.trim() || "active";
      const { error: insErr } = await supabase.from("equipment_instances").insert({
        equipment_type_id: et.id, station_id: selectedStation.id, name,
        serial_number: row["serial_number"]?.trim() || null, status: rawStatus,
        last_maintenance_date: row["last_maintenance_date (YYYY-MM-DD)"]?.trim() || null,
        next_due_date: row["next_due_date (YYYY-MM-DD)"]?.trim() || null, custom_data,
      });
      if (insErr) errors.push(`Row ${rowNum} (${name}): ${insErr.message}`); else inserted++;
    }
    setUploadResult({ inserted, errors });
    setUploadingCsv(false);
    e.target.value = "";
    if (inserted > 0) loadEquipment(selectedStation);
  }

  // ── Setup tab ────────────────────────────────────────────────────────────────
  async function loadVoltageClasses(stationId: string) {
    setLoadingSetup(true);
    const { data } = await supabase.from("voltage_classes").select("*").eq("station_id", stationId).order("name");
    setVoltageClasses(data ?? []);
    setLoadingSetup(false);
  }

  async function addVoltageClass() {
    if (!vcName.trim() || !selectedStation) return;
    setSavingVc(true);
    await supabase.from("voltage_classes").insert({ name: vcName.trim(), station_id: selectedStation.id });
    setSavingVc(false); setVcDialogOpen(false); setVcName("");
    loadVoltageClasses(selectedStation.id);
  }

  async function deleteVoltageClass(vc: VoltageClass) {
    if (!confirm(`Delete voltage class "${vc.name}"? This will also remove all equipment types under it.`)) return;
    await supabase.from("voltage_classes").delete().eq("id", vc.id);
    if (selectedVc?.id === vc.id) { setSelectedVc(null); setEquipTypes([]); setSelectedEt(null); }
    loadVoltageClasses(selectedStation!.id);
  }

  async function selectVc(vc: VoltageClass) {
    if (selectedVc?.id === vc.id) { setSelectedVc(null); setEquipTypes([]); setSelectedEt(null); return; }
    setSelectedVc(vc); setSelectedEt(null);
    const { data } = await supabase.from("equipment_types").select("*").eq("voltage_class_id", vc.id).order("name");
    setEquipTypes(data ?? []);
  }

  async function addEquipmentType() {
    if (!etName.trim() || !selectedVc) return;
    setSavingEt(true);
    await supabase.from("equipment_types").insert({ name: etName.trim(), voltage_class_id: selectedVc.id, custom_field_definitions: [] });
    setSavingEt(false); setEtDialogOpen(false); setEtName("");
    const { data } = await supabase.from("equipment_types").select("*").eq("voltage_class_id", selectedVc.id).order("name");
    setEquipTypes(data ?? []);
  }

  async function deleteEquipmentType(et: EquipType) {
    if (!confirm(`Delete equipment type "${et.name}"?`)) return;
    await supabase.from("equipment_types").delete().eq("id", et.id);
    if (selectedEt?.id === et.id) setSelectedEt(null);
    const { data } = await supabase.from("equipment_types").select("*").eq("voltage_class_id", selectedVc!.id).order("name");
    setEquipTypes(data ?? []);
  }

  function selectEt(et: EquipType) {
    if (selectedEt?.id === et.id) { setSelectedEt(null); return; }
    setSelectedEt(et);
    setFields(et.custom_field_definitions ?? []);
  }

  async function saveFields() {
    if (!selectedEt) return;
    setSavingFields(true);
    const { data } = await supabase.from("equipment_types").update({ custom_field_definitions: fields }).eq("id", selectedEt.id).select("*").single();
    if (data) {
      setSelectedEt(data);
      setEquipTypes((prev) => prev.map((e) => e.id === data.id ? data : e));
    }
    setSavingFields(false);
  }

  function addField() {
    if (!newField.label.trim()) return;
    const key = newField.label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (fields.some((f) => f.key === key)) { alert("A field with this key already exists."); return; }
    setFields((prev) => [...prev, { key, label: newField.label.trim(), type: newField.type, required: newField.required }]);
    setNewField({ label: "", type: "text", required: false });
  }

  function removeField(key: string) { setFields((prev) => prev.filter((f) => f.key !== key)); }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedEt) return;
    setUploadingImg(true);
    const ext = file.name.split(".").pop();
    const path = `${selectedEt.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("equipment-images").upload(path, file, { upsert: true });
    if (upErr) { alert("Upload failed: " + upErr.message); setUploadingImg(false); e.target.value = ""; return; }
    const { data: urlData } = supabase.storage.from("equipment-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
    const { data } = await supabase.from("equipment_types").update({ image_url: publicUrl }).eq("id", selectedEt.id).select("*").single();
    if (data) { setSelectedEt(data); setEquipTypes((prev) => prev.map((e) => e.id === data.id ? data : e)); }
    setUploadingImg(false); e.target.value = "";
  }

  async function removeImage() {
    if (!selectedEt || !selectedEt.image_url) return;
    await supabase.from("equipment_types").update({ image_url: null }).eq("id", selectedEt.id);
    const updated = { ...selectedEt, image_url: null };
    setSelectedEt(updated);
    setEquipTypes((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  }

  // Handle tab switch
  async function switchTab(t: "assets" | "setup") {
    setTab(t);
    if (!selectedStation) return;
    if (t === "assets")  { await loadEquipment(selectedStation); }
    if (t === "setup")   { setSelectedVc(null); setSelectedEt(null); setEquipTypes([]); await loadVoltageClasses(selectedStation.id); }
  }

  // Assets summary
  const allInstances = groups.flatMap((g) => g.instances);
  const overdueCount    = allInstances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d < 0; }).length;
  const dueSoonCount    = allInstances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d >= 0 && d <= 7; }).length;
  const underMaintCount = allInstances.filter((i) => i.status === "under_maintenance").length;
  const hasInstances    = allInstances.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden inputs */}
      <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleBulkUpload} />
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Equipment Register</h1>
          <p className="text-sm text-foreground-secondary mt-1">Station-wise asset catalog and maintenance schedule</p>
        </div>
        {tab === "assets" && selectedStation && groups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => downloadStationTemplate(selectedStation, groups)} className="gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <Button variant="outline" onClick={() => csvRef.current?.click()} disabled={uploadingCsv} className="gap-2">
              <Upload className="h-4 w-4" /> {uploadingCsv ? "Uploading…" : "Bulk Upload CSV"}
            </Button>
            {hasInstances && (
              <Button onClick={() => exportReport(selectedStation, groups)} className="gap-2">
                <Download className="h-4 w-4" /> Export Report
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Station selector */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Select Station</label>
            <select
              className="flex-1 min-w-[220px] max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              value={selectedStation?.id ?? ""}
              onChange={(e) => { const s = stations.find((s) => s.id === e.target.value); if (s) handleSelectStation(s); }}
              disabled={loadingStations}
            >
              <option value="">— choose a substation —</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        {([["assets", "Assets", Wrench], ["setup", "Catalog Setup", Settings2]] as const).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-accent text-accent" : "border-transparent text-foreground-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── ASSETS TAB ─────────────────────────────────────────────────────── */}
      {tab === "assets" && (
        <>
          {uploadResult && (
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${uploadResult.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              {uploadResult.errors.length === 0 ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium">{uploadResult.inserted} row{uploadResult.inserted !== 1 ? "s" : ""} inserted successfully.</p>
                {uploadResult.errors.map((e, i) => <p key={i} className="text-xs text-foreground-secondary mt-0.5">{e}</p>)}
              </div>
            </div>
          )}

          {selectedStation && !loading && hasInstances && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Assets",      value: allInstances.length, icon: Wrench,       color: "text-blue-500",  bg: "" },
                { label: "Overdue",           value: overdueCount,        icon: XCircle,      color: "text-red-500",   bg: overdueCount > 0 ? "border-red-200 bg-red-50" : "" },
                { label: "Due in 7 days",     value: dueSoonCount,        icon: Clock,        color: "text-amber-500", bg: dueSoonCount > 0 ? "border-amber-200 bg-amber-50" : "" },
                { label: "Under Maintenance", value: underMaintCount,     icon: CheckCircle2, color: "text-amber-500", bg: underMaintCount > 0 ? "border-amber-200 bg-amber-50" : "" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`rounded-xl border border-border bg-white px-4 py-3 flex items-center gap-3 ${bg}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${value > 0 ? color : "text-slate-300"}`} />
                  <div>
                    <p className="text-xs text-foreground-secondary">{label}</p>
                    <p className={`text-xl font-bold ${value > 0 && bg ? color : "text-foreground"}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <Card><CardContent className="py-16 text-center"><p className="text-sm text-foreground-secondary animate-pulse">Loading equipment register…</p></CardContent></Card>
          )}

          {!loading && selectedStation && groups.length > 0 && !hasInstances && (
            <div className="rounded-xl border border-border bg-blue-50 px-5 py-4 text-sm text-blue-800 flex items-start gap-3">
              <Upload className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium">No assets recorded yet for {selectedStation.name}.</p>
                <p className="mt-1 text-xs text-blue-700">
                  Click <strong>Download Template</strong> above to get a pre-filled CSV with all {groups.length} equipment type{groups.length !== 1 ? "s" : ""} at this station,
                  then fill in your assets and click <strong>Bulk Upload CSV</strong> to import.
                </p>
              </div>
            </div>
          )}

          {!loading && selectedStation && groups.length === 0 && (
            <Card><CardContent className="py-16 text-center">
              <Wrench className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-foreground-secondary">No equipment types configured for <strong>{selectedStation.name}</strong>.</p>
              <p className="text-xs text-foreground-secondary mt-1">Switch to the <strong>Catalog Setup</strong> tab to add voltage classes and equipment types first.</p>
            </CardContent></Card>
          )}

          {!loading && groups.filter((g) => g.instances.length > 0).map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {group.image_url
                    ? <img src={group.image_url} alt={group.name} className="h-8 w-8 rounded object-cover border border-border shrink-0" />
                    : <Wrench className="h-4 w-4 text-blue-500 shrink-0" />}
                  <span className="text-base font-semibold text-foreground">{group.name}</span>
                  <span className="text-xs text-foreground-secondary">{group.instances.length} asset{group.instances.length !== 1 ? "s" : ""}</span>
                  {group.instances.some((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d < 0; }) && (
                    <Badge variant="danger" className="text-[10px] ml-auto">Has Overdue</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground-secondary">Asset Name / Tag</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground-secondary">Serial No.</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground-secondary">Status</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground-secondary">Last Maintenance</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground-secondary">Next Due</th>
                      {group.custom_field_definitions.map((fd) => (
                        <th key={fd.key} className="text-left py-2 pr-4 font-semibold text-foreground-secondary">{fd.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.instances.map((inst) => (
                      <tr key={inst.id} className={`border-b border-border last:border-0 ${rowClass(inst.next_due_date, inst.status)}`}>
                        <td className="py-2.5 pr-4 font-medium text-foreground">{inst.name}</td>
                        <td className="py-2.5 pr-4 text-foreground-secondary">{inst.serial_number ?? "—"}</td>
                        <td className="py-2.5 pr-4"><Badge variant={STATUS_VARIANT[inst.status]} className="text-[10px] px-1.5 py-0">{STATUS_LABEL[inst.status]}</Badge></td>
                        <td className="py-2.5 pr-4 text-foreground-secondary">{fmtDate(inst.last_maintenance_date)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-foreground-secondary">{fmtDate(inst.next_due_date)}</span>
                          {dueBadge(inst.next_due_date)}
                        </td>
                        {group.custom_field_definitions.map((fd) => (
                          <td key={fd.key} className="py-2.5 pr-4 text-foreground-secondary">{inst.custom_data?.[fd.key] ?? "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* ── SETUP TAB ──────────────────────────────────────────────────────── */}
      {tab === "setup" && (
        <>
          {!selectedStation && (
            <Card><CardContent className="py-12 text-center text-sm text-foreground-secondary">Select a station above to manage its equipment catalog.</CardContent></Card>
          )}

          {selectedStation && loadingSetup && (
            <Card><CardContent className="py-12 text-center text-sm text-foreground-secondary animate-pulse">Loading setup…</CardContent></Card>
          )}

          {selectedStation && !loadingSetup && (
            <div className={`grid gap-5 ${selectedVc ? (selectedEt ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2") : "grid-cols-1"}`}>

              {/* ── Voltage Classes panel ──────────────────────────── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-yellow-500" /> Voltage Classes</CardTitle>
                      <p className="text-xs text-foreground-secondary mt-0.5">{selectedStation.name}</p>
                    </div>
                    <Button size="sm" onClick={() => { setVcDialogOpen(true); setVcName(""); }} className="gap-1.5 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {voltageClasses.length === 0 && (
                    <p className="text-xs text-foreground-secondary py-4 text-center">No voltage classes yet. Click Add to create one (e.g. 220KV, 110KV, 33KV).</p>
                  )}
                  {voltageClasses.map((vc) => (
                    <div
                      key={vc.id}
                      onClick={() => selectVc(vc)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedVc?.id === vc.id ? "bg-blue-50 text-accent" : "hover:bg-hover text-foreground"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className={`h-3.5 w-3.5 shrink-0 ${selectedVc?.id === vc.id ? "text-accent" : "text-yellow-500"}`} />
                        <span className="text-sm font-medium truncate">{vc.name}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteVoltageClass(vc); }}
                        className="shrink-0 text-slate-300 hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* ── Equipment Types panel ─────────────────────────── */}
              {selectedVc && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-blue-500" /> Equipment Types</CardTitle>
                        <p className="text-xs text-foreground-secondary mt-0.5">{selectedVc.name}</p>
                      </div>
                      <Button size="sm" onClick={() => { setEtDialogOpen(true); setEtName(""); }} className="gap-1.5 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    {equipTypes.length === 0 && (
                      <p className="text-xs text-foreground-secondary py-4 text-center">No equipment types yet. Click Add to create one (e.g. Power Transformer, Circuit Breaker).</p>
                    )}
                    {equipTypes.map((et) => (
                      <div
                        key={et.id}
                        onClick={() => selectEt(et)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${selectedEt?.id === et.id ? "bg-blue-50 text-accent" : "hover:bg-hover text-foreground"}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {et.image_url
                            ? <img src={et.image_url} alt={et.name} className="h-6 w-6 rounded object-cover border border-border shrink-0" />
                            : <Wrench className={`h-3.5 w-3.5 shrink-0 ${selectedEt?.id === et.id ? "text-accent" : "text-blue-400"}`} />}
                          <span className="text-sm font-medium truncate">{et.name}</span>
                          {(et.custom_field_definitions ?? []).length > 0 && (
                            <span className="text-[10px] text-foreground-secondary shrink-0">{et.custom_field_definitions.length}f</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEquipmentType(et); }}
                          className="shrink-0 text-slate-300 hover:text-danger transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ── Equipment Type Detail ─────────────────────────── */}
              {selectedEt && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{selectedEt.name}</CardTitle>
                    <p className="text-xs text-foreground-secondary">Custom fields &amp; image</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-5">
                    {/* Image */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" /> Equipment Image
                      </p>
                      {selectedEt.image_url ? (
                        <div className="relative w-32 group">
                          <img src={selectedEt.image_url} alt={selectedEt.name} className="h-24 w-32 object-cover rounded-lg border border-border" />
                          <button
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-border flex items-center justify-center text-danger shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-24 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-hover/30 text-foreground-secondary">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={uploadingImg} className="gap-2 text-xs">
                        <Upload className="h-3.5 w-3.5" /> {uploadingImg ? "Uploading…" : selectedEt.image_url ? "Replace Image" : "Upload Image"}
                      </Button>
                    </div>

                    {/* Custom Fields */}
                    <div className="space-y-3 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">Custom Fields</p>

                      {fields.length > 0 && (
                        <div className="space-y-1.5">
                          {fields.map((f, i) => (
                            <div key={f.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">{f.label}</p>
                                <p className="text-[11px] text-foreground-secondary">{f.type}{f.required ? " · required" : ""}</p>
                              </div>
                              <button onClick={() => removeField(f.key)} className="text-slate-300 hover:text-danger transition-colors shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add field form */}
                      <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                        <p className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wide">Add Field</p>
                        <Input placeholder="Field label (e.g. Make / Model)" value={newField.label} onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))} className="h-8 text-xs" />
                        <div className="flex gap-2 items-center">
                          <select className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs" value={newField.type} onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value }))}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-foreground-secondary whitespace-nowrap">
                            <input type="checkbox" checked={newField.required} onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))}/> Required
                          </label>
                          <Button size="sm" onClick={addField} disabled={!newField.label.trim()} className="h-7 text-xs gap-1 px-2">
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        </div>
                      </div>

                      <Button onClick={saveFields} disabled={savingFields} size="sm" className="w-full">
                        {savingFields ? "Saving…" : "Save Fields"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Voltage Class dialog ────────────────────────────────────── */}
      <Dialog open={vcDialogOpen} onOpenChange={setVcDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Voltage Class</DialogTitle></DialogHeader>
          <div className="px-6 py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Voltage Class Name</Label>
              <Input value={vcName} onChange={(e) => setVcName(e.target.value)} placeholder="e.g. 220KV, 110KV, 33KV, 11KV" onKeyDown={(e) => e.key === "Enter" && addVoltageClass()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVcDialogOpen(false)}>Cancel</Button>
            <Button onClick={addVoltageClass} disabled={savingVc || !vcName.trim()}>{savingVc ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Equipment Type dialog ───────────────────────────────────── */}
      <Dialog open={etDialogOpen} onOpenChange={setEtDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Equipment Type</DialogTitle></DialogHeader>
          <div className="px-6 py-2 space-y-3">
            <p className="text-sm text-foreground-secondary">Adding to: <strong>{selectedVc?.name}</strong></p>
            <div className="space-y-1.5">
              <Label>Equipment Type Name</Label>
              <Input value={etName} onChange={(e) => setEtName(e.target.value)} placeholder="e.g. Power Transformer, Circuit Breaker, Bus Bar" onKeyDown={(e) => e.key === "Enter" && addEquipmentType()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtDialogOpen(false)}>Cancel</Button>
            <Button onClick={addEquipmentType} disabled={savingEt || !etName.trim()}>{savingEt ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
