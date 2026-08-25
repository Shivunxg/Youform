// @ts-nocheck
"use client";

import * as React from "react";
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { fmtDateIST, ageingDays } from "@/lib/ist";

// ── helpers ──────────────────────────────────────────────────────────────────

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

const OPEN_STATUSES = ["quotation_shared", "order_received", "supply_service_given"];
const WON_STATUSES = ["order_received", "supply_service_given", "bills_submitted", "payment_received"];
const LOST_STATUSES = ["offer_dropped", "order_lost"];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function fmtRupee(n: number) {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// ── types ────────────────────────────────────────────────────────────────────

interface JobCard {
  id: string;
  job_card_number: string;
  station_id: string;
  current_status: string;
  created_at: string;
  order_amount: number | null;
  quotation_amount: number | null;
  stationName: string;
  voltageClass: string | null;
  equipmentType: string | null;
  hasEngineers: boolean;
  hasMom: boolean;
}

interface HNode { id: string; name: string; level: number; parent_id: string | null }
type TileKey = "open" | "completed" | "mom" | "assigned" | "not_assigned";

// ── component ────────────────────────────────────────────────────────────────

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
        .select("id, job_card_number, station_id, current_status, created_at, order_amount, quotation_amount, hierarchy_nodes!station_id(name), voltage_classes(name), equipment_types(name)")
        .order("created_at", { ascending: true }),
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
        order_amount: jc.order_amount,
        quotation_amount: jc.quotation_amount,
        stationName: (jc.hierarchy_nodes as { name: string } | null)?.name ?? "—",
        voltageClass: (jc.voltage_classes as { name: string } | null)?.name ?? null,
        equipmentType: (jc.equipment_types as { name: string } | null)?.name ?? null,
        hasEngineers: engineeredSet.has(jc.id),
        hasMom: momSet.has(jc.id),
      }))
    );
    setLoading(false);
  }

  // Cascade filter helpers
  const zones = nodes.filter((n) => n.level === 1);
  const circles = nodes.filter((n) => n.level === 2 && (!zone || n.parent_id === zone));
  const divisions = nodes.filter((n) => {
    if (n.level !== 3) return false;
    if (circle) return n.parent_id === circle;
    if (zone) {
      const cIds = new Set(nodes.filter((c) => c.level === 2 && c.parent_id === zone).map((c) => c.id));
      return cIds.has(n.parent_id!);
    }
    return true;
  });
  const stations = nodes.filter((n) => {
    if (n.level !== 4) return false;
    if (division) return n.parent_id === division;
    return true;
  });

  const validStationIds = React.useMemo<Set<string> | null>(() => {
    if (station) return new Set([station]);
    if (division) return new Set(nodes.filter((n) => n.level === 4 && n.parent_id === division).map((n) => n.id));
    if (circle) {
      const divIds = new Set(nodes.filter((n) => n.level === 3 && n.parent_id === circle).map((n) => n.id));
      return new Set(nodes.filter((n) => n.level === 4 && divIds.has(n.parent_id!)).map((n) => n.id));
    }
    if (zone) {
      const cIds = new Set(nodes.filter((n) => n.level === 2 && n.parent_id === zone).map((n) => n.id));
      const dIds = new Set(nodes.filter((n) => n.level === 3 && cIds.has(n.parent_id!)).map((n) => n.id));
      return new Set(nodes.filter((n) => n.level === 4 && dIds.has(n.parent_id!)).map((n) => n.id));
    }
    return null;
  }, [zone, circle, division, station, nodes]);

  const filtered = React.useMemo(() => allCards.filter((jc) => {
    if (validStationIds && !validStationIds.has(jc.station_id)) return false;
    if (dateFrom && jc.created_at < dateFrom) return false;
    if (dateTo && jc.created_at > dateTo + "T23:59:59") return false;
    return true;
  }), [allCards, validStationIds, dateFrom, dateTo]);

  // ── KPI tiles ──────────────────────────────────────────────────────────────
  const kpiLists = React.useMemo<Record<TileKey, JobCard[]>>(() => ({
    open: filtered.filter((jc) => OPEN_STATUSES.includes(jc.current_status)),
    completed: filtered.filter((jc) => jc.current_status === "payment_received"),
    mom: filtered.filter((jc) => jc.hasMom),
    assigned: filtered.filter((jc) => jc.hasEngineers),
    not_assigned: filtered.filter((jc) => !jc.hasEngineers),
  }), [filtered]);

  const decided = filtered.filter((jc) => WON_STATUSES.includes(jc.current_status) || LOST_STATUSES.includes(jc.current_status));
  const won = filtered.filter((jc) => WON_STATUSES.includes(jc.current_status));
  const winRate = decided.length === 0 ? 0 : Math.round((won.length / decided.length) * 100);
  const revenueBilled = filtered.filter((jc) => ["bills_submitted", "payment_received"].includes(jc.current_status)).reduce((s, jc) => s + (jc.order_amount ?? 0), 0);
  const revenueCollected = filtered.filter((jc) => jc.current_status === "payment_received").reduce((s, jc) => s + (jc.order_amount ?? 0), 0);
  const ageingCount = filtered.filter((jc) => OPEN_STATUSES.includes(jc.current_status) && ageingDays(jc.created_at) > threshold).length;

  // ── Monthly trend chart data ───────────────────────────────────────────────
  const monthlyData = React.useMemo(() => {
    const map = new Map<string, { month: string; raised: number; won: number; lost: number; billed: number; collected: number }>();
    for (const jc of filtered) {
      const key = monthKey(jc.created_at);
      if (!map.has(key)) map.set(key, { month: monthLabel(key), raised: 0, won: 0, lost: 0, billed: 0, collected: 0 });
      const r = map.get(key)!;
      r.raised++;
      if (WON_STATUSES.includes(jc.current_status)) r.won++;
      if (LOST_STATUSES.includes(jc.current_status)) r.lost++;
      if (["bills_submitted", "payment_received"].includes(jc.current_status)) r.billed += jc.order_amount ?? 0;
      if (jc.current_status === "payment_received") r.collected += jc.order_amount ?? 0;
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [filtered]);

  // ── Status funnel ─────────────────────────────────────────────────────────
  const funnelData = [
    { name: "Quotation Shared", value: filtered.length, fill: "#3b82f6" },
    { name: "Order Received", value: filtered.filter((jc) => WON_STATUSES.includes(jc.current_status)).length, fill: "#f59e0b" },
    { name: "Supply / Service Given", value: filtered.filter((jc) => ["supply_service_given", "bills_submitted", "payment_received"].includes(jc.current_status)).length, fill: "#8b5cf6" },
    { name: "Bills Submitted", value: filtered.filter((jc) => ["bills_submitted", "payment_received"].includes(jc.current_status)).length, fill: "#06b6d4" },
    { name: "Payment Received", value: filtered.filter((jc) => jc.current_status === "payment_received").length, fill: "#10b981" },
  ];

  // ── Station-wise bar chart ────────────────────────────────────────────────
  const stationData = React.useMemo(() => {
    const map = new Map<string, { station: string; open: number; completed: number; revenue: number }>();
    for (const jc of filtered) {
      if (!map.has(jc.stationName)) map.set(jc.stationName, { station: jc.stationName, open: 0, completed: 0, revenue: 0 });
      const r = map.get(jc.stationName)!;
      if (OPEN_STATUSES.includes(jc.current_status)) r.open++;
      if (jc.current_status === "payment_received") r.completed++;
      if (["bills_submitted", "payment_received"].includes(jc.current_status)) r.revenue += jc.order_amount ?? 0;
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  // ── Status distribution pie ───────────────────────────────────────────────
  const pieData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const jc of filtered) map.set(jc.current_status, (map.get(jc.current_status) ?? 0) + 1);
    return [...map.entries()].map(([status, value]) => ({ name: STATUS_LABEL[status] ?? status, value, status }));
  }, [filtered]);

  const TILES: { key: TileKey; label: string; value: string | number; color: string; sub: string }[] = [
    { key: "open", label: "Open Jobs", value: kpiLists.open.length, color: "text-amber-600", sub: `${ageingCount} ageing` },
    { key: "completed", label: "Orders Completed", value: kpiLists.completed.length, color: "text-green-600", sub: `${winRate}% win rate` },
    { key: "mom", label: "MOM Logged", value: kpiLists.mom.length, color: "text-blue-600", sub: "with MOM entries" },
    { key: "assigned", label: "Engineer Assigned", value: kpiLists.assigned.length, color: "text-indigo-600", sub: `${kpiLists.not_assigned.length} not assigned` },
    { key: "not_assigned", label: "Not Assigned", value: kpiLists.not_assigned.length, color: "text-rose-600", sub: "need engineer" },
  ];

  const REVENUE_TILES = [
    { label: "Revenue Billed", value: fmtRupee(revenueBilled), color: "text-foreground" },
    { label: "Revenue Collected", value: fmtRupee(revenueCollected), color: "text-green-600" },
    { label: "Outstanding", value: fmtRupee(revenueBilled - revenueCollected), color: "text-amber-600" },
    { label: "Win Rate", value: `${winRate}%`, color: "text-blue-600" },
  ];

  function ageColor(days: number) {
    if (days <= threshold) return "text-green-600";
    if (days <= threshold * 2) return "text-amber-600";
    return "text-red-600";
  }

  const drillList = activeTile ? kpiLists[activeTile] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Service management metrics across the network
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Zone", value: zone, onChange: (v: string) => { setZone(v); setCircle(""); setDivision(""); setStation(""); }, options: zones },
              { label: "Circle", value: circle, onChange: (v: string) => { setCircle(v); setDivision(""); setStation(""); }, options: circles },
              { label: "Division", value: division, onChange: (v: string) => { setDivision(v); setStation(""); }, options: divisions },
              { label: "Station", value: station, onChange: setStation, options: stations },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">{f.label}</p>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                >
                  <option value="">All</option>
                  {f.options.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
            ))}
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">From</p>
              <input type="date" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-secondary uppercase mb-1">To</p>
              <input type="date" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-foreground-secondary text-center py-12">Loading analytics…</p>
      ) : (
        <>
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {REVENUE_TILES.map((t) => (
              <div key={t.label} className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-foreground-secondary">{t.label}</p>
                <p className={`text-xl font-bold mt-1 ${t.color}`}>{t.value}</p>
              </div>
            ))}
          </div>

          {/* Volume KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {TILES.map((t) => {
              const isActive = activeTile === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTile(isActive ? null : t.key)}
                  className={`rounded-xl border bg-background p-4 text-left transition-all hover:shadow-sm ${isActive ? "border-accent ring-2 ring-accent/20 shadow-sm" : "border-border"}`}
                >
                  <p className="text-xs text-foreground-secondary">{t.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${t.color}`}>{t.value}</p>
                  <p className="text-[11px] text-foreground-secondary mt-1">{t.sub}</p>
                </button>
              );
            })}
          </div>

          {/* Drill-down list */}
          {activeTile && drillList && (
            <Card>
              <CardHeader>
                <CardTitle>{TILES.find((t) => t.key === activeTile)?.label} — {drillList.length} records</CardTitle>
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
                              <td className={`py-2 font-semibold ${isOpen ? ageColor(days) : "text-foreground-secondary"}`}>{days}d</td>
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

          {/* Charts row 1 — Monthly trend */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Job Card Trend</CardTitle>
                <CardDescription>Raised vs Won vs Lost per month</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {monthlyData.length === 0 ? (
                  <p className="text-sm text-foreground-secondary text-center py-8">No data for selected filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="raised" name="Raised" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="won" name="Won" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status distribution pie */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>All {filtered.length} job cards by current status</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {pieData.length === 0 ? (
                  <p className="text-sm text-foreground-secondary text-center py-8">No data.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.status} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-foreground-secondary truncate max-w-[140px]">{d.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 — Revenue trend + Funnel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly billed vs collected (₹)</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {monthlyData.length === 0 ? (
                  <p className="text-sm text-foreground-secondary text-center py-8">No data for selected filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtRupee(v)} width={60} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v: number) => fmtRupee(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="billed" name="Billed" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Conversion funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Quotation → Payment pipeline</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 pt-2">
                {funnelData.map((step, i) => {
                  const pct = funnelData[0].value === 0 ? 0 : Math.round((step.value / funnelData[0].value) * 100);
                  return (
                    <div key={step.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground-secondary truncate">{step.name}</span>
                        <span className="font-semibold text-foreground ml-2">{step.value} <span className="text-foreground-secondary font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-5 rounded bg-slate-100 overflow-hidden">
                        <div
                          className="h-5 rounded transition-all"
                          style={{ width: `${pct}%`, background: step.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Station-wise bar chart */}
          {stationData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Station-wise Performance</CardTitle>
                <CardDescription>Open jobs, completed jobs, and revenue billed per station (top 10)</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stationData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                    <XAxis dataKey="station" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis yAxisId="count" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtRupee(v)} width={60} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: number, name: string) => name === "Revenue Billed" ? fmtRupee(v) : v}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="count" dataKey="open" name="Open Jobs" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="count" dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="revenue" dataKey="revenue" name="Revenue Billed" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
