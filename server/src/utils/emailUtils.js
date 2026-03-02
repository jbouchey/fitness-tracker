const nodemailer = require('nodemailer');
const { GMAIL_USER, GMAIL_APP_PASSWORD } = require('../config/env');

const transporter = (GMAIL_USER && GMAIL_APP_PASSWORD)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

async function sendEmail(to, subject, html) {
  if (!transporter) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[Email — no Gmail credentials configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: `TrailTracker <${GMAIL_USER}>`, to, subject, html });
}

module.exports = { sendEmail };
