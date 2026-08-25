"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function AdminSettingsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [level1, setLevel1] = React.useState("Zone");
  const [level2, setLevel2] = React.useState("Circle");
  const [level3, setLevel3] = React.useState("Division");
  const [level4, setLevel4] = React.useState("Station");
  const [ageingDays, setAgeingDays] = React.useState("30");

  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savedProfile, setSavedProfile] = React.useState(false);
  const [savingApp, setSavingApp] = React.useState(false);
  const [savedApp, setSavedApp] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("name, email").eq("id", user.id).single(),
        supabase.from("app_settings").select("key, value"),
      ]);

      if (profile) {
        setName(profile.name);
        setEmail(profile.email ?? "");
      }
      if (settings) {
        const map: Record<string, string> = {};
        for (const s of settings) map[s.key] = s.value;
        if (map["level_1_label"]) setLevel1(map["level_1_label"]);
        if (map["level_2_label"]) setLevel2(map["level_2_label"]);
        if (map["level_3_label"]) setLevel3(map["level_3_label"]);
        if (map["level_4_label"]) setLevel4(map["level_4_label"]);
        if (map["ageing_threshold_days"]) setAgeingDays(map["ageing_threshold_days"]);
      }
    })();
  }, [supabase]);

  async function saveProfile() {
    setSavingProfile(true);
    setSavedProfile(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ name }).eq("id", user.id);
    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2500);
  }

  async function saveAppSettings() {
    setSavingApp(true);
    setSavedApp(false);
    const updates = [
      { key: "level_1_label", value: level1 },
      { key: "level_2_label", value: level2 },
      { key: "level_3_label", value: level3 },
      { key: "level_4_label", value: level4 },
      { key: "ageing_threshold_days", value: ageingDays },
    ];
    await Promise.all(
      updates.map((u) =>
        supabase
          .from("app_settings")
          .update({ value: u.value, updated_at: new Date().toISOString() })
          .eq("key", u.key)
      )
    );
    setSavingApp(false);
    setSavedApp(true);
    setTimeout(() => setSavedApp(false), 2500);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Manage account and application preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your display name and account email</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-foreground-secondary">
              Email changes must be made in Supabase Authentication.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
            {savedProfile && <span className="text-sm text-success">Saved.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hierarchy Level Labels</CardTitle>
          <CardDescription>
            Customise the names for each level of the 4-level hierarchy (e.g. Zone → Circle →
            Division → Station)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Level 1 (top)</Label>
              <Input value={level1} onChange={(e) => setLevel1(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Level 2</Label>
              <Input value={level2} onChange={(e) => setLevel2(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Level 3</Label>
              <Input value={level3} onChange={(e) => setLevel3(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Level 4 (Station)</Label>
              <Input value={level4} onChange={(e) => setLevel4(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ageing Threshold</CardTitle>
          <CardDescription>
            Job cards open longer than this many days will show an ageing warning on dashboards
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={365}
              value={ageingDays}
              onChange={(e) => setAgeingDays(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-foreground-secondary">days</span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveAppSettings} disabled={savingApp}>
              {savingApp ? "Saving…" : "Save settings"}
            </Button>
            {savedApp && <span className="text-sm text-success">Saved.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            KTPCL SIMMS is operated by Spectrum Consultants on behalf of Karnataka Transmission
            Corporation Limited.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
