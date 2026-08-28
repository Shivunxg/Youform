// @ts-nocheck
// Internal endpoint called by client components to trigger transactional emails.
// Validates the caller is authenticated before sending.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/emails/send";
import {
  jobCardAssignedEmail,
  jobCardUnassignedEmail,
  jobCardStatusChangedEmail,
  kptclAckRequiredEmail,
  proposalSharedEmail,
} from "@/lib/emails/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ktpcl-simms.vercel.app";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type } = body;

  try {
    switch (type) {

      // ── Job card assigned to one or more service engineers
      case "job_card_assigned": {
        const { engineerIds, jobCardNumber, stationName, voltageClass, equipmentType, issueDescription, priority } = body;

        const { data: engineers } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", engineerIds);

        const results = await Promise.allSettled(
          (engineers ?? []).filter((e) => e.email).map((eng) => {
            const { subject, html } = jobCardAssignedEmail({
              engineerName:     eng.name ?? eng.email,
              jobCardNumber,
              stationName,
              voltageClass,
              equipmentType,
              issueDescription,
              priority,
              appUrl: APP_URL,
            });
            return sendEmail({ to: eng.email!, subject, html });
          })
        );

        return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length });
      }

      // ── Engineer removed from a job card
      case "job_card_unassigned": {
        const { engineerIds, jobCardNumber, stationName } = body;

        const { data: engineers } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", engineerIds);

        await Promise.allSettled(
          (engineers ?? []).filter((e) => e.email).map((eng) => {
            const { subject, html } = jobCardUnassignedEmail({
              engineerName: eng.name ?? eng.email,
              jobCardNumber,
              stationName,
              appUrl: APP_URL,
            });
            return sendEmail({ to: eng.email!, subject, html });
          })
        );

        return NextResponse.json({ ok: true });
      }

      // ── Job card status changed — notify all assigned engineers + AE
      case "job_card_status_changed": {
        const { jobCardId, jobCardNumber, stationName, fromStatus, toStatus, note } = body;

        // Fetch assigned engineers + AE for this station
        const [{ data: jceData }, { data: aeData }] = await Promise.all([
          supabase.from("job_card_engineers")
            .select("engineer_id, profiles!engineer_id(name, email)")
            .eq("job_card_id", jobCardId),
          supabase.from("profiles")
            .select("name, email")
            .eq("station_id", body.stationId)
            .eq("role", "account_executive")
            .eq("status", "active"),
        ]);

        const recipients: { name: string; email: string; role?: string }[] = [
          ...(jceData ?? []).map((j) => ({
            name:  (j.profiles as any)?.name  ?? "Engineer",
            email: (j.profiles as any)?.email ?? "",
          })),
          ...(aeData ?? []).map((a) => ({ name: a.name ?? "AE", email: a.email ?? "", role: "ae" })),
        ].filter((r) => r.email);

        await Promise.allSettled(
          recipients.map((r) => {
            const { subject, html } = jobCardStatusChangedEmail({
              recipientName: r.name,
              jobCardNumber,
              stationName,
              fromStatus,
              toStatus,
              note,
              appUrl: APP_URL,
              role:   r.role,
            });
            return sendEmail({ to: r.email, subject, html });
          })
        );

        return NextResponse.json({ ok: true });
      }

      // ── KPTCL acknowledgement required (triggered when status → supply_service_given)
      case "kptcl_ack_required": {
        const { stationId, jobCardNumber, stationName, voltageClass, equipmentType, issueDescription } = body;

        const { data: kptclEngineers } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("role", "kptcl_engineer")
          .eq("station_id", stationId)
          .eq("status", "active");

        await Promise.allSettled(
          (kptclEngineers ?? []).filter((e) => e.email).map((eng) => {
            const { subject, html } = kptclAckRequiredEmail({
              engineerName:     eng.name ?? eng.email,
              jobCardNumber,
              stationName,
              voltageClass,
              equipmentType,
              issueDescription,
              appUrl: APP_URL,
            });
            return sendEmail({ to: eng.email!, subject, html });
          })
        );

        return NextResponse.json({ ok: true });
      }

      // ── Proposal shared with client (called when status changes to "sent")
      case "proposal_shared": {
        const { proposalId, recipientEmail } = body;

        const { data: proposal } = await supabase
          .from("proposals")
          .select("*, profiles!created_by(name)")
          .eq("id", proposalId)
          .single();

        if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

        const { subject, html } = proposalSharedEmail({
          clientName:    proposal.client_name,
          proposalNumber: proposal.proposal_number,
          title:          proposal.title,
          total:          proposal.total,
          subtotal:       proposal.subtotal,
          taxPercent:     proposal.tax_percent,
          taxAmount:      proposal.tax_amount,
          validityDays:   proposal.validity_days,
          scopeOfWork:    proposal.scope_of_work,
          appUrl:         APP_URL,
          createdByName:  (proposal.profiles as any)?.name ?? null,
        });

        await sendEmail({ to: recipientEmail, subject, html });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[email/notify] error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
