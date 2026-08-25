// @ts-nocheck
"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function AEProfilePage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    mobile: "",
    employee_id: "",
    station: "",
  });

  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email, mobile, employee_id, station_id, hierarchy_nodes!station_id(name)")
        .eq("id", user.id)
        .single();
      if (profile) {
        setForm({
          name: profile.name ?? "",
          email: profile.email ?? user.email ?? "",
          mobile: profile.mobile ?? "",
          employee_id: profile.employee_id ?? "",
          station: (profile.hierarchy_nodes as { name: string } | null)?.name ?? "Not assigned",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ name: form.name.trim(), mobile: form.mobile.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">My Profile</h1>
        <p className="text-sm text-foreground-secondary mt-1">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Update your display name and contact number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-foreground-secondary py-4 text-center">Loading…</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} disabled className="opacity-60 cursor-not-allowed" />
                <p className="text-[11px] text-foreground-secondary">Email cannot be changed here. Contact your admin.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID</Label>
                <Input value={form.employee_id || "—"} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Station</Label>
                <Input value={form.station} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
                {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
