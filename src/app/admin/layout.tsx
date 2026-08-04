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
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "spectrum_admin") redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("target_role", "spectrum_admin")
    .order("created_at", { ascending: false })
    .limit(20);

  const [{ count: jobCardCount }, { count: serviceRequestCount }] = await Promise.all([
    supabase
      .from("job_cards")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "assigned", "inspecting", "mom_logged"]),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const badges: Record<string, number> = {};
  if (jobCardCount) badges["/admin/job-cards"] = jobCardCount;
  if (serviceRequestCount) badges["/admin/service-requests"] = serviceRequestCount;

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar badges={badges} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header role="Spectrum Admin" name={profile.name} notifications={notifications ?? []} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
