// Split Decisions Worker. Serves the static site from dist/ (ASSETS) and handles the newsletter signup:
//
//   POST /api/subscribe  { email }  -> emails a confirm link (nobody is added until they click it)
//   GET  /api/confirm?t=<token>     -> adds the address to the Resend segment the newsletter goes to
//
// Unsubscribing is handled by Resend through the link in every newsletter ({{{RESEND_UNSUBSCRIBE_URL}}}).
// No database: the confirm token is the email plus a timestamp, signed with SIGNUP_SECRET.
//
// Secrets (Cloudflare dashboard > Worker > Settings > Variables and secrets, type Secret):
//   RESEND_API_KEY, SIGNUP_SECRET, RESEND_SEGMENT_ID, optional NEWSLETTER_REPLY_TO
// Plain variable (wrangler.jsonc "vars"): NEWSLETTER_FROM

const RESEND = 'https://api.resend.com';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/subscribe') return subscribe(request, env, url);
    if (url.pathname === '/api/confirm') return confirm(env, url);
    return env.ASSETS.fetch(request);
  },
};

const redirect = (url, path) => Response.redirect(new URL(path, url.origin).href, 303);
const configured = (env) => env.RESEND_API_KEY && env.SIGNUP_SECRET && env.RESEND_SEGMENT_ID && env.NEWSLETTER_FROM;

async function subscribe(request, env, url) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  if (!configured(env)) return redirect(url, '/newsletter/?error=closed');

  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim().toLowerCase();
  // Honeypot: a field people never see. Bots fill it; pretend it worked.
  if (form?.get('website')) return redirect(url, '/newsletter/check-email/');
  if (!EMAIL_RE.test(email) || email.length > 320) return redirect(url, '/newsletter/?error=email');

  const token = await sign(env, `${email}|${Date.now()}`);
  const link = new URL(`/api/confirm?t=${encodeURIComponent(token)}`, url.origin).href;
  const res = await resend(env, '/emails', {
    from: env.NEWSLETTER_FROM,
    to: [email],
    reply_to: env.NEWSLETTER_REPLY_TO || undefined,
    subject: 'Confirm your Split Decisions signup',
    html: confirmHtml(link),
    text: `Tap to confirm and get the weekly training plan every Monday:\n\n${link}\n\nIf you didn't sign up, ignore this email and nothing happens.`,
  });
  if (!res.ok) {
    console.error('confirm email failed', res.status, await res.text());
    return redirect(url, '/newsletter/?error=send');
  }
  return redirect(url, '/newsletter/check-email/');
}

async function confirm(env, url) {
  if (!configured(env)) return redirect(url, '/newsletter/?error=closed');
  const payload = await verify(env, url.searchParams.get('t') ?? '');
  if (!payload) return redirect(url, '/newsletter/?error=link');
  const [email, ts] = payload.split('|');
  if (!email || !(Date.now() - Number(ts) < TOKEN_TTL_MS)) return redirect(url, '/newsletter/?error=link');

  const segment = env.RESEND_SEGMENT_ID;
  let res = await resend(env, '/contacts', { email, unsubscribed: false, segments: [{ id: segment }] });
  if (!res.ok) {
    // Already a contact (signed up before, or unsubscribed and came back): resubscribe and add to the segment.
    const first = `${res.status} ${await res.text()}`;
    const enc = encodeURIComponent(email);
    const upd = await resend(env, `/contacts/${enc}`, { unsubscribed: false }, 'PATCH');
    const add = await resend(env, `/contacts/${enc}/segments/${segment}`, undefined, 'POST');
    if (!upd.ok && !add.ok) {
      console.error('add contact failed', first, upd.status, add.status);
      return redirect(url, '/newsletter/?error=send');
    }
  }
  return redirect(url, '/newsletter/confirmed/');
}

function resend(env, path, body, method = 'POST') {
  return fetch(`${RESEND}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// --- Signed tokens (HMAC-SHA256, base64url) ---
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const hmacKey = (env) => crypto.subtle.importKey('raw', enc.encode(env.SIGNUP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

async function sign(env, payload) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload));
  return `${b64url(enc.encode(payload))}.${b64url(sig)}`;
}
async function verify(env, token) {
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  try {
    const payload = fromB64url(p);
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64url(s), payload);
    return ok ? new TextDecoder().decode(payload) : null;
  } catch {
    return null;
  }
}

function confirmHtml(link) {
  return `<!doctype html><html><body style="margin:0;background:#0E1116;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#F2F4F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#151A21;border:1px solid #262C36;border-radius:10px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px">
<p style="margin:0 0 6px;font:600 12px/1 Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#FFB020">Split Decisions</p>
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.15">One tap to confirm</h1>
<p style="margin:0 0 22px;color:#A9B2C0;line-height:1.5">Confirm your email and you'll get my training plan every Monday: the week ahead, why it looks the way it does, and how last week actually went.</p>
<a href="${link}" style="display:inline-block;background:#FFB020;color:#0E1116;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:6px">Confirm my email</a>
<p style="margin:22px 0 0;color:#7D8796;font-size:13px;line-height:1.5">Didn't sign up? Ignore this and nothing happens. The link works for 7 days.</p>
</td></tr></table></td></tr></table></body></html>`;
}
