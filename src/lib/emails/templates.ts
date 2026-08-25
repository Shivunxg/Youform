import { baseLayout, btn, statusPill, divider, infoRow, h1, p } from "./base";

const STATUS_LABEL: Record<string, string> = {
  quotation_shared:    "Quotation Shared",
  order_received:      "Order Received",
  offer_dropped:       "Offer Dropped",
  order_lost:          "Order Lost",
  supply_service_given:"Supply / Service Given",
  bills_submitted:     "Bills Submitted & Work Completed",
  payment_received:    "Payment Received",
};

const STATUS_COLOR: Record<string, "blue" | "amber" | "green" | "red" | "slate"> = {
  quotation_shared:     "blue",
  order_received:       "amber",
  offer_dropped:        "red",
  order_lost:           "red",
  supply_service_given: "amber",
  bills_submitted:      "amber",
  payment_received:     "green",
};

const PRIORITY_COLOR: Record<string, "blue" | "amber" | "red" | "slate"> = {
  low:      "slate",
  medium:   "blue",
  high:     "amber",
  critical: "red",
};

// ── 1. User Invitation ──────────────────────────────────────────────────────
export interface UserInvitationData {
  name: string;
  email: string;
  role: string;
  stationName?: string | null;
  inviteLink: string;
}

const ROLE_LABEL: Record<string, string> = {
  spectrum_admin:    "Spectrum Admin",
  account_executive: "Account Executive",
  service_engineer:  "Service Engineer",
  kptcl_engineer:    "KPTCL Engineer",
};

const ROLE_PORTAL: Record<string, string> = {
  spectrum_admin:    "Admin Portal",
  account_executive: "Account Executive Portal",
  service_engineer:  "Service Engineer Portal",
  kptcl_engineer:    "KPTCL Engineer Portal",
};

export function userInvitationEmail(data: UserInvitationData): { subject: string; html: string } {
  const roleLabel   = ROLE_LABEL[data.role]   ?? data.role;
  const portalLabel = ROLE_PORTAL[data.role]  ?? "Portal";

  const content = `
    ${h1(`Welcome to KTPCL SIMMS, ${data.name}!`)}
    ${p(`You have been invited to join <strong>Spectrum Consultants' KTPCL Substation Inventory &amp; Maintenance Management System</strong> as a <strong>${roleLabel}</strong>.`)}
    ${p("Click the button below to accept your invitation and set your password. The link is valid for <strong>24 hours</strong>.", true)}

    ${btn("Accept Invitation &amp; Set Password", data.inviteLink)}

    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${infoRow("Your email",  data.email)}
      ${infoRow("Your role",   roleLabel)}
      ${data.stationName ? infoRow("Assigned to", data.stationName) : ""}
      ${infoRow("Portal",      portalLabel)}
    </table>
    ${divider()}

    ${p(`If the button above doesn't work, copy and paste this link into your browser:`, true)}
    <p style="margin:0 0 16px;word-break:break-all;font-size:12px;color:#2563EB;font-family:monospace;">${data.inviteLink}</p>

    ${p(`If you did not request this invitation, you can safely ignore this email.`, true)}
  `;

  return {
    subject: `You're invited to KTPCL SIMMS — ${roleLabel}`,
    html:    baseLayout(content, `You've been invited to join Spectrum Consultants' KTPCL SIMMS as a ${roleLabel}.`),
  };
}

// ── 2. Password Reset ────────────────────────────────────────────────────────
export interface PasswordResetData {
  name?: string | null;
  resetLink: string;
}

