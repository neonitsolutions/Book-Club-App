import { MailMessage } from '../mail/mail.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function verificationEmail(
  to: string,
  name: string,
  link: string,
): MailMessage {
  const firstName = name.split(' ')[0];
  return {
    to,
    subject: 'Activate your Readers Club account',
    text: [
      `Hi ${firstName},`,
      '',
      'Welcome to Readers Club. Open this link to activate your account:',
      link,
      '',
      'The link works once and expires in 24 hours.',
      'If you did not sign up, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 8px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#b45309">Readers Club</p>
        <h1 style="margin:0 0 16px;font-size:24px">Activate your account</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:24px">Hi ${escapeHtml(firstName)}, welcome to Readers Club. Click the button to confirm your email address and activate your account.</p>
        <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Activate account</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#475569">Or paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${escapeHtml(link)}" style="color:#b45309">${escapeHtml(link)}</a></p>
        <p style="margin:0;font-size:13px;color:#64748b">The link works once and expires in 24 hours. If you did not sign up, you can ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  };
}
