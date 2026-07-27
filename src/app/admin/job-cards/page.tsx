"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  jobCardNumber: string;
  substationName: string;
  equipmentName: string;
  component: string | null;
  issueDescription: string;
  priority: string;
  status: string;
  raisedBy: string;
  createdAt: string;
}

const priorityVariant = { low: "default", medium: "accent", high: "warning", critical: "danger" } as const;
const statusVariant = { open: "danger", in_progress: "warning", resolved: "success", closed: "default" } as const;

export default function AdminJobCardsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("job_cards")
      .select(
        "id, job_card_number, component, issue_description, priority, status, created_at, substations(name), equipment(name), profiles(name)"
      )
      .order("created_at", { ascending: false });

    setRows(
      (data ?? []).map((jc) => ({
        id: jc.id,
        jobCardNumber: jc.job_card_number,
        substationName: (jc.substations as unknown as { name: string } | null)?.name ?? "—",
        equipmentName: (jc.equipment as unknown as { name: string } | null)?.name ?? "—",
        component: jc.component,
        issueDescription: jc.issue_description,
        priority: jc.priority,
        status: jc.status,
        raisedBy: (jc.profiles as unknown as { name: string } | null)?.name ?? "—",
        createdAt: jc.created_at,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateStatus(id: string, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("job_cards").update({ status }).eq("id", id);
  }

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription.toLowerCase().includes(search.toLowerCase()) ||
      r.substationName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Job Cards</h1>
        <p className="text-sm text-foreground-secondary mt-1">Issues raised by Assistant Engineers across all substations</p>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search job cards…"
        right={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading job cards…" description="Fetching data from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No job cards found" description="They'll appear here as soon as an Assistant Engineer raises one." />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((jc) => (
              <div key={jc.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                    <Badge variant={priorityVariant[jc.priority as keyof typeof priorityVariant]} className="capitalize">
                      {jc.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-secondary mt-1">{jc.issueDescription}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {jc.substationName} · {jc.equipmentName}
                    {jc.component ? ` · ${jc.component}` : ""} · Raised by {jc.raisedBy} ·{" "}
                    {new Date(jc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Select value={jc.status} onValueChange={(v) => updateStatus(jc.id, v)}>
                  <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
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
