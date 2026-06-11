import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  // In dev without SMTP configured, log instead of failing the request.
  if (!process.env.SMTP_USER) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return { dev: true };
  }
  return getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, html });
}

export const otpEmailTemplate = (name, code, minutes) => `
  <div style="font-family:system-ui;max-width:480px;margin:auto">
    <h2>Verify your email</h2>
    <p>Hi ${name || 'there'}, your one-time code is:</p>
    <p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p>
    <p>It expires in ${minutes} minutes.</p>
  </div>`;
