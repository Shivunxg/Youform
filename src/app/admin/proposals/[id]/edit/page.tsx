// @ts-nocheck
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const UNITS = ["Nos", "LS", "Hrs", "Days", "Months", "Set", "Mtr", "Kg"];

interface LineItem { description: string; qty: number; unit: string; rate: number; amount: number }
interface Station { id: string; name: string }

function newItem(): LineItem { return { description: "", qty: 1, unit: "Nos", rate: 0, amount: 0 }; }

export default function EditProposalPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [stations, setStations] = React.useState<Station[]>([]);
  const [loaded, setLoaded]     = React.useState(false);

  const [stationId, setStationId]     = React.useState("none");
  const [clientName, setClientName]   = React.useState("");
  const [title, setTitle]             = React.useState("");
  const [scope, setScope]             = React.useState("");
  const [items, setItems]             = React.useState<LineItem[]>([newItem()]);
  const [taxPercent, setTaxPercent]   = React.useState(18);
  const [validityDays, setValidityDays] = React.useState(30);
  const [terms, setTerms]             = React.useState("");
  const [saving, setSaving]           = React.useState(false);
  const [error, setError]             = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const [{ data: stData }, { data: p }] = await Promise.all([
        supabase.from("hierarchy_nodes").select("id, name").eq("level", 4).eq("status", "active").order("name"),
        supabase.from("proposals").select("*").eq("id", id).single(),
      ]);
      setStations(stData ?? []);
      if (p) {
        setStationId(p.station_id ?? "none");
        setClientName(p.client_name);
        setTitle(p.title);
        setScope(p.scope_of_work ?? "");
        setItems(p.items?.length ? p.items : [newItem()]);
        setTaxPercent(p.tax_percent ?? 18);
        setValidityDays(p.validity_days ?? 30);
        setTerms(p.terms ?? "");
      }
      setLoaded(true);
    }
    load();
  }, [id]);

  function handleStationChange(sid: string) {
    setStationId(sid);
    const s = stations.find((s) => s.id === sid);
    if (s) setClientName(`KPTCL — ${s.name} Substation`);
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      if (field === "qty" || field === "rate") row.amount = Number(row.qty) * Number(row.rate);
      next[index] = row;
      return next;
    });
  }

  const subtotal  = items.reduce((s, it) => s + (it.amount || 0), 0);
  const taxAmount = Math.round((subtotal * taxPercent) / 100 * 100) / 100;
  const total     = subtotal + taxAmount;

  async function handleSave() {
    setError(null);
    if (!clientName) { setError("Select a station first."); return; }
    if (!title.trim()) { setError("Enter a subject."); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from("proposals")
      .update({
        station_id:   stationId === "none" ? null : stationId,
        client_name:  clientName,
        title:        title.trim(),
        scope_of_work: scope.trim() || null,
        items:        items.filter((it) => it.description),
        terms:        terms.trim() || null,
        subtotal, tax_percent: taxPercent, tax_amount: taxAmount, total,
        validity_days: validityDays,
      })
      .eq("id", id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/admin/proposals/${id}`);
  }

  if (!loaded) return <p className="text-sm text-foreground-secondary py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Edit Proposal</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Station</Label>
                <Select value={stationId} onValueChange={handleStationChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select station —</SelectItem>
                    {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Client Name</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Proposal Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Subject / Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Scope of Work</Label>
                <textarea rows={5} className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y" value={scope} onChange={(e) => setScope(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Validity (days)</Label>
                  <Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>GST %</Label>
                  <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price Schedule</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, newItem()])} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-foreground-secondary py-2 pr-2 w-8">#</th>
                      <th className="text-left font-medium text-foreground-secondary py-2 pr-2">Description</th>
                      <th className="text-left font-medium text-foreground-secondary py-2 pr-2 w-16">Qty</th>
                      <th className="text-left font-medium text-foreground-secondary py-2 pr-2 w-20">Unit</th>
                      <th className="text-right font-medium text-foreground-secondary py-2 pr-2 w-28">Rate (₹)</th>
                      <th className="text-right font-medium text-foreground-secondary py-2 pr-2 w-28">Amount (₹)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-2 text-foreground-secondary">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="h-8 text-sm" />
                        </td>
                        <td className="py-2 pr-2">
                          <Input type="number" value={item.qty} onChange={(e) => updateItem(i, "qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                        </td>
                        <td className="py-2 pr-2">
                          <Select value={item.unit} onValueChange={(v) => updateItem(i, "unit", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2">
                          <Input type="number" value={item.rate} onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                        </td>
                        <td className="py-2 pr-2 text-right font-medium">{item.amount.toLocaleString("en-IN")}</td>
                        <td className="py-2">
                          {items.length > 1 && (
                            <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-danger">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 ml-auto w-64 space-y-1.5 text-sm border-t border-border pt-3">
                <div className="flex justify-between text-foreground-secondary"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-foreground-secondary"><span>GST ({taxPercent}%)</span><span>₹{taxAmount.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
            <CardContent>
              <textarea rows={8} className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y font-mono" value={terms} onChange={(e) => setTerms(e.target.value)} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Save</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-background-secondary p-3 space-y-1 text-sm">
                <div className="flex justify-between text-foreground-secondary"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-foreground-secondary"><span>GST {taxPercent}%</span><span>₹{taxAmount.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5"><span>Grand Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push(`/admin/proposals/${id}`)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
