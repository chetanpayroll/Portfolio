/**
 * POST /api/book — dual-email booking notification.
 *
 * Sends TWO emails for every booking request:
 *   1. Chetan  — the full request details
 *   2. Visitor — a branded confirmation
 * Both carry the .ics invite as an attachment.
 *
 * Runs on Vercel's free Hobby tier. The email provider key is read from the
 * RESEND_API_KEY environment variable and never reaches the browser.
 *
 * If RESEND_API_KEY is not configured this returns 503 with success:false, and
 * the client (js/calendar-utils.js -> BookingTransport.submit) silently falls
 * back to the existing Web3Forms path, so booking keeps working either way.
 *
 * Required environment variables (Vercel -> Settings -> Environment Variables):
 *   RESEND_API_KEY   your Resend API key
 *   BOOKING_FROM     optional, defaults to "Booking <booking@chetanpayroll.com>"
 *                    (the domain must be verified in Resend)
 *   BOOKING_TO       optional, defaults to chetanpayroll@gmail.com
 */

const OWNER_NAME = 'Chetan Sharma';
const DEFAULT_TO = 'chetanpayroll@gmail.com';
const DEFAULT_FROM = 'Booking <booking@chetanpayroll.com>';
const SITE = 'https://www.chetanpayroll.com';

/* ---------- helpers ---------- */

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isEmail(value) {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function clamp(value, max) {
    return String(value == null ? '' : value).slice(0, max);
}

function shell(innerHtml) {
    // Inline styles only — email clients ignore external CSS.
    return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#241D1F;">
    <div style="background:linear-gradient(135deg,#E11D48 0%,#7F1027 100%);padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${escapeHtml(OWNER_NAME)}</h1>
      <p style="margin:4px 0 0;color:#ffffff;opacity:.85;font-size:13px;">Global Payroll Transformation Manager</p>
    </div>
    <div style="border:1px solid #E6E0E1;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      ${innerHtml}
    </div>
    <p style="text-align:center;color:#6E6164;font-size:12px;margin-top:16px;">
      Sent from <a href="${SITE}" style="color:#D11149;">chetanpayroll.com</a>
    </p>
  </div>`;
}

function detailRows(b) {
    const row = (k, v) => v
        ? `<tr><td style="padding:6px 12px 6px 0;color:#6E6164;font-size:13px;">${escapeHtml(k)}</td>
             <td style="padding:6px 0;font-size:14px;"><strong>${escapeHtml(v)}</strong></td></tr>`
        : '';
    return `<table style="width:100%;border-collapse:collapse;">
      ${row('Date', b.date)}
      ${row('Time', b.time)}
      ${row('Timezone', b.timezone)}
      ${row('Name', b.name)}
      ${row('Email', b.email)}
      ${row('Phone', b.phone)}
      ${row('Company', b.company)}
      ${row('Topic', b.topic)}
    </table>`;
}

async function sendEmail(apiKey, message) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
}

/* ---------- handler ---------- */

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        // Not configured yet — tell the client to use its fallback.
        return res.status(503).json({ success: false, error: 'not_configured' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ success: false, error: 'invalid_body' });
    }

    const booking = {
        name: clamp(body.name, 120).trim(),
        email: clamp(body.email, 200).trim(),
        phone: clamp(body.phone, 60).trim(),
        company: clamp(body.company, 160).trim(),
        topic: clamp(body.topic, 300).trim(),
        date: clamp(body.date, 80).trim(),
        time: clamp(body.time, 40).trim(),
        timezone: clamp(body.timezone, 80).trim(),
        source: clamp(body.source, 80).trim()
    };

    if (!booking.name || !isEmail(booking.email) || !booking.date || !booking.time) {
        return res.status(400).json({ success: false, error: 'missing_fields' });
    }

    const from = process.env.BOOKING_FROM || DEFAULT_FROM;
    const to = process.env.BOOKING_TO || DEFAULT_TO;

    const attachments = [];
    if (typeof body.ics === 'string' && body.ics.length && body.ics.length < 20000) {
        attachments.push({
            filename: 'meeting-with-chetan-sharma.ics',
            content: Buffer.from(body.ics, 'utf8').toString('base64')
        });
    }

    const slot = `${booking.date} at ${booking.time}${booking.timezone ? ` (${booking.timezone})` : ''}`;

    // 1) Notify Chetan
    const ownerEmail = {
        from,
        to: [to],
        reply_to: booking.email,
        subject: `New meeting request — ${booking.name} · ${booking.date}`,
        html: shell(`
      <h2 style="margin:0 0 12px;font-size:17px;">New meeting request</h2>
      <p style="margin:0 0 16px;color:#3A3032;font-size:14px;">
        <strong>${escapeHtml(booking.name)}</strong> requested a meeting for <strong>${escapeHtml(slot)}</strong>.
      </p>
      ${detailRows(booking)}
      <p style="margin:20px 0 0;font-size:13px;color:#6E6164;">
        Reply directly to this email to reach ${escapeHtml(booking.name)}.
        ${booking.source ? `<br>Source: ${escapeHtml(booking.source)}` : ''}
      </p>
    `),
        attachments
    };

    // 2) Confirm to the visitor
    const visitorEmail = {
        from,
        to: [booking.email],
        reply_to: to,
        subject: `Your meeting request with ${OWNER_NAME} — ${booking.date}`,
        html: shell(`
      <h2 style="margin:0 0 12px;font-size:17px;">Thanks, ${escapeHtml(booking.name.split(' ')[0])} — request received</h2>
      <p style="margin:0 0 16px;color:#3A3032;font-size:14px;">
        Your meeting request has been sent to ${escapeHtml(OWNER_NAME)}. He will confirm shortly by email.
      </p>
      <div style="background:#FAF8F8;border:1px solid #E6E0E1;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;color:#6E6164;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Requested slot</p>
        <p style="margin:0;font-size:16px;"><strong>${escapeHtml(slot)}</strong></p>
      </div>
      ${attachments.length ? `<p style="margin:0 0 16px;font-size:14px;color:#3A3032;">
        The calendar invite is attached — open it to add the meeting to your calendar.
      </p>` : ''}
      <p style="margin:0;font-size:13px;color:#6E6164;">
        Need to change something? Just reply to this email.
      </p>
    `),
        attachments
    };

    try {
        // Chetan's notification is the one that must not be lost, so send it
        // first and fail loudly if it does not go out.
        await sendEmail(apiKey, ownerEmail);
    } catch (err) {
        console.error('[api/book] owner email failed:', err.message);
        return res.status(502).json({ success: false, error: 'send_failed' });
    }

    let visitorNotified = true;
    try {
        await sendEmail(apiKey, visitorEmail);
    } catch (err) {
        // The request is already safely with Chetan; don't fail the booking.
        console.error('[api/book] visitor email failed:', err.message);
        visitorNotified = false;
    }

    return res.status(200).json({ success: true, ownerNotified: true, visitorNotified });
};
