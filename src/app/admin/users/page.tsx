// @ts-nocheck
"use client";

import * as React from "react";
import { UserCircle, MoreHorizontal, Ban, CheckCircle2, Pencil, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageToolbar, EmptyState } from "@/components/data-table/toolbar";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABEL: Record<string, string> = {
  spectrum_admin:    "Spectrum Admin",
  account_executive: "Account Executive",
  service_engineer:  "Service Engineer",
  kptcl_engineer:    "KPTCL Engineer",
};

const ROLE_VARIANT: Record<string, "accent" | "warning" | "default"> = {
  spectrum_admin:    "accent",
  account_executive: "warning",
  service_engineer:  "default",
  kptcl_engineer:    "default",
};

// Only KPTCL is station-specific; AE and SE are not
const STATION_ROLES = ["kptcl_engineer"];

interface Station { id: string; name: string; level: number }

interface Row {
  id: string;
  name: string;
  email: string | null;
  role: string;
  stationId: string | null;
  stationName: string | null;
  kptclStationNames: string[];
  employeeId: string | null;
  status: string;
}

export default function AdminUsersPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows]         = React.useState<Row[]>([]);
  const [stations, setStations] = React.useState<Station[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [search, setSearch]     = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Edit stations dialog (KPTCL multi-station)
  const [editDialog, setEditDialog]       = React.useState(false);
  const [editing, setEditing]             = React.useState<Row | null>(null);
  const [editKptclStations, setEditKptclStations] = React.useState<string[]>([]);
  const [savingEdit, setSavingEdit]       = React.useState(false);

  // Invite user dialog
  const [inviteDialog, setInviteDialog] = React.useState(false);
  const [inviteName, setInviteName]     = React.useState("");
  const [inviteEmail, setInviteEmail]   = React.useState("");
  const [inviteRole, setInviteRole]     = React.useState("account_executive");
  const [inviteStation, setInviteStation] = React.useState("none");
  const [inviteEmpId, setInviteEmpId]   = React.useState("");
  const [inviting, setInviting]         = React.useState(false);
  const [inviteError, setInviteError]   = React.useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [{ data: profileRows }, { data: stationRows }, { data: kptclAssignments }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, role, station_id, employee_id, status, hierarchy_nodes!station_id(name)")
        .order("name"),
      supabase
        .from("hierarchy_nodes")
        .select("id, name, level")
        .eq("level", 4)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("kptcl_station_assignments")
        .select("kptcl_user_id, station_id, hierarchy_nodes!station_id(name)"),
    ]);

    setStations((stationRows ?? []).map((s) => ({ id: s.id, name: s.name, level: s.level })));

    // Build map: user_id → station names[]
    const kptclMap = new Map<string, string[]>();
    for (const a of kptclAssignments ?? []) {
      const list = kptclMap.get(a.kptcl_user_id) ?? [];
      list.push((a.hierarchy_nodes as any)?.name ?? a.station_id);
      kptclMap.set(a.kptcl_user_id, list);
    }

    setRows(
      (profileRows ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? p.email ?? "—",
        email: p.email,
        role: p.role,
        stationId: p.station_id,
        stationName: (p.hierarchy_nodes as any)?.name ?? null,
        kptclStationNames: kptclMap.get(p.id) ?? [],
        employeeId: p.employee_id,
        status: p.status,
      }))
    );
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const filtered = rows.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || r.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function openEdit(r: Row) {
    setEditing(r);
    // Load current KPTCL station assignments
    const { data } = await supabase
      .from("kptcl_station_assignments")
      .select("station_id")
      .eq("kptcl_user_id", r.id);
    setEditKptclStations((data ?? []).map((a) => a.station_id));
    setEditDialog(true);
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    // Delete existing assignments then insert the new set
    await supabase.from("kptcl_station_assignments").delete().eq("kptcl_user_id", editing.id);
    if (editKptclStations.length > 0) {
      await supabase.from("kptcl_station_assignments").insert(
        editKptclStations.map((sid) => ({ kptcl_user_id: editing.id, station_id: sid }))
      );
    }
    setSavingEdit(false);
    setEditDialog(false);
    loadData();
  }

  async function toggleStatus(r: Row) {
    await supabase
      .from("profiles")
      .update({ status: r.status === "active" ? "inactive" : "active" })
      .eq("id", r.id);
    loadData();
  }

  function openInvite() {
    setInviteName(""); setInviteEmail(""); setInviteRole("account_executive");
    setInviteStation("none"); setInviteEmpId("");
    setInviteError(null); setInviteSuccess(false);
    setInviteDialog(true);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);

    const res = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        station_id: inviteStation === "none" ? null : inviteStation,
        employee_id: inviteEmpId || null,
      }),
    });

    const json = await res.json();
    setInviting(false);

    if (!res.ok) {
      setInviteError(json.error ?? "Failed to invite user.");
      return;
    }

    setInviteSuccess(true);
    loadData();
    setTimeout(() => setInviteDialog(false), 2000);
  }

  const needsStation = inviteRole === "kptcl_engineer";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Users</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {rows.length} account{rows.length !== 1 ? "s" : ""} across all roles
          </p>
        </div>
        <Button onClick={openInvite} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by name or email…"
        right={
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {Object.entries(ROLE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <EmptyState title="Loading users…" description="Fetching accounts from the database." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No users found" description="Invite users using the button above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/60">
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Name</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Email</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Role</th>
                  <th className="text-left font-medium text-foreground-secondary px-5 py-3">Station</th>
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
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          {u.employeeId && <p className="text-[11px] text-foreground-secondary">{u.employeeId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">{u.email ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={ROLE_VARIANT[u.role] ?? "default"}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-foreground-secondary">
                      {u.role === "kptcl_engineer"
                        ? u.kptclStationNames.length > 0
                          ? u.kptclStationNames.join(", ")
                          : <span className="text-slate-400 italic">Unassigned</span>
                        : u.role === "account_executive" || u.role === "service_engineer"
                        ? <span className="text-slate-400">All Stations</span>
                        : <span className="text-slate-400">—</span>}
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
                          {u.role === "kptcl_engineer" && (
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" /> Assign Stations
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleStatus(u)}>
                            {u.status === "active"
                              ? <><Ban className="h-4 w-4" /> Disable account</>
                              : <><CheckCircle2 className="h-4 w-4" /> Enable account</>}
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

      {/* Assign Stations dialog — KPTCL multi-station */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Stations</DialogTitle>
            <DialogDescription>Select all stations {editing?.name} is responsible for.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-2">
            {stations.length === 0 ? (
              <p className="text-sm text-foreground-secondary italic">No stations available.</p>
            ) : (
              stations.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={editKptclStations.includes(s.id)}
                    onChange={(e) =>
                      setEditKptclStations((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      )
                    }
                  />
                  <span className="text-sm text-foreground">{s.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              An invitation email will be sent so the user can set their own password.
            </DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium text-foreground">Invitation sent to {inviteEmail}</p>
              <p className="text-xs text-foreground-secondary">The user will receive an email to set their password.</p>
            </div>
          ) : (
            <>
              <form id="invite-form" onSubmit={handleInvite} className="px-6 py-5 space-y-4">
                {inviteError && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {inviteError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full Name <span className="text-danger">*</span></Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Rajan Kumar"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email Address <span className="text-danger">*</span></Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. rajan@kptcl.gov.in"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Role <span className="text-danger">*</span></Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsStation && (
                  <div className="space-y-1.5">
                    <Label>Initial Station <span className="text-foreground-secondary text-xs font-normal">(optional — more can be added later)</span></Label>
                    <Select value={inviteStation} onValueChange={setInviteStation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a station…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="invite-empid">
                    Employee ID{" "}
                    <span className="text-foreground-secondary text-xs font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="invite-empid"
                    value={inviteEmpId}
                    onChange={(e) => setInviteEmpId(e.target.value)}
                    placeholder="e.g. EMP-0042"
                  />
                </div>
              </form>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="invite-form" disabled={inviting} className="gap-2">
                  {inviting ? "Sending…" : <><UserPlus className="h-4 w-4" /> Send Invitation</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
