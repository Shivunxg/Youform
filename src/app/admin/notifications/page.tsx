// @ts-nocheck
"use client";

import * as React from "react";
import { ClipboardList, Wrench, Boxes, Bell as BellIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string;
  title: string;
  description: string | null;
  type: "job_card" | "service_request" | "inventory" | "system";
  read: boolean;
  createdAt: string;
}

const iconMap = { job_card: ClipboardList, service_request: Wrench, inventory: Boxes, system: BellIcon };
const colorMap = {
  job_card: "bg-blue-50 text-accent",
  service_request: "bg-amber-50 text-warning",
  inventory: "bg-red-50 text-danger",
  system: "bg-slate-100 text-foreground-secondary",
};

export default function AdminNotificationsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, description, type, read, created_at")
      .eq("target_role", "spectrum_admin")
      .order("created_at", { ascending: false });

    setRows(
      (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        type: n.type,
        read: n.read,
        createdAt: n.created_at,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function markAllRead() {
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("target_role", "spectrum_admin").eq("read", false);
  }

  const unreadCount = rows.filter((r) => !r.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Notifications</h1>
          <p className="text-sm text-foreground-secondary mt-1">{unreadCount} unread of {rows.length} total</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading notifications…" description="Fetching from your database." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Job cards, service requests, and inventory alerts raised by Assistant Engineers will show up here."
          />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((n) => {
              const Icon = iconMap[n.type];
              return (
                <div key={n.id} className={cn("flex gap-3 px-5 py-4", !n.read && "bg-blue-50/30")}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", colorMap[n.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.description && <p className="text-xs text-foreground-secondary mt-0.5">{n.description}</p>}
                    <p className="text-[11px] text-slate-400 mt-1.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
