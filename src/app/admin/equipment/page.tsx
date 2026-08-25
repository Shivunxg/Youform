// @ts-nocheck
"use client";

import * as React from "react";
import { Download, Upload, AlertTriangle, Clock, CheckCircle2, Wrench, CheckCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Station { id: string; name: string; code: string | null }
interface FieldDef { key: string; label: string; type: string }
interface Instance {
  id: string; name: string; serial_number: string | null;
  status: "active" | "inactive" | "under_maintenance";
  last_maintenance_date: string | null; next_due_date: string | null;
  custom_data: Record<string, string>;
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
  if (days < 0)   return <Badge variant="danger"  className="text-[10px] px-1.5 py-0 ml-1">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0)  return <Badge variant="danger"  className="text-[10px] px-1.5 py-0 ml-1">Due Today</Badge>;
  if (days <= 3)   return <Badge variant="warning" className="text-[10px] px-1.5 py-0 ml-1">Due in {days}d</Badge>;
  if (days <= 7)   return <Badge variant="accent"  className="text-[10px] px-1.5 py-0 ml-1">Due in {days}d</Badge>;
  return null;
}
const STATUS_LABEL: Record<string, string> = {
  active: "Active", inactive: "Inactive", under_maintenance: "Under Maintenance",
};
const STATUS_VARIANT: Record<string, any> = {
  active: "success", inactive: "default", under_maintenance: "warning",
};
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

