import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from './logger.js';
import { supabaseAdmin } from './supabase.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const GLOBAL_FROM_NAME  = process.env.EMAIL_FROM_NAME ?? 'FormFlow';
const GLOBAL_FROM_EMAIL = process.env.EMAIL_FROM       ?? 'noreply@formflow.io';

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
    logger.warn('Email skipped — no workspace SMTP configured and no RESEND_API_KEY set', { to });
    return;
  }
  const { error } = await resend.emails.send({
    from: `${GLOBAL_FROM_NAME} <${GLOBAL_FROM_EMAIL}>`,
    to, subject, html,
  });
  if (error) logger.error('Resend send failed', { error });
}

export const emailService = {
  sendWorkspaceInvite: ({ email, inviterName, workspaceName, inviteUrl, role, workspaceId }) =>
    send({
      to: email,
      subject: `${inviterName} invited you to ${workspaceName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px;font-size:20px">You've been invited to <b>${workspaceName}</b></h2>
          <p style="color:#555;margin:0 0 24px">${inviterName} invited you to join as <b>${role}</b>.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Accept invitation
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px">This link expires in 7 days.</p>
        </div>`,
      workspaceId,
    }),

  sendNewResponseNotification: ({ to, formTitle, formUrl, responseCount, workspaceId }) =>
    send({
      to,
      subject: `New response to "${formTitle}"`,
      html: `<p>You have ${responseCount} response(s) to <b>${formTitle}</b>. <a href="${formUrl}">View responses</a></p>`,
      workspaceId,
    }),

  sendRespondentConfirmation: ({ to, subject, body, formTitle, workspaceId }) =>
    send({
      to,
      subject: subject ?? `Thanks for filling out ${formTitle}`,
      html: body ?? `<p>Your response has been recorded.</p>`,
      workspaceId,
    }),
};

// Test a given SMTP config without saving it
export async function testSmtpConnection(config) {
  const transporter = makeTransporter(config);
  await transporter.verify();
}
