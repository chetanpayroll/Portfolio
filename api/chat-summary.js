/**
 * POST /api/chat-summary — emails a chat transcript to the visitor.
 *
 * Mirrors api/book.js: Resend key lives in the RESEND_API_KEY environment
 * variable, never in the browser. When the key is absent this returns 503
 * with success:false and the client falls back to a local download, so the
 * feature degrades gracefully instead of breaking.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY   Resend API key (required for email delivery)
 *   BOOKING_FROM     optional, defaults to "Booking <booking@chetanpayroll.com>"
 */

const DEFAULT_FROM = 'Booking <booking@chetanpayroll.com>';
const SITE = 'https://www.chetanpayroll.com';

function escapeHtml(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isEmail(v) {
    return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ success: false, error: 'not_configured' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!body || !isEmail(body.email) || typeof body.transcript !== 'string' ||
        !body.transcript.trim() || body.transcript.length > 50000) {
        return res.status(400).json({ success: false, error: 'invalid_request' });
    }

    const email = body.email.trim();
    const transcript = body.transcript.trim();

    const message = {
        from: process.env.BOOKING_FROM || DEFAULT_FROM,
        to: [email],
        subject: 'Your conversation with Chetan Sharma\'s AI Assistant',
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#241D1F;">
      <div style="background:linear-gradient(135deg,#E11D48 0%,#7F1027 100%);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">Chetan Sharma</h1>
        <p style="margin:4px 0 0;color:#ffffff;opacity:.85;font-size:13px;">Global Payroll Transformation Manager</p>
      </div>
      <div style="border:1px solid #E6E0E1;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#3A3032;">Here's a copy of your conversation, as requested.</p>
        <pre style="white-space:pre-wrap;background:#FAF8F8;border:1px solid #E6E0E1;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;font-family:inherit;">${escapeHtml(transcript)}</pre>
        <p style="margin:16px 0 0;font-size:13px;color:#6E6164;">Want to continue the conversation? Reply to this email or visit <a href="${SITE}" style="color:#D11149;">chetanpayroll.com</a>.</p>
      </div>
    </div>`
    };

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        if (!r.ok) throw new Error('Resend ' + r.status);
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[api/chat-summary] send failed:', err.message);
        return res.status(502).json({ success: false, error: 'send_failed' });
    }
};
