// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/emails/send";
import { passwordResetEmail } from "@/lib/emails/templates";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Generate the recovery link without Supabase sending any email
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/auth/reset-password` },
  });

  // If the email doesn't exist we still return success (don't leak which emails are registered)
  if (!error && data?.properties?.action_link) {
    const { data: profile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", data.user.id)
      .single();

    const { subject, html } = passwordResetEmail({
      name: profile?.name ?? undefined,
      resetLink: data.properties.action_link,
    });

    await sendEmail({ to: email, subject, html }).catch((e) =>
      console.warn("[reset] email failed:", e)
    );
  }

  return NextResponse.json({ ok: true });
}
