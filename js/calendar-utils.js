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

    /* ================= Timezone engine =================
     *
     * Chetan works Indian Standard Time. Slots are therefore anchored to IST
     * wall-clock hours and converted to the visitor's zone for display, so a
     * visitor in London sees their own local time rather than mistaking an IST
     * time for their own. Conversion uses Intl exclusively — never manual
     * offset arithmetic, which breaks across DST boundaries.
     */

    const HOST_TZ = 'Asia/Kolkata';
    // Chetan's real working window, including later slots that give the
    // Americas a civilised morning (18:00 IST = 8:30am New York).
    const HOST_SLOTS_IST = ['10:00', '11:30', '14:00', '16:30', '18:00', '20:00'];
    const MIN_LEAD_HOURS = 24;   // don't offer anything sooner than this
    const HORIZON_DAYS = 45;     // how far ahead to generate

    // Never offer a visitor a slot in the middle of their night. Without this a
    // New York visitor is shown 2:00 AM / 4:30 AM, because those are Chetan's
    // normal IST morning hours.
    const VISITOR_CIVIL_START = 7;   // inclusive
    const VISITOR_CIVIL_END = 22;    // exclusive

    /**
     * Offset (ms) between UTC and `timeZone` at the given instant.
     * Formats the instant in the zone, reads it back as if it were UTC, and
     * takes the difference — the standard Intl-only technique.
     */
    function tzOffsetMs(instant, timeZone) {
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const map = {};
        dtf.formatToParts(instant).forEach(p => { map[p.type] = p.value; });
        let hour = parseInt(map.hour, 10);
        if (hour === 24) hour = 0; // some engines emit 24 for midnight
        const asUTC = Date.UTC(
            parseInt(map.year, 10), parseInt(map.month, 10) - 1, parseInt(map.day, 10),
            hour, parseInt(map.minute, 10), parseInt(map.second, 10)
        );
        return asUTC - instant.getTime();
    }

    /**
     * A wall-clock time in `timeZone` -> the exact UTC instant.
     * Two passes so the offset used is the one actually in force at the
     * resulting instant (matters on DST transition days).
     */
    function zonedWallClockToInstant(y, m, d, hh, mm, timeZone) {
        const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
        const o1 = tzOffsetMs(new Date(guess), timeZone);
        let ts = guess - o1;
        const o2 = tzOffsetMs(new Date(ts), timeZone);
        if (o2 !== o1) ts = guess - o2;
        return new Date(ts);
    }

    /** Calendar parts of an instant as seen in `timeZone`. */
    function partsInZone(instant, timeZone) {
        const dtf = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone, hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', weekday: 'short'
        });
        const map = {};
        dtf.formatToParts(instant).forEach(p => { map[p.type] = p.value; });
        let hour = parseInt(map.hour, 10);
        if (hour === 24) hour = 0;
        return {
            year: parseInt(map.year, 10),
            month: parseInt(map.month, 10),
            day: parseInt(map.day, 10),
            hour: hour,
            minute: parseInt(map.minute, 10),
            weekday: map.weekday,
            key: `${map.year}-${map.month}-${map.day}`
        };
    }

    function formatTimeInZone(instant, timeZone) {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone, hour: 'numeric', minute: '2-digit', hour12: true
        }).format(instant);
    }

    function formatDateInZone(instant, timeZone, opts) {
        return new Intl.DateTimeFormat('en-US', Object.assign({
            timeZone: timeZone, weekday: 'short', month: 'short', day: 'numeric'
        }, opts || {})).format(instant);
    }

    /** Short zone label, e.g. "BST" / "GMT+5:30". */
    function zoneAbbreviation(instant, timeZone) {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: timeZone, timeZoneName: 'short'
            }).formatToParts(instant);
            const tzn = parts.find(p => p.type === 'timeZoneName');
            return tzn ? tzn.value : timeZone;
        } catch (e) {
            return timeZone;
        }
    }

    // Some engines still report legacy IANA aliases (Chrome returns
    // "Asia/Calcutta" for India). Normalise so visitors see the modern city.
    const ZONE_ALIASES = {
        'Asia/Calcutta': 'Asia/Kolkata',
        'Asia/Saigon': 'Asia/Ho_Chi_Minh',
        'Asia/Rangoon': 'Asia/Yangon',
        'Asia/Katmandu': 'Asia/Kathmandu',
        'Asia/Dacca': 'Asia/Dhaka',
        'Europe/Kiev': 'Europe/Kyiv',
        'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
        'Pacific/Ponape': 'Pacific/Pohnpei',
        'Atlantic/Faeroe': 'Atlantic/Faroe'
    };

    function canonicalZone(tz) {
        return ZONE_ALIASES[tz] || tz;
    }

    function visitorTimeZone() {
        try {
            return canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        } catch (e) {
            return 'UTC';
        }
    }

    /**
     * Every bookable slot as a concrete UTC instant, built from Chetan's IST
     * working hours on IST weekdays, respecting the lead time.
     * Grouping/labelling for the visitor happens downstream, so the visitor's
     * calendar date can never disagree with the instant.
     */
    function generateSlots(now) {
        const from = now || new Date();
        const out = [];
        const startParts = partsInZone(from, HOST_TZ);
        const cursor = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));

        for (let i = 0; i < HORIZON_DAYS; i++) {
            const y = cursor.getUTCFullYear();
            const m = cursor.getUTCMonth() + 1;
            const d = cursor.getUTCDate();

            for (let s = 0; s < HOST_SLOTS_IST.length; s++) {
                const hhmm = HOST_SLOTS_IST[s].split(':');
                const instant = zonedWallClockToInstant(
                    y, m, d, parseInt(hhmm[0], 10), parseInt(hhmm[1], 10), HOST_TZ
                );

                // Weekday check uses the HOST calendar — Chetan's working week.
                const hostParts = partsInZone(instant, HOST_TZ);
                if (hostParts.weekday === 'Sat' || hostParts.weekday === 'Sun') continue;

                if (instant.getTime() - from.getTime() < MIN_LEAD_HOURS * 3600000) continue;

                out.push(instant);
            }
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return out;
    }

    /** Slots grouped by the visitor's local calendar date. */
    function slotsByVisitorDate(timeZone, now) {
        const tz = timeZone || visitorTimeZone();
        const all = generateSlots(now);

        const civil = all.filter(instant => {
            const h = partsInZone(instant, tz).hour;
            return h >= VISITOR_CIVIL_START && h < VISITOR_CIVIL_END;
        });

        // Extreme zones may have no overlap at all with Chetan's working day;
        // rather than show an empty calendar, fall back to the full set.
        const list = civil.length ? civil : all;

        const groups = Object.create(null);
        list.forEach(instant => {
            const p = partsInZone(instant, tz);
            if (!groups[p.key]) groups[p.key] = [];
            groups[p.key].push(instant);
        });
        return groups;
    }

    /** Common zones offered when Intl.supportedValuesOf is unavailable. */
    const FALLBACK_ZONES = [
        'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo',
        'Asia/Shanghai', 'Asia/Jakarta', 'Australia/Sydney', 'Europe/London', 'Europe/Dublin',
        'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Warsaw',
        'Africa/Cairo', 'Africa/Johannesburg', 'America/New_York', 'America/Chicago',
        'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo', 'UTC'
    ];

    function availableTimeZones() {
        try {
            if (typeof Intl.supportedValuesOf === 'function') {
                const list = Intl.supportedValuesOf('timeZone');
                if (list && list.length) return list;
            }
        } catch (e) { /* fall through */ }
        return FALLBACK_ZONES.slice();
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
        ORGANIZER_EMAIL,
        // timezone engine
        HOST_TZ,
        DEFAULT_MINUTES,
        tzOffsetMs,
        zonedWallClockToInstant,
        partsInZone,
        formatTimeInZone,
        formatDateInZone,
        zoneAbbreviation,
        visitorTimeZone,
        canonicalZone,
        generateSlots,
        slotsByVisitorDate,
        availableTimeZones
    };

})(typeof window !== 'undefined' ? window : globalThis);
