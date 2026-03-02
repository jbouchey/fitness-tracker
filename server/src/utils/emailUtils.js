const { Resend } = require('resend');
const { RESEND_API_KEY } = require('../config/env');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendEmail(to, subject, html) {
  if (!resend) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[Email — no Resend API key configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await resend.emails.send({
    from: 'TrailTracker <noreply@notifications.sierradegroff.com>',
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };
