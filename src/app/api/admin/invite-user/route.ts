// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/emails/send";
import { userInvitationEmail } from "@/lib/emails/templates";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // generateLink creates the user + returns the invite URL without Supabase sending any email.
  // This lets us send our own branded email via Resend instead of Supabase's default template.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { role, name },
      redirectTo: `${appUrl}/auth/reset-password`,
    },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  const userId = linkData.user.id;
  const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`;

  // Update the auto-created profile row with name, role, station, employee_id
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      name,
      role,
      station_id: station_id || null,
      employee_id: employee_id || null,
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // For KPTCL engineers, seed the multi-station junction table
  if (role === "kptcl_engineer" && station_id) {
    await admin
      .from("kptcl_station_assignments")
      .insert({ kptcl_user_id: userId, station_id })
      .then(() => {}); // ignore error — admin can assign via UI
  }

  // Fetch station name for the welcome email
  let stationName: string | null = null;
  if (station_id) {
    const { data: station } = await admin
      .from("hierarchy_nodes")
      .select("name")
      .eq("id", station_id)
      .single();
    stationName = station?.name ?? null;
  }

  // Send branded invite email via Resend (Supabase sends nothing since we used generateLink)
  const { subject, html } = userInvitationEmail({
    name,
    email,
    role,
    stationName,
    inviteLink,
  });
  const emailResult = await sendEmail({ to: email, subject, html }).catch((e) => {
    console.error("[invite] email exception:", e);
    return { success: false, error: String(e) };
  });
  console.log("[invite] email result:", JSON.stringify(emailResult));
  console.log("[invite] from:", process.env.EMAIL_FROM ?? "KTPCL SIMMS <noreply@spectrumconsultants.co.in>");
  console.log("[invite] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

  return NextResponse.json({ id: userId, emailSent: emailResult.success });
}
