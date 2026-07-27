"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
};

export function InventoryDistributionChart({ data }: { data: { region: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="region" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F8FAFC" }} />
        <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MaintenanceTrendChart({
  data,
}: {
  data: { month: string; preventive: number; corrective: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="preventive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="corrective" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="preventive" stroke="#2563EB" strokeWidth={2} fill="url(#preventive)" name="Preventive" />
        <Area type="monotone" dataKey="corrective" stroke="#F59E0B" strokeWidth={2} fill="url(#corrective)" name="Corrective" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EquipmentHealthChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-foreground-secondary">
        No equipment recorded yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} strokeWidth={0}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-foreground-secondary">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
