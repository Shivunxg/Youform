// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Verify caller is a spectrum_admin
  const caller = await createClient();
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "spectrum_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, role, station_id, employee_id } = await req.json();

  if (!name || !email || !role) {
    return NextResponse.json({ error: "name, email, and role are required" }, { status: 400 });
  }

  const VALID_ROLES = ["spectrum_admin", "account_executive", "service_engineer", "kptcl_engineer"];
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the auth user and send invite email
  const { data: newUser, error: createError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Update the auto-created profile row with name, role, station, employee_id
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      name,
      role,
      station_id: station_id || null,
      employee_id: employee_id || null,
    })
    .eq("id", newUser.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ id: newUser.user.id });
}
