import { env } from './env.ts';

// DECISION: transactional email goes through Resend's HTTP API (free tier). The provider is
// only used here, so switching (Brevo, SES, SMTP relay) means rewriting this one function.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const key = env('EMAIL_API_KEY');
  const from = env('EMAIL_FROM');
  if (!key || !from) throw new Error('email_not_configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });
  if (!res.ok) throw new Error(`email_failed_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
