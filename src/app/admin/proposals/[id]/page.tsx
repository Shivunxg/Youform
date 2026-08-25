// @ts-nocheck
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Pencil, CheckCircle2, XCircle, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

const STATUS_VARIANT: Record<string, any> = {
  draft: "default", sent: "accent", accepted: "success", rejected: "danger", expired: "warning",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};
const NEXT_STATUSES: Record<string, { label: string; value: string; icon: React.ElementType; variant: any }[]> = {
  draft:    [{ label: "Mark as Sent",     value: "sent",     icon: Send,         variant: "outline" }],
  sent:     [
    { label: "Mark Accepted", value: "accepted", icon: CheckCircle2, variant: "outline" },
    { label: "Mark Rejected", value: "rejected", icon: XCircle,      variant: "outline" },
  ],
  accepted: [],
  rejected: [],
  expired:  [],
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function validUntil(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return fmtDate(d.toISOString());
}

export default function ProposalViewPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [p, setP] = React.useState<any>(null);
  const [updating, setUpdating] = React.useState(false);
  const [sendDialog, setSendDialog] = React.useState(false);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  React.useEffect(() => {
    supabase
      .from("proposals")
      .select("*, job_cards(job_card_number), profiles!created_by(name), hierarchy_nodes!station_id(contact_email)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setP(data);
        const email = data?.hierarchy_nodes?.contact_email;
        if (email) setRecipientEmail(email);
      });
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    await supabase.from("proposals").update({ status }).eq("id", id);
    setP((prev: any) => ({ ...prev, status }));
    setUpdating(false);
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSendingEmail(true);
    // Mark as sent in DB first
    if (p.status === "draft") await updateStatus("sent");
    // Send email
    await fetch("/api/email/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "proposal_shared", proposalId: id, recipientEmail }),
    });
    setSendingEmail(false);
    setEmailSent(true);
    setTimeout(() => { setSendDialog(false); setEmailSent(false); }, 2000);
  }

  if (!p) return <p className="text-sm text-foreground-secondary py-10 text-center">Loading…</p>;

  const items: any[] = p.items ?? [];
  const nextActions = NEXT_STATUSES[p.status] ?? [];

  return (
    <>
      {/* Action toolbar — hidden when printing */}
      <div className="print:hidden space-y-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1" />
          <Badge variant={STATUS_VARIANT[p.status]} dot>{STATUS_LABEL[p.status]}</Badge>
          {nextActions.map((a) => (
            <Button key={a.value} variant={a.variant} size="sm" onClick={() => updateStatus(a.value)} disabled={updating} className="gap-1">
              <a.icon className="h-3.5 w-3.5" />{a.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/proposals/${id}/edit`)} className="gap-1">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRecipientEmail(""); setEmailSent(false); setSendDialog(true); }} className="gap-1">
            <Mail className="h-3.5 w-3.5" /> Email to Client
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* ── Proposal Document ────────────────────────────────────────── */}
      <div
        id="proposal-doc"
        className="bg-white rounded-2xl shadow-sm border border-border p-8 sm:p-12 max-w-4xl mx-auto print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#0B1A3D] pb-6 mb-8">
          <div>
            <p className="text-2xl font-bold text-[#0B1A3D] tracking-tight">Spectrum Consultants</p>
            <p className="text-xs text-slate-500 mt-1">Electrical Engineering &amp; Substation Services</p>
            <p className="text-xs text-slate-500">Bangalore, Karnataka · GST: 29XXXXXX1234Z1</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Proposal</p>
            <p className="text-xl font-bold text-[#0B1A3D] font-mono mt-0.5">{p.proposal_number}</p>
            <p className="text-xs text-slate-500 mt-1">Date: {fmtDate(p.created_at)}</p>
            <p className="text-xs text-slate-500">Valid until: {validUntil(p.created_at, p.validity_days)}</p>
          </div>
        </div>

        {/* To */}
        <div className="mb-8">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-1">To</p>
          <p className="text-base font-semibold text-[#0B1A3D]">{p.client_name}</p>
          <p className="text-sm text-slate-500">Karnataka Power Transmission Corporation Ltd (KPTCL)</p>
          {(p.job_cards as any)?.job_card_number && (
            <p className="text-xs text-slate-400 mt-1">Ref: Job Card {(p.job_cards as any).job_card_number}</p>
          )}
        </div>

        {/* Subject */}
        <div className="mb-6">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Subject</p>
          <p className="text-base font-semibold text-foreground">{p.title}</p>
        </div>

        {/* Salutation */}
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Dear Sir / Madam,<br /><br />
          We are pleased to submit our proposal for the following scope of work at your substation. Please find the details below.
        </p>

        {/* Scope of Work */}
        {p.scope_of_work && (
          <div className="mb-8">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Scope of Work</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{p.scope_of_work}</p>
          </div>
        )}

        {/* Price Schedule */}
        <div className="mb-8">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-3">Price Schedule</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0B1A3D] text-white">
                <th className="text-left px-3 py-2.5 font-medium rounded-tl-lg w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Description of Work / Material</th>
                <th className="text-center px-3 py-2.5 font-medium w-16">Qty</th>
                <th className="text-center px-3 py-2.5 font-medium w-16">Unit</th>
                <th className="text-right px-3 py-2.5 font-medium w-28">Rate (₹)</th>
                <th className="text-right px-3 py-2.5 font-medium rounded-tr-lg w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((it) => it.description).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-slate-100">{i + 1}</td>
                  <td className="px-3 py-2.5 text-slate-800 border-b border-slate-100">{item.description}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700 border-b border-slate-100">{item.qty}</td>
                  <td className="px-3 py-2.5 text-center text-slate-500 border-b border-slate-100">{item.unit}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700 border-b border-slate-100">
                    {Number(item.rate).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800 border-b border-slate-100">
                    {Number(item.amount).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right text-sm text-slate-500 font-medium">Subtotal</td>
                <td className="px-3 py-2 text-right text-sm text-slate-700 font-medium">
                  ₹{Number(p.subtotal).toLocaleString("en-IN")}
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right text-sm text-slate-500 font-medium">
                  GST @ {p.tax_percent}%
                </td>
                <td className="px-3 py-2 text-right text-sm text-slate-700 font-medium">
                  ₹{Number(p.tax_amount).toLocaleString("en-IN")}
                </td>
              </tr>
              <tr className="bg-[#0B1A3D] text-white">
                <td colSpan={5} className="px-3 py-3 text-right font-semibold rounded-bl-lg">Grand Total</td>
                <td className="px-3 py-3 text-right font-bold text-lg rounded-br-lg">
                  ₹{Number(p.total).toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-slate-400 mt-2">Amount in words: {numberToWords(Math.round(p.total))} Rupees Only</p>
        </div>

        {/* Terms */}
        {p.terms && (
          <div className="mb-10">
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Terms &amp; Conditions</p>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{p.terms}</div>
          </div>
        )}

        {/* Closing */}
        <p className="text-sm text-slate-600 mb-10">
          We hope the above proposal meets your requirements. We assure you of our best services at all times. Please feel free to contact us for any clarifications.
        </p>

        {/* Signature */}
        <div className="flex justify-between items-end border-t border-slate-200 pt-8">
          <div>
            <p className="text-xs text-slate-400">Prepared by</p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">
              {(p.profiles as any)?.name ?? "Spectrum Consultants"}
            </p>
            <p className="text-xs text-slate-400">Spectrum Consultants</p>
          </div>
          <div className="text-right">
            <div className="h-14 border-b border-slate-300 w-40 mb-1" />
            <p className="text-xs text-slate-400">Authorised Signatory</p>
            <p className="text-sm font-medium text-slate-700">Spectrum Consultants</p>
          </div>
        </div>
      </div>

      {/* Send Email dialog */}
      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Proposal to Client</DialogTitle>
            <DialogDescription>
              Send <strong>{p.proposal_number}</strong> to the client's email address. The proposal will also be marked as <strong>Sent</strong>.
            </DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium text-foreground">Email sent to {recipientEmail}</p>
            </div>
          ) : (
            <>
              <form id="send-proposal-form" onSubmit={handleSendEmail} className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="recipient-email">Client Email Address <span className="text-danger">*</span></Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. ee.whitefield@kptcl.gov.in"
                    required
                  />
                </div>
                <p className="text-xs text-foreground-secondary">
                  The recipient will receive a fully formatted proposal email including scope of work, price schedule, and terms.
                </p>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendDialog(false)}>Cancel</Button>
                <Button type="submit" form="send-proposal-form" disabled={sendingEmail} className="gap-2">
                  {sendingEmail ? "Sending…" : <><Mail className="h-4 w-4" /> Send Proposal</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #proposal-doc, #proposal-doc * { visibility: visible; }
          #proposal-doc { position: fixed; left: 0; top: 0; width: 100%; }
          @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
        }
      `}</style>
    </>
  );
}

// Simple number-to-words for totals (Indian system, up to crores)
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoDigits(n: number) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function threeDigits(n: number) {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
  }
  const crore = Math.floor(n / 1e7);
  const lakh  = Math.floor((n % 1e7) / 1e5);
  const thou  = Math.floor((n % 1e5) / 1000);
  const rem   = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh)  parts.push(twoDigits(lakh) + " Lakh");
  if (thou)  parts.push(threeDigits(thou) + " Thousand");
  if (rem)   parts.push(threeDigits(rem));
  return parts.join(" ");
}
