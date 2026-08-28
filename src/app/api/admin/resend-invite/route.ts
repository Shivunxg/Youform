// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/emails/send";
import { userInvitationEmail } from "@/lib/emails/templates";

export async function POST(req: NextRequest) {
  const caller = await createClient();
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (!callerProfile || callerProfile.role !== "spectrum_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Fetch the user's profile details
  const { data: profile } = await admin
    .from("profiles")
    .select("name, email, role, station_id, hierarchy_nodes!station_id(name)")
    .eq("id", userId)
    .single();

  if (!profile?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Generate a fresh invite link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: profile.email,
    options: {
      data: { role: profile.role, name: profile.name },
      redirectTo: `${appUrl}/login`,
    },
  });

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });

  const inviteLink = linkData.properties?.action_link ?? `${appUrl}/login`;
  const stationName = (profile.hierarchy_nodes as any)?.name ?? null;

  const { subject, html } = userInvitationEmail({
    name: profile.name ?? profile.email,
    email: profile.email,
    role: profile.role,
    stationName,
    inviteLink,
  });

  const result = await sendEmail({ to: profile.email, subject, html });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Email failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