export function passwordResetEmail(data: PasswordResetData): { subject: string; html: string } {
  const greeting = data.name ? `Hi ${data.name},` : "Hello,";

  const content = `
    ${h1("Reset your password")}
    ${p(greeting)}
    ${p("We received a request to reset the password for your KTPCL SIMMS account. Click the button below to choose a new password.")}
    ${p("This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email — your password will not change.", true)}

    ${btn("Reset My Password", data.resetLink)}

    ${divider()}
    ${p("If the button above doesn't work, copy and paste this link:", true)}
    <p style="margin:0 0 16px;word-break:break-all;font-size:12px;color:#2563EB;font-family:monospace;">${data.resetLink}</p>

    <table style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;width:100%;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:top;padding-right:10px;font-size:16px;">⚠️</td>
        <td>
          <p style="margin:0;color:#92400E;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Never share this link with anyone. Spectrum Consultants staff will never ask you for this link.</p>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: "Reset your KTPCL SIMMS password",
    html:    baseLayout(content, "Click to reset your KTPCL SIMMS account password. Link expires in 1 hour."),
  };
}

// ── 3. Job Card Assigned ─────────────────────────────────────────────────────
export interface JobCardAssignedData {
  engineerName: string;
  jobCardNumber: string;
  stationName: string;
  voltageClass?: string | null;
  equipmentType?: string | null;
  issueDescription: string;
  priority: string;
  appUrl: string;
}

export function jobCardAssignedEmail(data: JobCardAssignedData): { subject: string; html: string } {
  const priorityLabel = data.priority.charAt(0).toUpperCase() + data.priority.slice(1);
  const subtitle = [data.voltageClass, data.equipmentType].filter(Boolean).join(" · ");

  const content = `
    ${h1("You've been assigned a job card")}
    ${p(`Hi ${data.engineerName},`)}
    ${p(`A new job card has been assigned to you at <strong>${data.stationName}</strong>. Please review the details and attend to this at the earliest.`)}

    <table style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">JOB CARD</p>
          <p style="margin:0 0 12px;color:#0F172A;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">${data.jobCardNumber}</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            ${infoRow("Station", data.stationName)}
            ${subtitle ? infoRow("Equipment", subtitle) : ""}
            ${infoRow("Issue", data.issueDescription)}
            ${infoRow("Priority", `<span style="${getPriorityStyle(data.priority)}">${priorityLabel}</span>`)}
          </table>
        </td>
      </tr>
    </table>

    ${btn("View Job Card", `${data.appUrl}/se/job-cards`)}
    ${p("Please log in to the Service Engineer portal to see full details, update status, and upload any Minutes of Meeting.", true)}
  `;

  return {
    subject: `Assigned: Job Card ${data.jobCardNumber} — ${data.stationName}`,
    html:    baseLayout(content, `You've been assigned to job card ${data.jobCardNumber} at ${data.stationName}.`),
  };
}

// ── 4. Job Card Status Changed ───────────────────────────────────────────────
export interface JobCardStatusChangedData {
  recipientName: string;
  jobCardNumber: string;
  stationName: string;
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  appUrl: string;
  role?: string;
}

export function jobCardStatusChangedEmail(data: JobCardStatusChangedData): { subject: string; html: string } {
  const fromLabel = STATUS_LABEL[data.fromStatus] ?? data.fromStatus;
  const toLabel   = STATUS_LABEL[data.toStatus]   ?? data.toStatus;
  const portalPath = data.role === "kptcl_engineer" ? "/kptcl/job-cards" : "/ae/job-cards";

  const content = `
    ${h1("Job card status updated")}
    ${p(`Hi ${data.recipientName},`)}
    ${p(`The status of job card <strong>${data.jobCardNumber}</strong> at <strong>${data.stationName}</strong> has been updated.`)}

    <table style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:0 20px 0 0;">
          <p style="margin:0 0 6px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">FROM</p>
          ${statusPill(fromLabel, STATUS_COLOR[data.fromStatus] ?? "slate")}
        </td>
        <td align="center" style="color:#94A3B8;font-size:20px;">→</td>
        <td align="center" style="padding:0 0 0 20px;">
          <p style="margin:0 0 6px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">TO</p>
          ${statusPill(toLabel, STATUS_COLOR[data.toStatus] ?? "blue")}
        </td>
      </tr>
    </table>

    ${data.note ? `<table style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#1E40AF;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Note</p>
          <p style="margin:0;color:#1E3A8A;font-size:13px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${data.note}</p>
        </td>
      </tr>
    </table>` : ""}

    ${btn("View Job Card", `${data.appUrl}${portalPath}`)}
  `;

  return {
    subject: `Status updated: ${data.jobCardNumber} → ${toLabel}`,
    html:    baseLayout(content, `Job card ${data.jobCardNumber} moved from ${fromLabel} to ${toLabel}.`),
  };
}

// ── 5. KPTCL Acknowledgement Required ────────────────────────────────────────
export interface KPTCLAckRequiredData {
  engineerName: string;
  jobCardNumber: string;
  stationName: string;
  equipmentType?: string | null;
  voltageClass?: string | null;
  issueDescription: string;
  appUrl: string;
}

