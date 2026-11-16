#!/usr/bin/env node
// Sends one week's newsletter through Resend, scheduled for that Monday at 6am Chicago time.
//
//   npm run build
//   RESEND_API_KEY=... RESEND_SEGMENT_ID=... node scripts/send-newsletter.mjs 2026-11-16 [--dry-run]
//
// Reads the built email at dist/email/<monday>/index.html (src/pages/email/[week].astro).
// - Skips a week that has already ended, so merging an old week never emails anyone.
// - If 6am Monday has already passed (merged late), it sends right away instead.
// - Without RESEND_API_KEY / RESEND_SEGMENT_ID it explains and exits cleanly, so merges before setup are harmless.
// Run by .github/workflows/newsletter.yml when a new file appears in src/content/weeks/.

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const args = process.argv.slice(2);
const week = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const dryRun = args.includes('--dry-run');
if (!week) {
  console.error('Usage: node scripts/send-newsletter.mjs YYYY-MM-DD [--dry-run]');
  process.exit(1);
}

const md = await readFile(`src/content/weeks/${week}.md`, 'utf8');
const fm = parse(md.split(/^---$/m)[1]);
let html = await readFile(`dist/email/${week}/index.html`, 'utf8');

// CAN-SPAM wants a postal address in every email; it lives in a secret, not the repo.
const postal = process.env.NEWSLETTER_POSTAL_ADDRESS?.trim();
html = html.replace('%%POSTAL_ADDRESS%%', postal ? escapeHtml(postal) : '');
if (!postal) console.warn('::warning::NEWSLETTER_POSTAL_ADDRESS is not set; the email has no postal address.');

// 6:00 in Chicago on the week's Monday, whichever of CST/CDT applies that day.
function chicago6am(day) {
  for (const off of ['-06:00', '-05:00']) {
    const t = new Date(`${day}T06:00:00${off}`);
    const h = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(t);
    if (Number(h) === 6) return t;
  }
  throw new Error('Could not work out Chicago time');
}
const sendAt = chicago6am(week);
const weekEnds = new Date(sendAt.getTime() + 7 * 24 * 3600 * 1000);
const now = new Date();
if (now >= weekEnds) {
  console.log(`Week of ${week} has already ended; not sending.`);
  process.exit(0);
}
const late = sendAt.getTime() - now.getTime() < 5 * 60 * 1000;

const body = {
  segment_id: process.env.RESEND_SEGMENT_ID,
  from: process.env.NEWSLETTER_FROM || 'James at Split Decisions <newsletter@splitdecisionscoach.com>',
  reply_to: process.env.NEWSLETTER_REPLY_TO || undefined,
  subject: `This week: ${fm.title}`,
  name: `Week of ${week}`,
  html,
  send: true,
  ...(late ? {} : { scheduled_at: sendAt.toISOString() }),
};

console.log(`Subject: ${body.subject}`);
console.log(late ? 'Sending now (6am Monday has passed).' : `Scheduled for ${sendAt.toISOString()} (6:00 Chicago).`);
if (dryRun) {
  console.log('Dry run: nothing sent.');
  process.exit(0);
}
if (!process.env.RESEND_API_KEY || !process.env.RESEND_SEGMENT_ID) {
  console.log('::notice::RESEND_API_KEY or RESEND_SEGMENT_ID is not set, so no newsletter was sent. The site still deployed.');
  process.exit(0);
}

const res = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error(`Resend said ${res.status}: ${text}`);
  process.exit(1);
}
console.log(`Broadcast created: ${JSON.parse(text).id}`);

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]).replace(/\n/g, '<br />');
}
