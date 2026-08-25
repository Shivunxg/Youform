import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export default async function KPTCLLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login/kptcl");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, station_id, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "kptcl_engineer") redirect("/login/kptcl");

  const { count: pendingCount } = await supabase
    .from("job_cards")
    .select("id", { count: "exact", head: true })
    .eq("station_id", profile.station_id ?? "")
    .eq("current_status", "supply_service_given");

  const badges: Record<string, number> = {};
  if (pendingCount) badges["/kptcl/job-cards"] = pendingCount;

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <Sidebar
        variant="kptcl"
        badges={badges}
        user={{
          name: profile.name ?? user.email ?? "KPTCL Engineer",
          email: profile.email ?? user.email ?? "",
          role: "KPTCL Engineer",
          profileHref: "/kptcl/profile",
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header profile={{ name: profile.name ?? user.email ?? "KPTCL Engineer", email: profile.email ?? user.email ?? "", role: "KPTCL Engineer" }} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
