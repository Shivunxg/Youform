// @ts-nocheck
import { redirect } from "next/navigation";
import Link from "next/link";
import { HardHat, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { fmtDateIST } from "@/lib/ist";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quotation_shared: "Quotation Shared",
  order_received: "Order Received",
  offer_dropped: "Offer Dropped",
  order_lost: "Order Lost",
  supply_service_given: "Supply / Service Given",
  bills_submitted: "Bills Submitted",
  payment_received: "Payment Received",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "accent" | "warning" | "danger" | "success"
> = {
  quotation_shared: "accent",
  order_received: "warning",
  offer_dropped: "danger",
  order_lost: "danger",
  supply_service_given: "warning",
  bills_submitted: "warning",
  payment_received: "success",
};

export default async function SEDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: assignments } = await supabase
    .from("job_card_engineers")
    .select("job_card_id, job_cards(id, job_card_number, current_status, created_at, hierarchy_nodes!station_id(name))")
    .eq("engineer_id", user.id)
    .order("assigned_at", { ascending: false })
    .limit(10);

  const jobCards = (assignments ?? []).map((a) => {
    const jc = a.job_cards as unknown as {
      id: string;
      job_card_number: string;
      current_status: string;
      created_at: string;
      hierarchy_nodes: { name: string } | null;
    };
    return {
      id: jc.id,
      jobCardNumber: jc.job_card_number,
      currentStatus: jc.current_status,
      stationName: jc.hierarchy_nodes?.name ?? "—",
      createdAt: jc.created_at,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Welcome, {profile?.name ?? "Engineer"}
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">Your assigned job cards</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>My Jobs</CardTitle>
            <CardDescription>Job cards assigned to you</CardDescription>
          </div>
          <Link
            href="/se/job-cards"
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline shrink-0"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {jobCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-foreground-secondary">
              <HardHat className="h-8 w-8 text-slate-300" />
              <p className="text-sm">No jobs assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {jobCards.map((jc) => (
                <div
                  key={jc.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{jc.jobCardNumber}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                      {jc.stationName} · {fmtDateIST(jc.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[jc.currentStatus] ?? "default"} dot className="shrink-0">
                    {STATUS_LABEL[jc.currentStatus] ?? jc.currentStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
