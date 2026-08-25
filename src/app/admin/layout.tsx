import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "spectrum_admin") redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications_queue")
    .select("*")
    .or(`target_role.eq.spectrum_admin,target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: openCount } = await supabase
    .from("job_cards")
    .select("id", { count: "exact", head: true })
    .in("current_status", ["quotation_shared", "order_received", "supply_service_given"]);

  const badges: Record<string, number> = {};
  if (openCount) badges["/admin/job-cards"] = openCount;

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar badges={badges} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header role="Spectrum Admin" name={profile.name} email={profile.email ?? user.email ?? ""} notifications={notifications ?? []} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
