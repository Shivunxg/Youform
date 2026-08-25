// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/emails/send";
import { maintenanceDueEmail } from "@/lib/emails/templates";

// Vercel Cron calls this at 01:30 UTC (07:00 IST) daily.
// Configure CRON_SECRET in Vercel env vars to secure the endpoint.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const due3 = new Date(today); due3.setDate(today.getDate() + 3);
  const due7 = new Date(today); due7.setDate(today.getDate() + 7);

  // Fetch all active instances due today, in 3 days, or in 7 days
  const { data: instances, error } = await admin
    .from("equipment_instances")
    .select(`
      id, name, serial_number, next_due_date, last_maintenance_date, station_id,
      equipment_types(name),
      hierarchy_nodes!station_id(name, contact_email)
    `)
    .in("next_due_date", [fmt(today), fmt(due3), fmt(due7)])
    .eq("status", "active");

  if (error) {
    console.error("[cron] maintenance-check query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!instances || instances.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Fetch all spectrum_admin emails
  const { data: admins } = await admin
    .from("profiles")
    .select("email, name")
    .eq("role", "spectrum_admin");

  const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean);

  let processed = 0;

  for (const inst of instances) {
    const dueDate = new Date(inst.next_due_date);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    const stationName = (inst.hierarchy_nodes as any)?.name ?? "Unknown Station";
    const equipTypeName = (inst.equipment_types as any)?.name ?? "Equipment";
    const stationEmail = (inst.hierarchy_nodes as any)?.contact_email;

    const urgency = diffDays === 0 ? "today" : diffDays <= 3 ? "3 days" : "7 days";

    // Insert in-app notification
    const notifMsg = `Maintenance due ${urgency === "today" ? "TODAY" : `in ${urgency}`}: ${equipTypeName} — ${inst.name} at ${stationName} Substation (Due: ${inst.next_due_date})`;

    await admin.from("notifications").insert({
      type: "maintenance_due",
      message: notifMsg,
      target_role: "spectrum_admin",
      station_id: inst.station_id,
    }).then(({ error: ne }) => {
      if (ne) console.warn("[cron] notification insert failed:", ne.message);
    });

    // Also notify the AE at this station
    const { data: aeProfiles } = await admin
      .from("profiles")
      .select("email, name")
      .eq("role", "account_executive")
      .eq("station_id", inst.station_id);

    const aeEmails = (aeProfiles ?? []).map((p) => p.email).filter(Boolean);

    // Collect all recipients: admins + AEs at this station + station contact if set
    const recipients = [...new Set([
      ...adminEmails,
      ...aeEmails,
      ...(stationEmail ? [stationEmail] : []),
    ])];

    if (recipients.length > 0) {
      const { subject, html } = maintenanceDueEmail({
        instanceName: inst.name,
        equipmentType: equipTypeName,
        stationName,
        serialNumber: inst.serial_number ?? undefined,
        lastMaintenanceDate: inst.last_maintenance_date ?? undefined,
        nextDueDate: inst.next_due_date,
        daysRemaining: diffDays,
        appUrl,
      });

      await sendEmail({ to: recipients, subject, html }).catch((e) =>
        console.warn("[cron] maintenance email failed:", e)
      );
    }

    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
