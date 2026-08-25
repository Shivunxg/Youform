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
    .select("name, role, station_id, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "account_executive") redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications_queue")
    .select("*")
    .or(`target_role.eq.account_executive,target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const badges: Record<string, number> = {};
  if (profile.station_id) {
    const { count } = await supabase
      .from("job_cards")
      .select("id", { count: "exact", head: true })
      .eq("station_id", profile.station_id)
      .eq("current_status", "bills_submitted");
    if (count) badges["/ae/job-cards"] = count;
  }

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar
        variant="ae"
        badges={badges}
        user={{ name: profile.name, email: profile.email ?? user.email ?? "", role: "Account Executive", profileHref: "/ae/profile" }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header notifications={notifications ?? []} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {!profile.station_id ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Your account is not assigned to a station yet. Contact your Spectrum Admin to get assigned.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
