import { Resend } from 'resend';
import { logger } from '../lib/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.EMAIL_FROM_NAME ?? 'FormFlow'} <${process.env.EMAIL_FROM ?? 'noreply@formflow.io'}>`;

export const emailService = {

  async sendWorkspaceInvite({ email, inviterName, workspaceName, inviteUrl, role }) {
    return send({
      to: email,
      subject: `${inviterName} invited you to join ${workspaceName} on FormFlow`,
      html: `
        <h2>You're invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.</p>
        <p><a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        <p style="color:#888;font-size:13px;">This invite expires in 7 days.</p>
      `,
    });
  },

  async sendNewResponseNotification({ to, formTitle, formUrl, responseCount }) {
    return send({
      to,
      subject: `New response to "${formTitle}"`,
      html: `
        <h2>New response received 🎉</h2>
        <p>Someone just submitted a response to your form <strong>${formTitle}</strong>.</p>
        <p>You now have <strong>${responseCount}</strong> response${responseCount !== 1 ? 's' : ''}.</p>
        <p><a href="${formUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Responses</a></p>
      `,
    });
  },

  async sendRespondentConfirmation({ to, subject, body, formTitle }) {
    return send({
      to,
      subject: subject ?? `Thanks for your response to ${formTitle}`,
      html: body ?? `<p>Thank you for filling out <strong>${formTitle}</strong>. Your response has been recorded.</p>`,
    });
  },

  async sendPlanUpgradeConfirmation({ to, plan, workspaceName }) {
    return send({
      to,
      subject: `Welcome to FormFlow ${plan}! 🚀`,
      html: `
        <h2>You're on FormFlow ${plan}!</h2>
        <p>Your workspace <strong>${workspaceName}</strong> has been upgraded to the <strong>${plan}</strong> plan.</p>
        <p><a href="${process.env.APP_URL}/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Go to Dashboard</a></p>
      `,
    });
  },
};

async function send({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      logger.error('Email send failed', { error, to, subject });
      return { success: false, error };
    }
    logger.debug('Email sent', { id: data.id, to, subject });
    return { success: true, id: data.id };
  } catch (err) {
    logger.error('Email service error', { err, to, subject });
    return { success: false, error: err.message };
  }
}
