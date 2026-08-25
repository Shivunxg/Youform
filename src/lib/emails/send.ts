// Server-only — never import in client components.
// Requires RESEND_API_KEY environment variable.
// Set EMAIL_FROM to override the sender address (default: noreply@spectrumconsultants.co.in)

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not set — email skipped. Add it to .env.local and Vercel env vars.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.EMAIL_FROM ?? "KTPCL SIMMS <noreply@spectrumconsultants.co.in>";
  const to   = Array.isArray(opts.to) ? opts.to : [opts.to];

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Resend error:", body);
    return { success: false, error: body };
  }

  return { success: true };
}
