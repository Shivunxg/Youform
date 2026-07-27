"use client";

import * as React from "react";
import { Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

interface Row {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
}

const statusVariant = { healthy: "success", service_required: "warning", replacement_required: "danger" } as const;
const statusLabel: Record<string, string> = {
  healthy: "Healthy",
  service_required: "Service Required",
  replacement_required: "Replacement Required",
};

export default function AEEquipmentPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("substation_id").eq("id", user.id).single();
      if (!profile?.substation_id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("equipment")
        .select("id, name, category, manufacturer, model, serial_number, status")
        .eq("substation_id", profile.substation_id)
        .order("name");

      setRows(
        (data ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          manufacturer: e.manufacturer,
          model: e.model,
          serialNumber: e.serial_number,
          status: e.status,
        }))
      );
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Equipment</h1>
        <p className="text-sm text-foreground-secondary mt-1">Equipment registered at your substation</p>
      </div>

      <PageToolbar search={search} onSearchChange={setSearch} placeholder="Search equipment…" />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading equipment…" description="Fetching data for your substation." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No equipment recorded yet"
            description="Equipment is created automatically the first time you add stock or raise a job card, or your Admin can add it directly."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Equipment</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Category</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Manufacturer</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Model</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Health Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-foreground">{e.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.category}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.manufacturer ?? "—"}</td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{e.model ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant[e.status as keyof typeof statusVariant]} dot>
                        {statusLabel[e.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
