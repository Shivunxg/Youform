// @ts-nocheck
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function KPTCLProfilePage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [profile, setProfile] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, mobile, email, employee_id, station_id, hierarchy_nodes!station_id(name)")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile({ ...data, email: user.email });
        setName(data.name ?? "");
        setMobile(data.mobile ?? "");
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ name, mobile }).eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!profile) return <p className="text-sm text-foreground-secondary py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Profile</h1>
        <p className="text-sm text-foreground-secondary mt-1">Your KPTCL engineer account details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground-secondary">Email (read-only)</Label>
              <Input value={profile.email ?? ""} disabled className="bg-background-secondary" />
            </div>
            {profile.employee_id && (
              <div className="space-y-1.5">
                <Label className="text-foreground-secondary">Employee ID (read-only)</Label>
                <Input value={profile.employee_id} disabled className="bg-background-secondary" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-foreground-secondary">Assigned Station</Label>
              <Input
                value={(profile.hierarchy_nodes as any)?.name ?? (profile.station_id ? profile.station_id : "Not assigned")}
                disabled
                className="bg-background-secondary"
              />
            </div>

            {saved && (
              <p className="text-sm text-green-600 font-medium">Saved successfully.</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
