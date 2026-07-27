"use client";

import * as React from "react";
import { UserCircle, MoreHorizontal, Ban, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";
import type { DbSubstation } from "@/lib/supabase/types";

interface Row {
  id: string;
  name: string;
  email: string | null;
  role: string;
  substationId: string | null;
  substationName: string | null;
  status: string;
}

export default function AdminUsersPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [substations, setSubstations] = React.useState<DbSubstation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [assignSubstation, setAssignSubstation] = React.useState<string>("none");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: profileRows }, { data: substationRows }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, role, substation_id, status, substations(name)").order("name"),
      supabase.from("substations").select("*").order("name"),
    ]);

    setSubstations(substationRows ?? []);
    setRows(
      (profileRows ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        substationId: p.substation_id,
        substationName: (p.substations as unknown as { name: string } | null)?.name ?? null,
        status: p.status,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || (r.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || r.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function openAssign(r: Row) {
    setEditing(r);
    setAssignSubstation(r.substationId ?? "none");
    setDialogOpen(true);
  }

  async function handleSaveAssignment() {
    if (!editing) return;
    await supabase
      .from("profiles")
      .update({ substation_id: assignSubstation === "none" ? null : assignSubstation })
      .eq("id", editing.id);
    setDialogOpen(false);
    loadData();
  }

  async function toggleStatus(r: Row) {
    const newStatus = r.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", r.id);
    loadData();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Users</h1>
          <p className="text-sm text-foreground-secondary mt-1">{rows.length} accounts across Spectrum Admin &amp; Assistant Engineers</p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-accent">
        To create a new login, add the user in your Supabase project (Authentication → Users), setting their role in User Metadata.
        Once created, they&apos;ll appear here for substation assignment.
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by name or email…"
        right={
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="spectrum_admin">Spectrum Admin</SelectItem>
              <SelectItem value="assistant_engineer">Assistant Engineer</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading users…" description="Fetching accounts from your database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No users found" description="Create accounts in Supabase Authentication to see them here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Name</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Email</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Role</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Substation</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
                          <UserCircle className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-foreground">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{u.email ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.role === "spectrum_admin" ? "accent" : "default"}>
                        {u.role === "spectrum_admin" ? "Spectrum Admin" : "Assistant Engineer"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">
                      {u.role === "assistant_engineer" ? u.substationName ?? <span className="text-slate-400">Unassigned</span> : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.status === "active" ? "success" : "default"} dot className="capitalize">
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-hover hover:text-foreground transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.role === "assistant_engineer" && (
                            <DropdownMenuItem onClick={() => openAssign(u)}>
                              <Pencil /> Assign substation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleStatus(u)}>
                            {u.status === "active" ? (
                              <>
                                <Ban /> Disable account
                              </>
                            ) : (
                              <>
                                <CheckCircle2 /> Enable account
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Substation</DialogTitle>
            <DialogDescription>Choose which substation {editing?.name} manages.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-1.5">
            <Label>Substation</Label>
            <Select value={assignSubstation} onValueChange={setAssignSubstation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {substations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment}>Save assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
