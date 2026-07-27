"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  requestNumber: string;
  substationName: string;
  equipmentName: string;
  status: string;
  createdAt: string;
}

export default function AdminMaintenancePage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("service_requests")
        .select("id, request_number, status, created_at, substations(name), equipment(name)")
        .eq("type", "preventive")
        .order("created_at", { ascending: false });

      setRows(
        (data ?? []).map((sr) => ({
          id: sr.id,
          requestNumber: sr.request_number,
          substationName: (sr.substations as unknown as { name: string } | null)?.name ?? "—",
          equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
          status: sr.status,
          createdAt: sr.created_at,
        }))
      );
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = rows.filter(
    (r) => r.requestNumber.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Preventive Maintenance</h1>
        <p className="text-sm text-foreground-secondary mt-1">Scheduled preventive maintenance requests across all substations</p>
      </div>

      <PageToolbar search={search} onSearchChange={setSearch} placeholder="Search maintenance requests…" />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading…" description="Fetching preventive maintenance requests." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No preventive maintenance scheduled"
            description="Preventive-type service requests raised by Assistant Engineers will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.requestNumber}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {r.substationName} · {r.equipmentName} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={r.status === "completed" ? "success" : r.status === "pending" ? "warning" : "accent"}
                  className="capitalize shrink-0"
                >
                  {r.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
