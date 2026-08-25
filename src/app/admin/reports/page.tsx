// @ts-nocheck
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { fmtDateIST, ageingDays } from "@/lib/ist";

const STATUS_LABEL: Record<string, string> = {
  quotation_shared: "Quotation Shared",
  order_received: "Order Received",
  offer_dropped: "Offer Dropped",
  order_lost: "Order Lost",
  supply_service_given: "Supply / Service Given",
  bills_submitted: "Bills Submitted & Work Completed",
  payment_received: "Payment Received",
};

const STATUS_VARIANT: Record<string, "default" | "accent" | "warning" | "danger" | "success"> = {
  quotation_shared: "accent",
  order_received: "warning",
  offer_dropped: "danger",
  order_lost: "danger",
  supply_service_given: "warning",
  bills_submitted: "warning",
  payment_received: "success",
};

interface JobCard {
  id: string;
  job_card_number: string;
  station_id: string;
  current_status: string;
  created_at: string;
  stationName: string;
  voltageClass: string | null;
  equipmentType: string | null;
  hasEngineers: boolean;
  hasMom: boolean;
}

interface HNode { id: string; name: string; level: number; parent_id: string | null }

type TileKey = "open" | "completed" | "mom" | "assigned" | "not_assigned";

const TILES: { key: TileKey; label: string; color: string; desc: string }[] = [
  { key: "open", label: "Open Jobs", color: "text-amber-600", desc: "Quotation Shared + Order Received + Supply/Service Given" },
  { key: "completed", label: "Orders Completed", color: "text-green-600", desc: "Payment Received" },
  { key: "mom", label: "MOM Logged", color: "text-blue-600", desc: "Job cards with at least one MOM entry" },
  { key: "assigned", label: "Engineer Assigned", color: "text-indigo-600", desc: "Job cards with at least one assigned engineer" },
  { key: "not_assigned", label: "Not Assigned", color: "text-rose-600", desc: "Job cards with no engineer assigned" },
];

