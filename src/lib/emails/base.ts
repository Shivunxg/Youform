// Base layout shared by all email templates
export function baseLayout(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    *,::after,::before{box-sizing:border-box}
    img{border:0;max-width:100%;height:auto;vertical-align:middle}
    @media (max-width:600px){
      .email-body{padding:16px !important}
      .card{border-radius:12px !important}
      .content-pad{padding:28px 24px !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;word-break:break-word;-webkit-font-smoothing:antialiased;background-color:#F1F5F9;">

  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>` : ""}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="email-body" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td class="card" style="background-color:#0B1A3D;border-radius:16px 16px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;vertical-align:middle;">
                          <span style="color:#93C5FD;font-size:16px;font-weight:700;letter-spacing:-0.5px;">⚡</span>
                        </td>
                        <td style="padding-left:10px;vertical-align:middle;">
                          <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">KTPCL SIMMS</p>
                          <p style="margin:2px 0 0;color:#93C5FD;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Spectrum Consultants</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <p style="margin:0;color:#475569;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Substation Inventory &amp;<br>Maintenance Management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
              <div class="content-pad" style="padding:40px;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="card" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;">
              <p style="margin:0 0 6px;color:#94A3B8;font-size:12px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                This email was sent by <strong style="color:#64748B;">Spectrum Consultants</strong> via KTPCL SIMMS.
              </p>
              <p style="margin:0;color:#CBD5E1;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                If you did not expect this email, you can safely ignore it. Do not share your login link with anyone.
              </p>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function btn(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td style="background-color:#2563EB;border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.1px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

export function statusPill(label: string, color: "blue" | "amber" | "green" | "red" | "slate"): string {
  const styles: Record<string, string> = {
    blue:  "background-color:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;",
    amber: "background-color:#FFFBEB;color:#B45309;border:1px solid #FDE68A;",
    green: "background-color:#F0FDF4;color:#15803D;border:1px solid #BBF7D0;",
    red:   "background-color:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;",
    slate: "background-color:#F8FAFC;color:#475569;border:1px solid #E2E8F0;",
  };
  return `<span style="${styles[color]}border-radius:6px;font-size:12px;font-weight:600;padding:3px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</span>`;
}

export function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
    <tr><td style="border-top:1px solid #F1F5F9;height:1px;"></td></tr>
  </table>`;
}

export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;width:140px;">
      <p style="margin:0;color:#94A3B8;font-size:12px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</p>
    </td>
    <td style="padding:8px 0;vertical-align:top;">
      <p style="margin:0;color:#1E293B;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${value}</p>
    </td>
  </tr>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;color:#0F172A;font-size:22px;font-weight:700;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${text}</h1>`;
}

export function p(text: string, muted = false): string {
  const color = muted ? "#64748B" : "#334155";
  return `<p style="margin:0 0 16px;color:${color};font-size:14px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${text}</p>`;
}
