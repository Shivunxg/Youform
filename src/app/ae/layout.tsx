import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export default async function AELayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, substation_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "assistant_engineer") redirect("/login");

  const { data: notifications } = profile.substation_id
    ? await supabase
        .from("notifications")
        .select("*")
        .eq("target_role", "assistant_engineer")
        .eq("substation_id", profile.substation_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const badges: Record<string, number> = {};
  if (profile.substation_id) {
    const { count: estimateReviewCount } = await supabase
      .from("job_cards")
      .select("id", { count: "exact", head: true })
      .eq("substation_id", profile.substation_id)
      .eq("status", "estimate_sent");
    if (estimateReviewCount) badges["/ae/job-cards"] = estimateReviewCount;
  }

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar variant="ae" badges={badges} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header role="Assistant Engineer" name={profile.name} notifications={notifications ?? []} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {!profile.substation_id ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Your account isn&apos;t assigned to a substation yet. Contact your Spectrum Admin to get assigned before
              you can view or enter data.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
