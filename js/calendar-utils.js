/**
 * Shared calendar helpers for the booking flows (contact modal + chat widget).
 *
 * Produces an RFC 5545 compliant invite and one-click "add to calendar" links.
 * Everything is generated in the browser — no service, no API key, no cost.
 *
 * Note: the existing UTC conversion (local time -> toISOString) was verified
 * correct and is preserved. What is fixed here is TEXT escaping (a comma or
 * semicolon in a name previously corrupted the .ics), plus ORGANIZER/ATTENDEE
 * and a reminder so the file behaves as a real meeting invite.
 */

(function (global) {
    'use strict';

    const ORGANIZER_NAME = 'Chetan Sharma';
    const ORGANIZER_EMAIL = 'chetanpayroll@gmail.com';
    const DEFAULT_MINUTES = 30;

    // RFC 5545 §3.3.11: backslash, semicolon, comma and newlines must be escaped
    // inside TEXT values.
    function escapeText(value) {
        return String(value == null ? '' : value)
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r\n|\r|\n/g, '\\n');
    }

    // RFC 5545 §3.1: content lines should be folded at 75 octets.
    function foldLine(line) {
        if (line.length <= 75) return line;
        const parts = [];
        let idx = 0;
        parts.push(line.slice(0, 75));
        idx = 75;
        while (idx < line.length) {
            parts.push(' ' + line.slice(idx, idx + 74));
            idx += 74;
        }
        return parts.join('\r\n');
    }

    function toUtcStamp(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    /**
     * Combine a Date (day) with a "hh:mm AM/PM" string into a local Date.
     */
    function combineDateAndTime(dateObj, timeStr) {
        const [clock, modifier] = String(timeStr).trim().split(/\s+/);
        let [hours, minutes] = clock.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10) || 0;
        if (modifier) {
            const m = modifier.toUpperCase();
            if (m === 'PM' && hours !== 12) hours += 12;
            if (m === 'AM' && hours === 12) hours = 0;
        }
        const out = new Date(dateObj.getTime());
        out.setHours(hours, minutes, 0, 0); // milliseconds explicitly zeroed
        return out;
    }

    /**
     * @param {Object} o
     * @param {Date}   o.start
     * @param {number} [o.minutes]
     * @param {string} [o.attendeeName]
     * @param {string} [o.attendeeEmail]
     * @param {string} [o.topic]
     * @param {string} [o.phone]
     */
    function buildEvent(o) {
        const start = o.start;
        const end = new Date(start.getTime() + (o.minutes || DEFAULT_MINUTES) * 60000);
        const title = `Meeting with ${ORGANIZER_NAME}`;
        const descLines = [];
        if (o.topic) descLines.push(`Topic: ${o.topic}`);
        if (o.attendeeName) descLines.push(`Requested by: ${o.attendeeName}`);
        if (o.attendeeEmail) descLines.push(`Email: ${o.attendeeEmail}`);
        if (o.phone) descLines.push(`Phone: ${o.phone}`);
        descLines.push('Booked via chetanpayroll.com');
        return {
            start, end, title,
            description: descLines.join('\n'),
            location: 'Remote / Online',
            attendeeName: o.attendeeName || '',
            attendeeEmail: o.attendeeEmail || ''
        };
    }

    function buildICS(ev) {
        const uid = `${toUtcStamp(ev.start)}-${Math.abs(hashString(ev.description))}@chetanpayroll.com`;
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Chetan Sharma Portfolio//Booking//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${toUtcStamp(new Date())}`,
            `DTSTART:${toUtcStamp(ev.start)}`,
            `DTEND:${toUtcStamp(ev.end)}`,
            `SUMMARY:${escapeText(ev.title)}`,
            `DESCRIPTION:${escapeText(ev.description)}`,
            `LOCATION:${escapeText(ev.location)}`,
            `ORGANIZER;CN=${escapeText(ORGANIZER_NAME)}:mailto:${ORGANIZER_EMAIL}`
        ];
        if (ev.attendeeEmail) {
            lines.push(
                `ATTENDEE;CN=${escapeText(ev.attendeeName || ev.attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${ev.attendeeEmail}`
            );
        }
        lines.push(
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'BEGIN:VALARM',
            'TRIGGER:-PT15M',
            'ACTION:DISPLAY',
            'DESCRIPTION:Reminder',
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR'
        );
        return lines.map(foldLine).join('\r\n');
    }

    function hashString(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return h;
    }

    function downloadICS(ev, filename) {
        const blob = new Blob([buildICS(ev)], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'meeting-with-chetan-sharma.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function googleCalendarUrl(ev) {
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: ev.title,
            dates: `${toUtcStamp(ev.start)}/${toUtcStamp(ev.end)}`,
            details: ev.description,
            location: ev.location
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    function outlookUrl(ev) {
        const params = new URLSearchParams({
            path: '/calendar/action/compose',
            rru: 'addevent',
            subject: ev.title,
            startdt: ev.start.toISOString(),
            enddt: ev.end.toISOString(),
            body: ev.description,
            location: ev.location
        });
        return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
    }

    /**
     * Renders the shared "add to calendar" button row.
     */
    function calendarLinksHTML(ev) {
        return `
            <div class="cal-actions">
                <button type="button" class="cal-btn cal-btn-primary" data-cal="ics">
                    <span aria-hidden="true">📅</span> Download invite (.ics)
                </button>
                <a class="cal-btn" href="${googleCalendarUrl(ev)}" target="_blank" rel="noopener">Google Calendar</a>
                <a class="cal-btn" href="${outlookUrl(ev)}" target="_blank" rel="noopener">Outlook</a>
            </div>
        `;
    }

    /* ================= Booking transport ================= */
    /**
     * Sends a booking request. Tries the serverless endpoint first (which
     * emails BOTH Chetan and the visitor); if it is not deployed/configured,
     * silently falls back to the existing Web3Forms path so booking never
     * breaks.
     *
     * @returns {Promise<{ok:boolean, via:'api'|'web3forms', bothNotified:boolean}>}
     */
    const WEB3FORMS_KEY = 'f526a9f2-266b-43d8-9b49-41f03a7776b6';

    async function submitBooking(payload, ev) {
        // --- Preferred path: dual-email serverless function ---
        try {
            const res = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(Object.assign({}, payload, {
                    ics: ev ? buildICS(ev) : undefined
                }))
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data && data.success) {
                    // Only claim the visitor was emailed if it actually was.
                    return { ok: true, via: 'api', bothNotified: data.visitorNotified !== false };
                }
            }
        } catch (e) {
            // Endpoint absent or offline — fall through to Web3Forms.
        }

        // --- Fallback: existing Web3Forms path (notifies Chetan only) ---
        const res2 = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                access_key: WEB3FORMS_KEY,
                subject: `New Meeting Request: ${payload.name} (${payload.date})`,
                from_name: payload.source || 'Booking System',
                name: payload.name,
                email: payload.email,
                replyto: payload.email,
                message: [
                    'New Meeting Request',
                    '',
                    `Name: ${payload.name}`,
                    `Email: ${payload.email}`,
                    `Phone: ${payload.phone || 'N/A'}`,
                    `Company: ${payload.company || 'N/A'}`,
                    `Topic: ${payload.topic || 'General Inquiry'}`,
                    '',
                    `Requested Date: ${payload.date}`,
                    `Requested Time: ${payload.time}`,
                    `Timezone: ${payload.timezone || ''}`,
                    '',
                    `Source: ${payload.source || 'Portfolio'}`
                ].join('\n')
            })
        });
        const result = await res2.json();
        if (!result.success) throw new Error(result.message || 'Submission failed');
        return { ok: true, via: 'web3forms', bothNotified: false };
    }

    global.BookingTransport = { submit: submitBooking };

    global.CalendarUtils = {
        combineDateAndTime,
        buildEvent,
        buildICS,
        downloadICS,
        googleCalendarUrl,
        outlookUrl,
        calendarLinksHTML,
        escapeText,
        toUtcStamp,
        ORGANIZER_EMAIL
    };

})(typeof window !== 'undefined' ? window : globalThis);
