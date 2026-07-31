import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from './logger.js';
import { supabaseAdmin } from './supabase.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const GLOBAL_FROM_NAME  = process.env.EMAIL_FROM_NAME ?? 'FormFlow';
const GLOBAL_FROM_EMAIL = process.env.EMAIL_FROM       ?? 'noreply@formflowx.com';

// Fetch workspace SMTP config from DB (returns null if not configured)
async function getSmtpConfig(workspaceId) {
  if (!workspaceId) return null;
  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('smtp_settings')
    .eq('id', workspaceId)
    .maybeSingle();
  const s = data?.smtp_settings;
  if (!s?.host || !s?.username || !s?.password) return null;
  return s;
}

// Build a nodemailer transporter from saved settings
function makeTransporter(s) {
  return nodemailer.createTransport({
    host: s.host,
    port: Number(s.port) || 587,
    secure: s.encryption === 'ssl',
    auth: { user: s.username, pass: s.password },
    tls: s.encryption === 'none' ? { rejectUnauthorized: false } : undefined,
  });
}

async function send({ to, subject, html, workspaceId }) {
  // 1. Try workspace SMTP
  const smtp = await getSmtpConfig(workspaceId);
  if (smtp) {
    try {
      const transporter = makeTransporter(smtp);
      await transporter.sendMail({
        from: `${smtp.fromName || GLOBAL_FROM_NAME} <${smtp.fromEmail || smtp.username}>`,
        to, subject, html,
      });
      return;
    } catch (err) {
      logger.error('SMTP send failed, falling back to Resend', { err: err.message });
    }
  }

  // 2. Fallback to Resend
  if (!resend) {
    throw new Error('No email provider configured — set RESEND_API_KEY or configure workspace SMTP settings');
  }
  const { error } = await resend.emails.send({
    from: `${GLOBAL_FROM_NAME} <${GLOBAL_FROM_EMAIL}>`,
    to, subject, html,
  });
  if (error) throw new Error(error.message ?? 'Resend failed to send email');
}

// ── Shared email layout ───────────────────────────────────────
function layout(content, footerNote = 'You are receiving this email because of your activity on Formflow.') {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="padding:32px 16px">
    <div style="max-width:540px;margin:0 auto">

      <!-- Logo -->
      <div style="text-align:center;padding-bottom:20px">
        <span style="display:inline-block;background:#f97316;border-radius:7px;width:30px;height:30px;line-height:30px;text-align:center;font-size:15px;font-weight:800;color:#fff;vertical-align:middle;margin-right:8px">F</span>
        <span style="font-size:16px;font-weight:700;color:#1c1917;vertical-align:middle;letter-spacing:-0.01em">Formflow</span>
      </div>

      <!-- Card -->
      <div style="background:#ffffff;border-radius:10px;padding:36px 40px;border:1px solid #e5e3e0">
        ${content}
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:18px 0 0;font-size:11.5px;color:#a8a29e;line-height:1.7">
        <p style="margin:0">${footerNote}</p>
        <p style="margin:4px 0 0">&copy; ${new Date().getFullYear()} Formflow. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

const H1  = (t) => `<h1 style="font-size:20px;font-weight:700;color:#1c1917;margin:0 0 12px;letter-spacing:-0.02em;line-height:1.3">${t}</h1>`;
const P   = (t) => `<p style="font-size:14.5px;color:#57534e;line-height:1.65;margin:0 0 12px">${t}</p>`;
const BTN = (url, label) => `<a href="${url}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none;margin:20px 0">${label}</a>`;
const HR  = () => `<hr style="border:none;border-top:1px solid #f0efed;margin:22px 0">`;
const SM  = (t) => `<p style="font-size:12px;color:#a8a29e;line-height:1.65;margin:0 0 6px">${t}</p>`;

// ── Templates ─────────────────────────────────────────────────
export const emailService = {
  sendWorkspaceInvite: ({ email, inviterName, workspaceName, inviteUrl, role, workspaceId }) =>
    send({
      to: email,
      subject: `${inviterName} invited you to ${workspaceName}`,
      html: layout(
        H1("You've been invited to join a workspace") +
        P(`<strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong style="text-transform:capitalize">${role}</strong>.`) +
        `<div style="background:#fafaf8;border:1px solid #f0efed;border-radius:8px;padding:14px 18px;margin:18px 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr>
              <td style="font-size:11px;color:#a8a29e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Workspace</td>
              <td style="font-size:11px;color:#a8a29e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;text-align:right">Your role</td>
            </tr>
            <tr>
              <td style="font-size:14px;font-weight:700;color:#1c1917;padding-top:4px">${workspaceName}</td>
              <td style="font-size:14px;font-weight:700;color:#1c1917;padding-top:4px;text-align:right;text-transform:capitalize">${role}</td>
            </tr>
          </table>
        </div>` +
        BTN(inviteUrl, 'Accept invitation →') +
        HR() +
        SM(`This invite expires in <strong>7 days</strong>. You'll need a Formflow account to accept — sign up free if you don't have one yet.`) +
        SM(`Or copy this link into your browser: <span style="color:#f97316;word-break:break-all">${inviteUrl}</span>`),
        `You received this because <strong>${inviterName}</strong> invited you to Formflow.`
      ),
      workspaceId,
    }),

  sendNewResponseNotification: ({ to, formTitle, formUrl, responseCount, workspaceId }) =>
    send({
      to,
      subject: `New response to "${formTitle}"`,
      html: layout(
        H1('You have a new response') +
        P(`Your form <strong>${formTitle}</strong> just received a new submission.`) +
        `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin:20px 0">
          <div style="font-size:11px;color:#c2410c;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Total responses</div>
          <div style="font-size:32px;font-weight:800;color:#f97316;letter-spacing:-0.03em;line-height:1">${responseCount}</div>
          <div style="font-size:12px;color:#9a3412;margin-top:4px">${formTitle}</div>
        </div>` +
        BTN(formUrl, 'View responses →') +
        HR() +
        SM(`To stop receiving these notifications, turn them off in your form settings.`),
        'You received this because you have response notifications enabled on this form.'
      ),
      workspaceId,
    }),

  sendRespondentConfirmation: ({ to, subject, body, formTitle, workspaceId }) =>
    send({
      to,
      subject: subject ?? `Thanks for filling out "${formTitle}"`,
      html: body ?? layout(
        `<div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:52px;height:52px;background:#fff7ed;border-radius:50%;line-height:52px;text-align:center;font-size:22px">✓</div>
        </div>` +
        `<h1 style="font-size:20px;font-weight:700;color:#1c1917;margin:0 0 12px;letter-spacing:-0.02em;text-align:center">We got your response!</h1>` +
        `<p style="font-size:14.5px;color:#57534e;line-height:1.65;margin:0;text-align:center">Thank you for completing <strong>${formTitle}</strong>. Your response has been recorded successfully.</p>` +
        HR() +
        `<p style="font-size:12px;color:#a8a29e;text-align:center;margin:0">Have questions? Reply to this email and we'll get back to you.</p>`,
        'You received this because you submitted a form powered by Formflow.'
      ),
      workspaceId,
    }),
};

// Test a given SMTP config without saving it
export async function testSmtpConnection(config) {
  const transporter = makeTransporter(config);
  await transporter.verify();
}