export default function AdminReportsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [allCards, setAllCards] = React.useState<JobCard[]>([]);
  const [nodes, setNodes] = React.useState<HNode[]>([]);
  const [threshold, setThreshold] = React.useState(30);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [zone, setZone] = React.useState("");
  const [circle, setCircle] = React.useState("");
  const [division, setDivision] = React.useState("");
  const [station, setStation] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Drill-down
  const [activeTile, setActiveTile] = React.useState<TileKey | null>(null);

  React.useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [jcRes, jceRes, momRes, nodeRes, settingsRes] = await Promise.all([
      supabase
        .from("job_cards")
        .select("id, job_card_number, station_id, current_status, created_at, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)")
        .order("created_at", { ascending: false }),
      supabase.from("job_card_engineers").select("job_card_id"),
      supabase.from("mom_logs").select("job_card_id"),
      supabase.from("hierarchy_nodes").select("id, name, level, parent_id").order("level").order("name"),
      supabase.from("app_settings").select("key, value"),
    ]);

    const engineeredSet = new Set((jceRes.data ?? []).map((r) => r.job_card_id));
    const momSet = new Set((momRes.data ?? []).map((r) => r.job_card_id));
    const settings: Record<string, string> = {};
    for (const s of settingsRes.data ?? []) settings[s.key] = s.value;
    if (settings["ageing_threshold_days"]) setThreshold(parseInt(settings["ageing_threshold_days"], 10));

    setNodes(nodeRes.data ?? []);
    setAllCards(
      (jcRes.data ?? []).map((jc) => ({
        id: jc.id,
        job_card_number: jc.job_card_number,
        station_id: jc.station_id,
        current_status: jc.current_status,
        created_at: jc.created_at,
        stationName: (jc.hierarchy_nodes as { name: string } | null)?.name ?? "—",
        voltageClass: (jc.voltage_classes as { name: string } | null)?.name ?? null,
        equipmentType: (jc.equipment_types as { name: string } | null)?.name ?? null,
        hasEngineers: engineeredSet.has(jc.id),
        hasMom: momSet.has(jc.id),
      }))
    );
    setLoading(false);
  }

  // Cascade helpers
  const zones = nodes.filter((n) => n.level === 1);
  const circles = nodes.filter((n) => n.level === 2 && (!zone || n.parent_id === zone));
  const divisions = nodes.filter((n) => n.level === 3 && (!circle ? (!zone || nodes.find((z) => z.id === zone) ? true : false) : n.parent_id === circle));
  const stations = nodes.filter((n) => n.level === 4 && (!division ? true : n.parent_id === division));

  // Determine which station_ids pass the hierarchy filter
  const validStationIds = React.useMemo(() => {
    if (station) return new Set([station]);
    if (division) {
      return new Set(nodes.filter((n) => n.level === 4 && n.parent_id === division).map((n) => n.id));
    }
    if (circle) {
      const divIds = new Set(nodes.filter((n) => n.level === 3 && n.parent_id === circle).map((n) => n.id));
      return new Set(nodes.filter((n) => n.level === 4 && divIds.has(n.parent_id!)).map((n) => n.id));
    }
    if (zone) {
      const circleIds = new Set(nodes.filter((n) => n.level === 2 && n.parent_id === zone).map((n) => n.id));
      const divIds = new Set(nodes.filter((n) => n.level === 3 && circleIds.has(n.parent_id!)).map((n) => n.id));
      return new Set(nodes.filter((n) => n.level === 4 && divIds.has(n.parent_id!)).map((n) => n.id));
    }
    return null; // no filter
  }, [zone, circle, division, station, nodes]);

  const filtered = React.useMemo(() => {
    return allCards.filter((jc) => {
      if (validStationIds && !validStationIds.has(jc.station_id)) return false;
      if (dateFrom && jc.created_at < dateFrom) return false;
      if (dateTo && jc.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [allCards, validStationIds, dateFrom, dateTo]);

  const OPEN_STATUSES = ["quotation_shared", "order_received", "supply_service_given"];

  const kpis: Record<TileKey, JobCard[]> = React.useMemo(() => ({
    open: filtered.filter((jc) => OPEN_STATUSES.includes(jc.current_status)),
    completed: filtered.filter((jc) => jc.current_status === "payment_received"),
    mom: filtered.filter((jc) => jc.hasMom),
    assigned: filtered.filter((jc) => jc.hasEngineers),
    not_assigned: filtered.filter((jc) => !jc.hasEngineers),
  }), [filtered]);

  function ageColor(days: number) {
    if (days <= threshold) return "text-green-600";
    if (days <= threshold * 2) return "text-amber-600";
    return "text-red-600";
  }

  const drillList = activeTile ? kpis[activeTile] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Reports</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Service management metrics · {filtered.length} job cards
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">Zone</p>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={zone}
                onChange={(e) => { setZone(e.target.value); setCircle(""); setDivision(""); setStation(""); }}
              >
                <option value="">All</option>
                {zones.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">Circle</p>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={circle}
                onChange={(e) => { setCircle(e.target.value); setDivision(""); setStation(""); }}
              >
                <option value="">All</option>
                {circles.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">Division</p>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={division}
                onChange={(e) => { setDivision(e.target.value); setStation(""); }}
              >
                <option value="">All</option>
                {divisions.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">Station</p>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={station}
                onChange={(e) => setStation(e.target.value)}
              >
                <option value="">All</option>
                {stations.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">From</p>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">To</p>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      {loading ? (
        <p className="text-sm text-foreground-secondary text-center py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {TILES.map((t) => {
              const count = kpis[t.key].length;
              const isActive = activeTile === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTile(isActive ? null : t.key)}
                  className={`rounded-xl border bg-background p-4 text-left transition-all hover:shadow-sm ${
                    isActive ? "border-accent ring-2 ring-accent/20 shadow-sm" : "border-border"
                  }`}
                >
                  <p className="text-xs text-foreground-secondary">{t.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${t.color}`}>{count}</p>
                  <p className="text-[11px] text-foreground-secondary mt-1 leading-tight">{t.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Drill-down list */}
          {activeTile && drillList && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {TILES.find((t) => t.key === activeTile)?.label} — {drillList.length} record{drillList.length !== 1 ? "s" : ""}
                </CardTitle>
                <CardDescription>
                  {TILES.find((t) => t.key === activeTile)?.desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {drillList.length === 0 ? (
                  <p className="text-sm text-foreground-secondary py-4 text-center">No records for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 pr-4 text-xs font-semibold text-foreground-secondary uppercase">Job Card</th>
                          <th className="pb-2 pr-4 text-xs font-semibold text-foreground-secondary uppercase">Station</th>
                          <th className="pb-2 pr-4 text-xs font-semibold text-foreground-secondary uppercase">Status</th>
                          <th className="pb-2 pr-4 text-xs font-semibold text-foreground-secondary uppercase">Raised</th>
                          <th className="pb-2 text-xs font-semibold text-foreground-secondary uppercase">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillList.map((jc) => {
                          const days = ageingDays(jc.created_at);
                          const isOpen = OPEN_STATUSES.includes(jc.current_status);
                          return (
                            <tr key={jc.id} className="border-b border-border last:border-0 hover:bg-hover/40">
                              <td className="py-2 pr-4 font-medium">{jc.job_card_number}</td>
                              <td className="py-2 pr-4 text-foreground-secondary">
                                {jc.stationName}
                                {jc.voltageClass ? <span className="ml-1 text-[11px]">· {jc.voltageClass}</span> : null}
                              </td>
                              <td className="py-2 pr-4">
                                <Badge variant={STATUS_VARIANT[jc.current_status] ?? "default"} dot>
                                  {STATUS_LABEL[jc.current_status] ?? jc.current_status}
                                </Badge>
                              </td>
                              <td className="py-2 pr-4 text-foreground-secondary">{fmtDateIST(jc.created_at)}</td>
                              <td className={`py-2 font-semibold ${isOpen ? ageColor(days) : "text-foreground-secondary"}`}>
                                {days}d
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
