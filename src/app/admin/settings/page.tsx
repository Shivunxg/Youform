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
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
      if (profile) {
        setName(profile.name);
        setEmail(profile.email ?? "");
      }
    })();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ name }).eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-foreground-secondary mt-1">Manage your account preferences</p>
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
            <p className="text-xs text-foreground-secondary">Email changes must be made in Supabase Authentication.</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-success">Saved.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>KTPCL SIMMS is operated by Spectrum Consultants on behalf of Karnataka Transmission Corporation Limited.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
