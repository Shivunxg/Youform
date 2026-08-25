// @ts-nocheck
"use client";

import * as React from "react";
import { Download, AlertTriangle, Clock, CheckCircle2, Wrench } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Station { id: string; name: string; code: string | null }
interface FieldDef { key: string; label: string; type: string }
interface Instance {
  id: string;
  name: string;
  serial_number: string | null;
  status: "active" | "inactive" | "under_maintenance";
  last_maintenance_date: string | null;
  next_due_date: string | null;
  custom_data: Record<string, string>;
}
interface EquipmentGroup {
  id: string;
  name: string;
  image_url: string | null;
  custom_field_definitions: FieldDef[];
  instances: Instance[];
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

const STATUS_LABEL: Record<string, string> = {
  active: "Active", inactive: "Inactive", under_maintenance: "Under Maintenance",
};
const STATUS_VARIANT: Record<string, any> = {
  active: "success", inactive: "default", under_maintenance: "warning",
};

function rowClass(nextDue: string | null, status: string) {
  if (status === "under_maintenance") return "bg-amber-50";
  const days = daysFromNow(nextDue);
  if (days !== null && days < 0) return "bg-red-50";
  return "";
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(station: Station, groups: EquipmentGroup[]) {
  const allCustomFields: FieldDef[] = [];
  const seenKeys = new Set<string>();
  for (const g of groups) {
    for (const fd of g.custom_field_definitions ?? []) {
      if (!seenKeys.has(fd.key)) { allCustomFields.push(fd); seenKeys.add(fd.key); }
    }
  }

  const fixedHeaders = [
    "Station", "Equipment Type", "Asset Name / Tag", "Serial Number",
    "Status", "Last Maintenance Date", "Next Due Date", "Days Until Due",
  ];
  const customHeaders = allCustomFields.map((f) => f.label);
  const headers = [...fixedHeaders, ...customHeaders];

  const rows: string[][] = [];
  for (const g of groups) {
    for (const inst of g.instances) {
      const days = daysFromNow(inst.next_due_date);
      const daysLabel = days === null ? "" : days < 0 ? `Overdue ${Math.abs(days)}d` : `${days}d`;
      const fixedCols = [
        station.name,
        g.name,
        inst.name,
        inst.serial_number ?? "",
        STATUS_LABEL[inst.status] ?? inst.status,
        inst.last_maintenance_date ?? "",
        inst.next_due_date ?? "",
        daysLabel,
      ];
      const customCols = allCustomFields.map((f) => inst.custom_data?.[f.key] ?? "");
      rows.push([...fixedCols, ...customCols]);
    }
  }

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
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

  React.useEffect(() => {
    supabase
      .from("hierarchy_nodes")
      .select("id, name, code")
      .eq("level", 4)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setStations(data ?? []);
        setLoadingStations(false);
      });
  }, []);

  async function loadEquipment(station: Station) {
    setLoading(true);
    setGroups([]);
    setSelectedStation(station);

    const { data: instances } = await supabase
      .from("equipment_instances")
      .select("id, name, serial_number, status, last_maintenance_date, next_due_date, custom_data, equipment_type_id")
      .eq("station_id", station.id)
      .order("name");

    if (!instances || instances.length === 0) { setLoading(false); return; }

    const etIds = [...new Set(instances.map((i) => i.equipment_type_id))];
    const { data: etData } = await supabase
      .from("equipment_types")
      .select("id, name, image_url, custom_field_definitions")
      .in("id", etIds)
      .order("name");

    const etMap = new Map<string, any>();
    for (const et of etData ?? []) etMap.set(et.id, et);

    const groupMap = new Map<string, EquipmentGroup>();
    for (const inst of instances) {
      const et = etMap.get(inst.equipment_type_id);
      if (!et) continue;
      if (!groupMap.has(et.id)) {
        groupMap.set(et.id, {
          id: et.id, name: et.name, image_url: et.image_url,
          custom_field_definitions: et.custom_field_definitions ?? [],
          instances: [],
        });
      }
      groupMap.get(et.id)!.instances.push(inst);
    }

    setGroups([...groupMap.values()]);
    setLoading(false);
  }

