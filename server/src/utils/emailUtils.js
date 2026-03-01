const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = require('../config/env');

function createTransport() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendEmail(to, subject, html) {
  const transport = createTransport();
  if (!transport) {
    // No SMTP configured — print to console so devs can grab the link
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[Email — no SMTP configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: SMTP_FROM, to, subject, html });
}

module.exports = { sendEmail };
