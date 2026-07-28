/* One Minute push service.
 *
 * Two jobs: hold the subscriptions the app registers, and run a clock that
 * fires the nudges. Cron ticks every minute, so a reminder lands on the minute
 * you asked for — and because it runs here rather than on the phone, it lands
 * whether or not the app is open.
 */
import { sendPush } from './push.js';

const KEY = 'devices';
const MAX_DEVICES = 25;

/* ------------------------------------------------------------ timezone -- */

/* Offset between UTC and `tz` at this instant, via Intl — no tz database
   needed and it follows DST on its own. */
function tzOffsetMs(tz, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = {};
  for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - date.getTime();
}

function localMinutes(tz, date) {
  const off = tzOffsetMs(tz, date);
  const d = new Date(date.getTime() + off);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function localMidnight(tz, date) {
  const off = tzOffsetMs(tz, date);
  const d = new Date(date.getTime() + off);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - off;
}

/* ------------------------------------------------------------ schedule -- */

/* Returns the timestamp of the slot being fired, or null. The slot doubles as
   the dedupe marker: one nudge per slot, and none at all if a set was already
   logged inside it. */
export function dueAt(device, now) {
  const p = device.prefs || {};
  if (!p.enabled) return null;

  const tz = p.tz || 'UTC';
  let mins;
  try { mins = localMinutes(tz, now); } catch { return null; }

  const lastSent = device.lastSent || 0;
  const lastSet = p.lastSetTs || 0;

  if (p.mode === 'scheduled') {
    for (const t of p.times || []) {
      const [hh, mm] = String(t).split(':').map(Number);
      if (mins !== hh * 60 + mm) continue;
      const slot = localMidnight(tz, now) + (hh * 60 + mm) * 60000;
      if (lastSent >= slot || lastSet >= slot) return null;
      return slot;
    }
    return null;
  }

  const step = (Number(p.intervalHours) || 4) * 3600e3;
  const at = Math.max(lastSet, lastSent, localMidnight(tz, now)) + step;
  if (now.getTime() < at) return null;
  const hour = Math.floor(mins / 60);
  if (hour < 7 || hour >= 22) return null;      // don't nudge overnight
  return at;
}

const EX = { push: 'push-ups', pull: 'pull-ups', situp: 'sit-ups' };
const LINES = [
  'Time for a set of {ex}.',
  'One minute of {ex}. That is the whole ask.',
  'Sixty seconds of {ex} — go.',
  'Your minute is waiting. {ex}, sixty seconds.',
  'Quick set of {ex}? One minute.'
];

function message(prefs) {
  const ex = EX[prefs.exercise] || 'push-ups';
  return LINES[Math.floor(Math.random() * LINES.length)].replace('{ex}', ex);
}

/* ----------------------------------------------------------------- KV --- */

const load = async (env) => (await env.SUBS.get(KEY, 'json')) || {};
const save = (env, devices) => env.SUBS.put(KEY, JSON.stringify(devices));

async function deviceId(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------------------------------------------------------- HTTP -- */

function cors(env, extra = {}) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    ...extra
  };
}

const json = (env, obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: cors(env, { 'content-type': 'application/json' }) });

function validSubscription(s) {
  return s && typeof s.endpoint === 'string' &&
    /^https:\/\//.test(s.endpoint) &&
    s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

    if (url.pathname === '/health') {
      const devices = await load(env);
      return json(env, { ok: true, devices: Object.keys(devices).length, now: new Date().toISOString() });
    }

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      let payload;
      try { payload = await request.json(); } catch { return json(env, { error: 'bad json' }, 400); }

      const { subscription, prefs } = payload || {};
      if (!validSubscription(subscription)) return json(env, { error: 'bad subscription' }, 400);

      const devices = await load(env);
      const id = await deviceId(subscription.endpoint);
      if (!devices[id] && Object.keys(devices).length >= MAX_DEVICES) {
        return json(env, { error: 'too many devices' }, 429);
      }

      devices[id] = { subscription, prefs: prefs || {}, lastSent: devices[id]?.lastSent || 0 };
      await save(env, devices);
      return json(env, { ok: true, id });
    }

    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      let payload;
      try { payload = await request.json(); } catch { return json(env, { error: 'bad json' }, 400); }
      if (!payload || typeof payload.endpoint !== 'string') return json(env, { error: 'bad endpoint' }, 400);

      const devices = await load(env);
      const id = await deviceId(payload.endpoint);
      if (devices[id]) { delete devices[id]; await save(env, devices); }
      return json(env, { ok: true });
    }

    /* Send to every registered device right now, ignoring the schedule.
       Guarded by the VAPID public key so it is not an open spam relay. */
    if (url.pathname === '/test' && request.method === 'POST') {
      if (url.searchParams.get('key') !== env.VAPID_PUBLIC_KEY) return json(env, { error: 'nope' }, 403);
      const devices = await load(env);
      const vapid = {
        subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY
      };
      const results = [];
      for (const [id, dev] of Object.entries(devices)) {
        const r = await sendPush(dev.subscription, JSON.stringify({
          body: 'Test nudge — your reminders are working.', icon: dev.prefs?.icon || 0
        }), vapid);
        results.push({ id, status: r.status, ok: r.ok });
      }
      return json(env, { sent: results });
    }

    return json(env, { error: 'not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const devices = await load(env);
      const now = new Date(event.scheduledTime || Date.now());
      const vapid = {
        subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY
      };

      let dirty = false;

      for (const [id, dev] of Object.entries(devices)) {
        const slot = dueAt(dev, now);
        if (!slot) continue;

        const res = await sendPush(
          dev.subscription,
          JSON.stringify({ body: message(dev.prefs || {}), icon: dev.prefs?.icon || 0 }),
          vapid
        );

        if (res.ok) {
          dev.lastSent = Math.max(slot, now.getTime());
          dirty = true;
          console.log('sent', id, res.status);
        } else if (res.status === 404 || res.status === 410) {
          delete devices[id];                     // subscription is dead
          dirty = true;
          console.log('pruned', id);
        } else {
          console.log('failed', id, res.status, res.text.slice(0, 120));
        }
      }

      if (dirty) await save(env, devices);
    })());
  }
};
