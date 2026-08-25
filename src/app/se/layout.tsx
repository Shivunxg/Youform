import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export default async function SELayout({ children }: { children: React.ReactNode }) {
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

  if (!profile || profile.role !== "service_engineer") redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications_queue")
    .select("*")
    .or(`target_role.eq.service_engineer,target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: myJobsCount } = await supabase
    .from("job_card_engineers")
    .select("job_card_id", { count: "exact", head: true })
    .eq("engineer_id", user.id);

  const badges: Record<string, number> = {};
  if (myJobsCount) badges["/se/job-cards"] = myJobsCount;

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar
        variant="se"
        badges={badges}
        user={{ name: profile.name, email: profile.email ?? user.email ?? "", role: "Service Engineer", profileHref: "/se/profile" }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header notifications={notifications ?? []} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
