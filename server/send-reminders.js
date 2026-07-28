/* One Minute — reminder sender.
 *
 * Runs on a GitHub Actions cron. Reads the registered devices out of the
 * PUSH_SUBSCRIPTIONS secret, works out which of them are due a nudge in this
 * window, and sends a Web Push message. Because it runs on GitHub's
 * infrastructure rather than in the app, the notification arrives whether or
 * not One Minute is open — which is the whole point.
 *
 * Env:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   PUSH_SUBSCRIPTIONS   JSON array of { subscription, prefs }
 *   WINDOW_MINUTES       how wide a slot counts as "now" (default 15)
 *   DRY_RUN              set to 1 to log what would be sent and stop
 */
const webpush = require('web-push');

const WINDOW = Number(process.env.WINDOW_MINUTES || 15);
const DRY = process.env.DRY_RUN === '1';

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

const pub = process.env.VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:nobody@example.com';
if (!pub || !priv) fail('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set.');
webpush.setVapidDetails(subject, pub, priv);

let devices;
try {
  devices = JSON.parse(process.env.PUSH_SUBSCRIPTIONS || '[]');
  if (!Array.isArray(devices)) devices = [devices];
} catch (e) {
  fail('PUSH_SUBSCRIPTIONS is not valid JSON: ' + e.message);
}
if (!devices.length) {
  console.log('No devices registered — nothing to do.');
  console.log('Add a PUSH_SUBSCRIPTIONS secret with the code from Settings → Reminders.');
  process.exit(0);
}

const EX = { push: 'push-ups', pull: 'pull-ups', situp: 'sit-ups' };

const LINES = [
  'Time for a set of {ex}.',
  'One minute of {ex}. That is the whole ask.',
  'Sixty seconds of {ex} — go.',
  'Your minute is waiting. {ex}, sixty seconds.',
  'Quick set of {ex}? One minute.'
];

/* Minutes since local midnight in the device's own timezone, so this stays
   correct across DST without storing anything UTC. */
function localMinutes(tz, at) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(at);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return (get('hour') % 24) * 60 + get('minute');
}

/* Interval mode has no persistent state to anchor "N hours since your last
   set", so it becomes a fixed ladder of times through the waking day — which
   is deterministic and needs no storage. */
function intervalSlots(hours) {
  const out = [];
  for (let h = 8; h <= 22; h += hours) out.push(h * 60);
  return out;
}

function slotsFor(prefs) {
  if (prefs.mode === 'scheduled') {
    return (prefs.times || []).map((t) => {
      const [h, m] = String(t).split(':').map(Number);
      return h * 60 + m;
    });
  }
  return intervalSlots(Number(prefs.intervalHours) || 4);
}

const now = new Date();
let sent = 0, skipped = 0, failed = 0;

(async () => {
  for (const dev of devices) {
    const prefs = dev.prefs || {};
    const sub = dev.subscription || dev;
    const label = (sub.endpoint || '').slice(0, 48) + '…';

    if (prefs.enabled === false) { skipped++; console.log('· disabled  ' + label); continue; }

    const tz = prefs.tz || 'UTC';
    let mins;
    try { mins = localMinutes(tz, now); }
    catch (e) { console.log('· bad tz ' + tz + ' — falling back to UTC'); mins = localMinutes('UTC', now); }

    /* Fire once per slot: only when the clock sits inside the slot's window. */
    const due = slotsFor(prefs).some((s) => {
      const d = (mins - s + 1440) % 1440;
      return d < WINDOW;
    });

    if (!due) {
      skipped++;
      console.log(`· not due   ${label}  local ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} ${tz}`);
      continue;
    }

    const ex = EX[prefs.exercise] || 'push-ups';
    const body = LINES[Math.floor(Math.random() * LINES.length)].replace('{ex}', ex);
    const payload = JSON.stringify({ body, icon: prefs.icon || 0 });

    if (DRY) { console.log(`· DRY  would send "${body}" → ${label}`); sent++; continue; }

    try {
      await webpush.sendNotification(sub, payload, { TTL: 1800, urgency: 'normal' });
      sent++;
      console.log('✓ sent      ' + label + '  "' + body + '"');
    } catch (err) {
      failed++;
      const code = err.statusCode;
      if (code === 404 || code === 410) {
        console.log('✗ gone      ' + label + ' — this device unsubscribed. Remove it from PUSH_SUBSCRIPTIONS.');
      } else {
        console.log('✗ failed    ' + label + '  ' + code + ' ' + (err.body || err.message || ''));
      }
    }
  }

  console.log(`\n${sent} sent, ${skipped} skipped, ${failed} failed.`);
  /* A dead subscription is the user's business, not a red build. */
  process.exit(0);
})();