export function kptclAckRequiredEmail(data: KPTCLAckRequiredData): { subject: string; html: string } {
  const subtitle = [data.voltageClass, data.equipmentType].filter(Boolean).join(" · ");

  const content = `
    ${h1("Work completion — your acknowledgement is required")}
    ${p(`Hi ${data.engineerName},`)}
    ${p(`Spectrum Consultants has completed service work at <strong>${data.stationName}</strong>. As the KPTCL engineer for this station, your digital acknowledgement is required before the invoice can be raised.`)}

    <table style="background-color:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:0 10px 10px 0;padding:16px 20px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#92400E;font-size:12px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">⏳ Action required from you</p>
          <p style="margin:0;color:#78350F;font-size:13px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Please review the completed work and submit your acknowledgement in the KPTCL portal.</p>
        </td>
      </tr>
    </table>

    <table style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px 24px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">JOB CARD</p>
          <p style="margin:0 0 12px;color:#0F172A;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">${data.jobCardNumber}</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            ${infoRow("Station", data.stationName)}
            ${subtitle ? infoRow("Equipment", subtitle) : ""}
            ${infoRow("Work done", data.issueDescription)}
          </table>
        </td>
      </tr>
    </table>

    ${btn("Acknowledge Work Completion", `${data.appUrl}/kptcl/job-cards`)}
    ${p("Log in to the KPTCL Engineer portal, open this job card, and click <strong>Acknowledge Work Completion</strong>. You can add notes before submitting.", true)}
  `;

  return {
    subject: `Action required: Acknowledge work at ${data.stationName} — ${data.jobCardNumber}`,
    html:    baseLayout(content, `Work completed at ${data.stationName}. Your acknowledgement is required to proceed with billing.`),
  };
}

// ── 6. Proposal Shared ────────────────────────────────────────────────────────
export interface ProposalSharedData {
  clientName: string;
  proposalNumber: string;
  title: string;
  total: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  validityDays: number;
  scopeOfWork?: string | null;
  appUrl: string;
  createdByName?: string | null;
}

export function proposalSharedEmail(data: ProposalSharedData): { subject: string; html: string } {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + data.validityDays);
  const validUntilStr = validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const content = `
    ${h1(`Proposal from Spectrum Consultants`)}
    ${p(`Dear ${data.clientName},`)}
    ${p(`Spectrum Consultants is pleased to share a proposal for your review. Please find the summary below. The full proposal document is available via the link below.`)}

    <table style="background-color:#0B1A3D;border-radius:12px;padding:24px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 4px;color:#93C5FD;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">PROPOSAL NO.</p>
          <p style="margin:0 0 20px;color:#ffffff;font-size:22px;font-weight:700;font-family:'Courier New',monospace;">${data.proposalNumber}</p>
          <p style="margin:0 0 4px;color:#93C5FD;font-size:11px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Subject</p>
          <p style="margin:0 0 20px;color:#E2E8F0;font-size:14px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${data.title}</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td>
                      <p style="margin:0 0 2px;color:#93C5FD;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Subtotal</p>
                      <p style="margin:0 0 2px;color:#93C5FD;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">GST (${data.taxPercent}%)</p>
                      <p style="margin:8px 0 0;color:#ffffff;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Total Amount</p>
                    </td>
                    <td align="right">
                      <p style="margin:0 0 2px;color:#E2E8F0;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">₹${data.subtotal.toLocaleString("en-IN")}</p>
                      <p style="margin:0 0 2px;color:#E2E8F0;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">₹${data.taxAmount.toLocaleString("en-IN")}</p>
                      <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">₹${data.total.toLocaleString("en-IN")}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.scopeOfWork ? `<table style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0 0 8px;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Scope of Work</p>
          <p style="margin:0;color:#334155;font-size:13px;line-height:1.7;white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${data.scopeOfWork}</p>
        </td>
      </tr>
    </table>` : ""}

    <table style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;width:100%;margin:0 0 24px;" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <p style="margin:0;color:#1E3A8A;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">This proposal is valid until <strong>${validUntilStr}</strong>. Prices are subject to change after the validity period.</p>
        </td>
      </tr>
    </table>

    ${p(`For any clarifications, please contact ${data.createdByName ?? "Spectrum Consultants"} directly.`)}
    ${p("We look forward to your response.", true)}

    <p style="margin:0;color:#334155;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      Warm regards,<br>
      <strong>${data.createdByName ?? "Spectrum Consultants"}</strong><br>
      <span style="color:#64748B;font-size:12px;">Spectrum Consultants · Bangalore</span>
    </p>
  `;

  return {
    subject: `Proposal ${data.proposalNumber} — ${data.title}`,
    html:    baseLayout(content, `Spectrum Consultants proposal ${data.proposalNumber} for ${data.title}. Total: ₹${data.total.toLocaleString("en-IN")}.`),
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────
function getPriorityStyle(priority: string): string {
  const styles: Record<string, string> = {
    low:      "background-color:#F8FAFC;color:#475569;border:1px solid #E2E8F0;border-radius:6px;font-size:12px;font-weight:600;padding:3px 10px;",
    medium:   "background-color:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;border-radius:6px;font-size:12px;font-weight:600;padding:3px 10px;",
    high:     "background-color:#FFFBEB;color:#B45309;border:1px solid #FDE68A;border-radius:6px;font-size:12px;font-weight:600;padding:3px 10px;",
    critical: "background-color:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;border-radius:6px;font-size:12px;font-weight:600;padding:3px 10px;",
  };
  return styles[priority] ?? styles.low;
}
