// @ts-nocheck
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export const metadata = { title: "Proposals — KTPCL SIMMS" };

const STATUS_VARIANT: Record<string, "default" | "accent" | "warning" | "success" | "danger"> = {
  draft:    "default",
  sent:     "accent",
  accepted: "success",
  rejected: "danger",
  expired:  "warning",
};

const STATUS_LABEL: Record<string, string> = {
  draft:    "Draft",
  sent:     "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired:  "Expired",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRupee(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, proposal_number, client_name, title, total, status, created_at, job_card_id, job_cards(job_card_number)")
    .order("created_at", { ascending: false });

  const counts = {
    total:    proposals?.length ?? 0,
    draft:    proposals?.filter((p) => p.status === "draft").length ?? 0,
    sent:     proposals?.filter((p) => p.status === "sent").length ?? 0,
    accepted: proposals?.filter((p) => p.status === "accepted").length ?? 0,
  };

  const acceptedTotal = proposals
    ?.filter((p) => p.status === "accepted")
    .reduce((s, p) => s + (p.total ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Proposals</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Service and maintenance quotations for KPTCL substations
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/admin/proposals/new">
            <Plus className="h-4 w-4" /> New Proposal
          </Link>
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: counts.total,    sub: "proposals"  },
          { label: "Draft",     value: counts.draft,    sub: "pending"    },
          { label: "Sent",      value: counts.sent,     sub: "awaiting"   },
          { label: "Accepted",  value: fmtRupee(acceptedTotal), sub: `${counts.accepted} won` },
        ].map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-foreground-secondary font-medium">{t.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{t.value}</p>
            <p className="text-[11px] text-foreground-secondary mt-0.5">{t.sub}</p>
          </Card>
        ))}
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!proposals?.length ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <FileText className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-foreground">No proposals yet</p>
              <p className="text-xs text-foreground-secondary">Create your first proposal using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-secondary/50">
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Proposal No.</th>
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Client / Station</th>
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Subject</th>
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Job Card</th>
                    <th className="text-right font-medium text-foreground-secondary px-4 py-3">Total</th>
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Status</th>
                    <th className="text-left font-medium text-foreground-secondary px-4 py-3">Date</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-hover/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-accent">{p.proposal_number}</span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">{p.client_name}</td>
                      <td className="px-4 py-3.5 text-foreground-secondary max-w-[200px] truncate">{p.title}</td>
                      <td className="px-4 py-3.5 text-foreground-secondary text-xs">
                        {(p.job_cards as any)?.job_card_number ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-foreground">
                        {p.total ? fmtRupee(p.total) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_VARIANT[p.status] ?? "default"} dot>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-foreground-secondary">{fmtDate(p.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Link href={`/admin/proposals/${p.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
