import { logger } from './logger.js';
const FROM = `${process.env.EMAIL_FROM_NAME ?? 'FormFlow'} <${process.env.EMAIL_FROM ?? 'noreply@formflow.io'}>`;
async function send({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) { logger.info('Email skipped', { to }); return; }
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) logger.error('Email failed', { error });
}
export const emailService = {
  sendWorkspaceInvite: ({ email, inviterName, workspaceName, inviteUrl, role }) => send({ to: email, subject: `${inviterName} invited you to ${workspaceName}`, html: `<p>You have been invited as <b>${role}</b>. <a href="${inviteUrl}">Accept invite</a></p>` }),
  sendNewResponseNotification: ({ to, formTitle, formUrl, responseCount }) => send({ to, subject: `New response to "${formTitle}"`, html: `<p>You have ${responseCount} response(s). <a href="${formUrl}">View</a></p>` }),
  sendRespondentConfirmation: ({ to, subject, body, formTitle }) => send({ to, subject: subject ?? `Thanks for filling out ${formTitle}`, html: body ?? `<p>Your response has been recorded.</p>` }),
};
