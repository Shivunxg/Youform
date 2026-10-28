const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendSubmissionEmail({ to, formName, submissionData, submissionId }) {
  const rows = Object.entries(submissionData)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, val]) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;width:35%;vertical-align:top;">${key}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${String(val)}</td>
      </tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td>
      <table width="560" align="center" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
        <tr>
          <td style="background:#111111;padding:16px 24px;border-radius:8px 8px 0 0;">
            <span style="color:#C3F53B;font-weight:700;font-size:17px;letter-spacing:-0.3px;">⚡ FormFlowX</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px;">
            <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">New submission</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Form: <strong style="color:#111827;">${formName || 'Untitled form'}</strong></p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
              ${rows}
            </table>
            <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;">Submission ID: ${submissionId} · Sent by FormFlowX</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: 'FormFlowX <noreply@formflowx.com>',
    to: [to],
    subject: `New submission — ${formName || 'Your form'}`,
    html,
  });
}

module.exports = { sendSubmissionEmail };
