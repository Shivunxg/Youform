"use client";

import * as React from "react";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  requestNumber: string;
  substationName: string;
  equipmentName: string;
  type: string;
  status: string;
  requestedBy: string;
  createdAt: string;
}

const typeVariant = { preventive: "accent", corrective: "warning", replacement: "danger" } as const;

export default function AdminServiceRequestsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select("id, request_number, type, status, created_at, substations(name), equipment(name), profiles(name)")
      .order("created_at", { ascending: false });

    setRows(
      (data ?? []).map((sr) => ({
        id: sr.id,
        requestNumber: sr.request_number,
        substationName: (sr.substations as unknown as { name: string } | null)?.name ?? "—",
        equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
        type: sr.type,
        status: sr.status,
        requestedBy: (sr.profiles as unknown as { name: string } | null)?.name ?? "—",
        createdAt: sr.created_at,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateStatus(id: string, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("service_requests").update({ status }).eq("id", id);
  }

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Service Requests</h1>
        <p className="text-sm text-foreground-secondary mt-1">Preventive, corrective &amp; replacement requests across all substations</p>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search requests…"
        right={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading service requests…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No service requests found" description="They'll appear here as soon as one is submitted." />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((sr) => (
              <div key={sr.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                  <Wrench className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{sr.requestNumber}</p>
                    <Badge variant={typeVariant[sr.type as keyof typeof typeVariant]} className="capitalize">
                      {sr.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {sr.substationName} · {sr.equipmentName} · Requested by {sr.requestedBy} · {new Date(sr.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Select value={sr.status} onValueChange={(v) => updateStatus(sr.id, v)}>
                  <SelectTrigger className="w-[150px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
