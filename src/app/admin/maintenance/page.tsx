"use client";

import * as React from "react";
import { CalendarClock, List, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { MonthCalendar, type CalendarEvent } from "@/components/calendar/month-calendar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  requestNumber: string;
  substationName: string;
  equipmentName: string;
  status: string;
  scheduledDate: string | null;
  assignedEngineer: string | null;
  createdAt: string;
}

export default function AdminMaintenancePage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"list" | "calendar">("calendar");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("service_requests")
        .select("id, request_number, status, scheduled_date, assigned_engineer, created_at, substations(name), equipment(name)")
        .eq("type", "preventive")
        .order("created_at", { ascending: false });

      setRows(
        (data ?? []).map((sr) => ({
          id: sr.id,
          requestNumber: sr.request_number,
          substationName: (sr.substations as unknown as { name: string } | null)?.name ?? "—",
          equipmentName: (sr.equipment as unknown as { name: string } | null)?.name ?? "—",
          status: sr.status,
          scheduledDate: sr.scheduled_date,
          assignedEngineer: sr.assigned_engineer,
          createdAt: sr.created_at,
        }))
      );
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = rows.filter(
    (r) => r.requestNumber.toLowerCase().includes(search.toLowerCase()) || r.substationName.toLowerCase().includes(search.toLowerCase())
  );

  const calendarEvents: CalendarEvent[] = rows
    .filter((r) => r.scheduledDate)
    .map((r) => ({
      id: r.id,
      date: r.scheduledDate!,
      label: `${r.substationName}${r.assignedEngineer ? ` · ${r.assignedEngineer}` : ""}`,
      variant: r.status === "completed" ? "success" : "accent",
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Preventive Maintenance</h1>
        <p className="text-sm text-foreground-secondary mt-1">Scheduled preventive maintenance across all substations</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-border bg-background-secondary p-1">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-white shadow-sm text-foreground" : "text-foreground-secondary"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list" ? "bg-white shadow-sm text-foreground" : "text-foreground-secondary"
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <Card className="p-5">
          {loading ? (
            <p className="text-sm text-foreground-secondary py-10 text-center">Loading…</p>
          ) : (
            <MonthCalendar events={calendarEvents} />
          )}
        </Card>
      ) : (
        <>
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
                        {r.substationName} · {r.equipmentName}
                        {r.scheduledDate ? ` · Visit ${new Date(r.scheduledDate).toLocaleDateString()}` : ""}
                        {r.assignedEngineer ? ` · ${r.assignedEngineer}` : ""}
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
        </>
      )}
    </div>
  );
}