  // Summary counts across all groups
  const totalInstances = groups.reduce((s, g) => s + g.instances.length, 0);
  const overdueCount = groups.reduce((s, g) =>
    s + g.instances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d < 0; }).length, 0);
  const dueSoonCount = groups.reduce((s, g) =>
    s + g.instances.filter((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d >= 0 && d <= 7; }).length, 0);
  const underMaintCount = groups.reduce((s, g) =>
    s + g.instances.filter((i) => i.status === "under_maintenance").length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Equipment Register</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Station-wise asset list with maintenance schedule. Select a station to view and export.
          </p>
        </div>
        {selectedStation && groups.length > 0 && (
          <Button onClick={() => exportCsv(selectedStation, groups)} className="gap-2 shrink-0">
            <Download className="h-4 w-4" /> Download CSV Report
          </Button>
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
              onChange={(e) => {
                const s = stations.find((s) => s.id === e.target.value);
                if (s) loadEquipment(s);
              }}
              disabled={loadingStations}
            >
              <option value="">— choose a substation —</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
              ))}
            </select>
            {loadingStations && <span className="text-xs text-foreground-secondary">Loading stations…</span>}
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI strip */}
      {selectedStation && !loading && totalInstances > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-white px-4 py-3 flex items-center gap-3">
            <Wrench className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-foreground-secondary">Total Assets</p>
              <p className="text-xl font-bold text-foreground">{totalInstances}</p>
            </div>
          </div>
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${overdueCount > 0 ? "border-red-200 bg-red-50" : "border-border bg-white"}`}>
            <AlertTriangle className={`h-5 w-5 shrink-0 ${overdueCount > 0 ? "text-red-500" : "text-slate-300"}`} />
            <div>
              <p className="text-xs text-foreground-secondary">Overdue</p>
              <p className={`text-xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-foreground"}`}>{overdueCount}</p>
            </div>
          </div>
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${dueSoonCount > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-white"}`}>
            <Clock className={`h-5 w-5 shrink-0 ${dueSoonCount > 0 ? "text-amber-500" : "text-slate-300"}`} />
            <div>
              <p className="text-xs text-foreground-secondary">Due in 7 days</p>
              <p className={`text-xl font-bold ${dueSoonCount > 0 ? "text-amber-600" : "text-foreground"}`}>{dueSoonCount}</p>
            </div>
          </div>
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${underMaintCount > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-white"}`}>
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${underMaintCount > 0 ? "text-amber-500" : "text-slate-300"}`} />
            <div>
              <p className="text-xs text-foreground-secondary">Under Maintenance</p>
              <p className={`text-xl font-bold ${underMaintCount > 0 ? "text-amber-600" : "text-foreground"}`}>{underMaintCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-foreground-secondary animate-pulse">Loading equipment register…</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state after selection */}
      {!loading && selectedStation && groups.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-foreground-secondary">No equipment instances recorded for <strong>{selectedStation.name}</strong>.</p>
            <p className="text-xs text-foreground-secondary mt-1">Add instances from the Hierarchy page → select station → click the list icon on an equipment type.</p>
          </CardContent>
        </Card>
      )}

      {/* Equipment groups */}
      {!loading && groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-base">
              {group.image_url
                ? <img src={group.image_url} alt={group.name} className="h-8 w-8 rounded object-cover border border-border shrink-0" />
                : <Wrench className="h-4 w-4 text-blue-500 shrink-0" />}
              {group.name}
              <span className="text-xs font-normal text-foreground-secondary ml-1">{group.instances.length} asset{group.instances.length !== 1 ? "s" : ""}</span>
              {group.instances.some((i) => { const d = daysFromNow(i.next_due_date); return d !== null && d < 0; }) && (
                <Badge variant="danger" className="text-[10px] ml-auto">Has Overdue</Badge>
              )}
            </CardTitle>
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
                      <Badge variant={STATUS_VARIANT[inst.status]} className="text-[10px] px-1.5 py-0">
                        {STATUS_LABEL[inst.status]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground-secondary">{fmtDate(inst.last_maintenance_date)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-foreground-secondary">{fmtDate(inst.next_due_date)}</span>
                      {dueBadge(inst.next_due_date)}
                    </td>
                    {group.custom_field_definitions.map((fd) => (
                      <td key={fd.key} className="py-2.5 pr-4 text-foreground-secondary">
                        {inst.custom_data?.[fd.key] ?? "—"}
                      </td>
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
