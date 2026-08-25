// @ts-nocheck
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

const DEFAULT_TERMS = `1. This proposal is valid for 30 days from the date of issue.
2. Prices are exclusive of GST (18%) unless stated otherwise.
3. Payment terms: 100% within 30 days of invoice date.
4. Work will be carried out as per KPTCL safety standards and SOPs.
5. Any additional work outside the scope will be charged separately with prior approval.
6. Materials and equipment shall conform to relevant IS/IEC standards.
7. Spectrum Consultants reserves the right to revise prices if material costs change significantly.`;

const UNITS = ["Nos", "LS", "Hrs", "Days", "Months", "Set", "Mtr", "Kg"];

interface LineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

interface Station { id: string; name: string }
interface JC { id: string; job_card_number: string; station_id: string; issue_description: string; equipment_types: { name: string } | null; voltage_classes: { name: string } | null }

function newItem(): LineItem {
  return { description: "", qty: 1, unit: "Nos", rate: 0, amount: 0 };
}

export default function NewProposalPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [stations, setStations]   = React.useState<Station[]>([]);
  const [jobCards, setJobCards]   = React.useState<JC[]>([]);

  const [stationId, setStationId]   = React.useState("none");
  const [clientName, setClientName] = React.useState("");
  const [jobCardId, setJobCardId]   = React.useState("none");
  const [title, setTitle]           = React.useState("");
  const [scope, setScope]           = React.useState("");
  const [items, setItems]           = React.useState<LineItem[]>([newItem()]);
  const [taxPercent, setTaxPercent] = React.useState(18);
  const [validityDays, setValidityDays] = React.useState(30);
  const [terms, setTerms]           = React.useState(DEFAULT_TERMS);
  const [saving, setSaving]         = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.from("hierarchy_nodes").select("id, name").eq("level", 4).eq("status", "active").order("name")
      .then(({ data }) => setStations(data ?? []));
    supabase.from("job_cards")
      .select("id, job_card_number, station_id, issue_description, equipment_types(name), voltage_classes(name)")
      .not("current_status", "in", '("payment_received","offer_dropped","order_lost")')
      .order("created_at", { ascending: false })
      .then(({ data }) => setJobCards(data ?? []));
  }, []);

  // When station is selected, auto-fill client name
  function handleStationChange(id: string) {
    setStationId(id);
    const s = stations.find((s) => s.id === id);
    if (s) setClientName(`KPTCL — ${s.name} Substation`);
    else setClientName("");
    setJobCardId("none"); // reset linked job card when station changes
  }

  // When job card is linked, auto-suggest title and scope
  function handleJobCardChange(id: string) {
    setJobCardId(id);
    if (id === "none") return;
    const jc = jobCards.find((j) => j.id === id);
    if (!jc) return;
    const eqType = (jc.equipment_types as any)?.name;
    const vc = (jc.voltage_classes as any)?.name;
    const parts = [eqType, vc].filter(Boolean).join(" — ");
    setTitle(`Proposal for ${parts ? parts + " — " : ""}${jc.issue_description.slice(0, 80)}`);
    setScope(`Scope: Service and maintenance work as per job card ${jc.job_card_number}.\n\n${jc.issue_description}`);
    // Also set station from job card if not already set
    if (stationId === "none" && jc.station_id) {
      setStationId(jc.station_id);
      const s = stations.find((s) => s.id === jc.station_id);
      if (s) setClientName(`KPTCL — ${s.name} Substation`);
    }
  }

  // Recalculate row amount on qty/rate change
  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      if (field === "qty" || field === "rate") {
        row.amount = Number(row.qty) * Number(row.rate);
      }
      next[index] = row;
      return next;
    });
  }

  function addItem() { setItems((prev) => [...prev, newItem()]); }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const subtotal  = items.reduce((s, it) => s + (it.amount || 0), 0);
  const taxAmount = Math.round((subtotal * taxPercent) / 100 * 100) / 100;
  const total     = subtotal + taxAmount;

  async function handleSave(status: "draft" | "sent") {
    setError(null);
    if (!clientName) { setError("Select a station first."); return; }
    if (!title.trim()) { setError("Enter a proposal subject/title."); return; }
    if (items.every((it) => !it.description)) { setError("Add at least one line item."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: err } = await supabase
      .from("proposals")
      .insert({
        proposal_number: "",  // trigger fills this
        job_card_id:  jobCardId === "none" ? null : jobCardId,
        station_id:   stationId === "none" ? null : stationId,
        client_name:  clientName,
        title:        title.trim(),
        scope_of_work: scope.trim() || null,
        items:        items.filter((it) => it.description),
        terms:        terms.trim() || null,
        subtotal,
        tax_percent:  taxPercent,
        tax_amount:   taxAmount,
        total,
        validity_days: validityDays,
        status,
        created_by:   user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/admin/proposals/${data.id}`);
  }

  const stationJobCards = stationId === "none"
    ? jobCards
    : jobCards.filter((j) => j.station_id === stationId);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">New Proposal</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">Proposal number assigned automatically on save</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Client / station */}
          <Card>
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Station (Client) <span className="text-danger">*</span></Label>
                <Select value={stationId} onValueChange={handleStationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a substation…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select station —</SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Client Name (as appears on proposal)</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="KPTCL — Whitefield Substation" />
              </div>
              <div className="space-y-1.5">
                <Label>Link to Job Card <span className="text-foreground-secondary text-xs">(optional — auto-fills subject)</span></Label>
                <Select value={jobCardId} onValueChange={handleJobCardChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job card…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {stationJobCards.map((jc) => (
                      <SelectItem key={jc.id} value={jc.id}>
                        {jc.job_card_number} — {jc.issue_description.slice(0, 50)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Proposal details */}
          <Card>
            <CardHeader><CardTitle>Proposal Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Subject / Title <span className="text-danger">*</span></Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Maintenance of 110kV Power Transformer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Scope of Work</Label>
                <textarea
                  rows={5}
                  className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                  placeholder="Describe the work to be performed…"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Validity (days)</Label>
                  <Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>GST %</Label>
                  <Input type="number" min={0} max={100} value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price Schedule</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
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
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="e.g. Transformer oil filtration"
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={(e) => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Select value={item.unit} onValueChange={(v) => updateItem(i, "unit", v)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.rate}
                            onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-medium text-foreground">
                          {item.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-danger transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 ml-auto w-64 space-y-1.5 text-sm border-t border-border pt-3">
                <div className="flex justify-between text-foreground-secondary">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-foreground-secondary">
                  <span>GST ({taxPercent}%)</span>
                  <span>₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
            <CardContent>
              <textarea
                rows={8}
                className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y font-mono"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: summary + actions */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-foreground-secondary font-medium">Client</p>
                <p className="text-sm text-foreground mt-0.5">{clientName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-secondary font-medium">Subject</p>
                <p className="text-sm text-foreground mt-0.5 line-clamp-3">{title || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-secondary font-medium">Line Items</p>
                <p className="text-sm text-foreground mt-0.5">{items.filter((i) => i.description).length} items</p>
              </div>
              <div className="rounded-xl bg-background-secondary p-3 space-y-1 text-sm">
                <div className="flex justify-between text-foreground-secondary">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-foreground-secondary">
                  <span>GST {taxPercent}%</span>
                  <span>₹{taxAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5">
                  <span>Grand Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button className="w-full" onClick={() => handleSave("draft")} disabled={saving}>
                  {saving ? "Saving…" : "Save as Draft"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSave("sent")} disabled={saving}>
                  Save &amp; Mark as Sent
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
