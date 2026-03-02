const { Resend } = require('resend');
const { RESEND_API_KEY, SMTP_FROM } = require('../config/env');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendEmail(to, subject, html) {
  if (!resend) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[Email — no RESEND_API_KEY configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: SMTP_FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

module.exports = { sendEmail };