// ── Station-level CSV template ────────────────────────────────────────────────
function downloadStationTemplate(station: Station, groups: EquipmentGroup[]) {
  // Collect all unique custom fields across all equipment types
  const allCustomFields: { key: string; label: string; etName: string; required: boolean }[] = [];
  const seenLabels = new Set<string>();
  for (const g of groups) {
    for (const fd of g.custom_field_definitions ?? []) {
      const col = fd.label.trim();
      if (!seenLabels.has(col)) {
        allCustomFields.push({ key: fd.key, label: col, etName: g.name, required: (fd as any).required ?? false });
        seenLabels.add(col);
      }
    }
  }

  const fixedHeaders = [
    "equipment_type *",
    "name *",
    "serial_number",
    "last_maintenance_date (YYYY-MM-DD)",
    "next_due_date (YYYY-MM-DD)",
    "status (active/inactive/under_maintenance)",
  ];
  const customHeaders = allCustomFields.map((f) => `${f.label}${f.required ? " *" : ""}`);
  const headers = [...fixedHeaders, ...customHeaders];

  // One sample row per equipment type
  const rows: string[][] = groups.map((g) => {
    const fixed = [g.name, "Asset Tag / Name", "SN-001", "2026-01-15", "2026-07-15", "active"];
    const custom = allCustomFields.map(() => "");
    return [...fixed, ...custom];
  });

  // Add hint rows listing all valid equipment type names
  const etList = groups.map((g) => g.name).join(" | ");
  const hint = [`Valid equipment_type values: ${etList}`, ...Array(headers.length - 1).fill("")];

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    headers.map(esc).join(","),
    hint.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `equipment_bulk_template_${station.name.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Report CSV export ─────────────────────────────────────────────────────────
function exportReport(station: Station, groups: EquipmentGroup[]) {
  const allCustomFields: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    for (const fd of g.custom_field_definitions ?? []) {
      if (!seen.has(fd.label)) { allCustomFields.push(fd); seen.add(fd.label); }
    }
  }
  const headers = [
    "Station", "Equipment Type", "Asset Name / Tag", "Serial Number",
    "Status", "Last Maintenance Date", "Next Due Date", "Days Until Due",
    ...allCustomFields.map((f) => f.label),
  ];
  const rows: string[][] = [];
  for (const g of groups) {
    for (const inst of g.instances) {
      const d = daysFromNow(inst.next_due_date);
      rows.push([
        station.name, g.name, inst.name, inst.serial_number ?? "",
        STATUS_LABEL[inst.status] ?? inst.status,
        inst.last_maintenance_date ?? "", inst.next_due_date ?? "",
        d === null ? "" : d < 0 ? `Overdue ${Math.abs(d)}d` : `${d}d`,
        ...allCustomFields.map((f) => inst.custom_data?.[f.key] ?? ""),
      ]);
    }
  }
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `equipment_register_${station.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EquipmentRegisterPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [stations, setStations] = React.useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [groups, setGroups] = React.useState<EquipmentGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingStations, setLoadingStations] = React.useState(true);

  // Bulk upload state
  const csvRef = React.useRef<HTMLInputElement>(null);
  const [uploadingCsv, setUploadingCsv] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{ inserted: number; errors: string[] } | null>(null);

  React.useEffect(() => {
    supabase.from("hierarchy_nodes").select("id, name, code").eq("level", 4).eq("status", "active").order("name")
      .then(({ data }) => { setStations(data ?? []); setLoadingStations(false); });
  }, []);

  async function loadEquipment(station: Station) {
    setLoading(true); setGroups([]); setUploadResult(null); setSelectedStation(station);

    const { data: instances } = await supabase
      .from("equipment_instances")
      .select("id, name, serial_number, status, last_maintenance_date, next_due_date, custom_data, equipment_type_id")
      .eq("station_id", station.id).order("name");

    if (!instances || instances.length === 0) {
      // Still load equipment types so template download works even with no instances
      await loadEquipmentTypes(station.id, []);
      setLoading(false); return;
    }

    const etIds = [...new Set(instances.map((i) => i.equipment_type_id))];
    await loadEquipmentTypes(station.id, instances, etIds);
    setLoading(false);
  }

  async function loadEquipmentTypes(stationId: string, instances: any[], etIds?: string[]) {
    // Load ALL equipment types for this station (via voltage_classes) for the template
    const { data: vcs } = await supabase.from("voltage_classes").select("id").eq("station_id", stationId);
    const vcIds = (vcs ?? []).map((v) => v.id);

    const { data: etData } = await supabase
      .from("equipment_types")
      .select("id, name, image_url, custom_field_definitions")
      .in("voltage_class_id", vcIds.length ? vcIds : ["__none__"])
      .order("name");

    const etMap = new Map<string, any>();
    for (const et of etData ?? []) etMap.set(et.id, et);

    const groupMap = new Map<string, EquipmentGroup>();
    // Add all ETs (even those with no instances yet)
    for (const et of etData ?? []) {
      groupMap.set(et.id, {
        id: et.id, name: et.name, image_url: et.image_url,
        custom_field_definitions: et.custom_field_definitions ?? [],
        instances: [],
      });
    }
    // Populate instances
    for (const inst of instances) {
      if (groupMap.has(inst.equipment_type_id)) {
        groupMap.get(inst.equipment_type_id)!.instances.push(inst);
      }
    }
    setGroups([...groupMap.values()]);
  }

  // ── Station-level bulk CSV upload ─────────────────────────────────────────
  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedStation) return;
    setUploadingCsv(true); setUploadResult(null);

    const text = await file.text();
    const rows = parseCsv(text).filter((r) => {
      // Skip hint rows (equipment_type starts with "Valid equipment_type")
      return !r["equipment_type *"]?.startsWith("Valid equipment_type");
    });

    // Build ET name → ET object map (case-insensitive)
    const etByName = new Map<string, EquipmentGroup>();
    for (const g of groups) etByName.set(g.name.trim().toLowerCase(), g);

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const etName = (row["equipment_type *"] ?? "").trim();
      const name   = (row["name *"] ?? "").trim();
      const rowNum = i + 2; // +2 because row 1 = header, row 2 = hint

      if (!etName) { errors.push(`Row ${rowNum}: missing equipment_type — skipped`); continue; }
      if (!name)   { errors.push(`Row ${rowNum}: missing name — skipped`); continue; }

      const et = etByName.get(etName.toLowerCase());
      if (!et) {
        errors.push(`Row ${rowNum}: equipment type "${etName}" not found at this station — skipped`);
        continue;
      }

      // Validate required custom fields
      const missing = (et.custom_field_definitions ?? []).filter((fd: any) => fd.required && !row[fd.label]?.trim());
      if (missing.length) {
        errors.push(`Row ${rowNum} (${name}): missing required field(s): ${missing.map((f: any) => f.label).join(", ")} — skipped`);
        continue;
      }

      const custom_data: Record<string, string> = {};
      for (const fd of et.custom_field_definitions ?? []) {
        custom_data[fd.key] = row[fd.label]?.trim() ?? "";
      }

      const rawStatus = row["status (active/inactive/under_maintenance)"]?.trim() || "active";
      const { error: insErr } = await supabase.from("equipment_instances").insert({
        equipment_type_id: et.id,
        station_id: selectedStation.id,
        name,
        serial_number: row["serial_number"]?.trim() || null,
        status: rawStatus,
        last_maintenance_date: row["last_maintenance_date (YYYY-MM-DD)"]?.trim() || null,
        next_due_date: row["next_due_date (YYYY-MM-DD)"]?.trim() || null,
        custom_data,
      });

      if (insErr) errors.push(`Row ${rowNum} (${name}): ${insErr.message}`);
      else inserted++;
    }

    setUploadResult({ inserted, errors });
    setUploadingCsv(false);
    e.target.value = "";
    if (inserted > 0) loadEquipment(selectedStation);
  }

  // Summary
  const allInstances = groups.flatMap((g) => g.instances);
  const overdueCount    = allInstances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d < 0; }).length;
  const dueSoonCount    = allInstances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d >= 0 && d <= 7; }).length;
  const underMaintCount = allInstances.filter((i) => i.status === "under_maintenance").length;
  const hasInstances    = allInstances.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden CSV input */}
      <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleBulkUpload} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Equipment Register</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Station-wise asset list with maintenance schedule
          </p>
        </div>
        {selectedStation && groups.length > 0 && (
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
              onChange={(e) => { const s = stations.find((s) => s.id === e.target.value); if (s) loadEquipment(s); }}
              disabled={loadingStations}
            >
              <option value="">— choose a substation —</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Upload result banner */}
      {uploadResult && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${uploadResult.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          {uploadResult.errors.length === 0
            ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">{uploadResult.inserted} row{uploadResult.inserted !== 1 ? "s" : ""} inserted successfully.</p>
            {uploadResult.errors.map((e, i) => <p key={i} className="text-xs text-foreground-secondary mt-0.5">{e}</p>)}
          </div>
        </div>
      )}

      {/* KPI strip */}
      {selectedStation && !loading && hasInstances && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Assets",       value: allInstances.length, icon: Wrench,        color: "text-blue-500",  bg: "" },
            { label: "Overdue",            value: overdueCount,        icon: XCircle,       color: "text-red-500",   bg: overdueCount > 0 ? "border-red-200 bg-red-50" : "" },
            { label: "Due in 7 days",      value: dueSoonCount,        icon: Clock,         color: "text-amber-500", bg: dueSoonCount > 0 ? "border-amber-200 bg-amber-50" : "" },
            { label: "Under Maintenance",  value: underMaintCount,     icon: CheckCircle2,  color: "text-amber-500", bg: underMaintCount > 0 ? "border-amber-200 bg-amber-50" : "" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl border border-border bg-white px-4 py-3 flex items-center gap-3 ${bg}`}>
              <Icon className={`h-5 w-5 shrink-0 ${value > 0 ? color : "text-slate-300"}`} />
              <div>
                <p className="text-xs text-foreground-secondary">{label}</p>
                <p className={`text-xl font-bold ${value > 0 && bg ? color.replace("text-", "text-") : "text-foreground"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <Card><CardContent className="py-16 text-center">
          <p className="text-sm text-foreground-secondary animate-pulse">Loading equipment register…</p>
        </CardContent></Card>
      )}

      {/* No instances yet — show template hint */}
      {!loading && selectedStation && groups.length > 0 && !hasInstances && (
        <div className="rounded-xl border border-border bg-blue-50 px-5 py-4 text-sm text-blue-800 flex items-start gap-3">
          <Upload className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-medium">No assets recorded yet for {selectedStation.name}.</p>
            <p className="mt-1 text-xs text-blue-700">
              Click <strong>Download Template</strong> above to get a pre-filled CSV with all {groups.length} equipment type{groups.length !== 1 ? "s" : ""} at this station,
              then fill in your assets and click <strong>Bulk Upload CSV</strong> to import everything at once.
            </p>
          </div>
        </div>
      )}

      {!loading && selectedStation && groups.length === 0 && (
        <Card><CardContent className="py-16 text-center">
          <Wrench className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-foreground-secondary">No equipment types configured for <strong>{selectedStation.name}</strong>.</p>
          <p className="text-xs text-foreground-secondary mt-1">Add voltage classes and equipment types from the Hierarchy page first.</p>
        </CardContent></Card>
      )}

      {/* Equipment groups */}
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
                    <td className="py-2.5 pr-4">
                      <Badge variant={STATUS_VARIANT[inst.status]} className="text-[10px] px-1.5 py-0">{STATUS_LABEL[inst.status]}</Badge>
                    </td>
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
    </div>
  );
}
