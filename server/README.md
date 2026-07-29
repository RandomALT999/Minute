# The push service

One Minute is a static site, so it cannot hold a VAPID private key or run a
clock. This is the piece that can: a Cloudflare Worker that stores the
subscriptions the app registers and fires the nudges on a one-minute cron.

Because the clock runs here rather than on the phone, a reminder arrives
**whether or not the app is open** — on iOS that is the only mechanism that
works at all. A closed PWA gets no timers, no background sync, nothing.

```
phone ──subscribe──► Worker ──► KV
                       ▲
             cron, every minute
                       │
                       └──web-push, VAPID-signed──► Apple/Google ──► phone
```

**Live at** `https://one-minute-push.randomalt99990.workers.dev`

## Deploy

From this directory. It needs a free Cloudflare account and nothing else — no
card, no paid plan.

```bash
npx wrangler login
npx wrangler kv namespace create SUBS
```

Paste the id it prints into `wrangler.toml`, then:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL. Put it in [`../config.js`](../config.js)
as `endpoint` and push — the app starts registering itself on next launch.

Generate a keypair with `node ../../scripts/gen-vapid.js` if you ever need a new
one. The public half goes in `config.js` **and** `wrangler.toml`; the private
half goes only into `wrangler secret put`, never into a file.

On Windows, PowerShell blocks the `npx.ps1` shim by default — use `npx.cmd`.

## Check it

```bash
curl https://one-minute-push.randomalt99990.workers.dev/health
```

`{"ok":true,"devices":1}` once a phone has registered. To make every registered
device buzz on demand:

```bash
curl -X POST "https://one-minute-push.randomalt99990.workers.dev/test?key=<VAPID_PUBLIC_KEY>"
```

Live cron logs: `npx wrangler tail`.

## Endpoints

| | |
|---|---|
| `POST /subscribe` | `{subscription, prefs}` — the app calls this on enable and on every settings change |
| `POST /unsubscribe` | `{endpoint}` — called when reminders are switched off |
| `GET /health` | Liveness plus a device count |
| `POST /test?key=…` | Pushes to every device now, ignoring the schedule. Gated on the VAPID public key so it is not an open relay |

## How it decides

`dueAt()` in `index.js` converts "now" into the device's own timezone with
`Intl`, so it follows DST without a timezone database.

- **Scheduled** fires on an exact local minute match.
- **Interval** fires N hours after the later of your last set, your last nudge,
  and local midnight — and stays quiet between 22:00 and 07:00.
- One nudge per slot, and none at all if a set was already logged inside it.
  `lastSetTs` rides along on every prefs sync, so this stays current.

Dead subscriptions (`404`/`410`) are pruned automatically.

## Why not the usual `web-push` package

It is Node-only and cannot run on Workers, so `push.js` implements the same
protocol — RFC 8291 `aes128gcm` payload encryption and RFC 8292 VAPID — against
Web Crypto. It is checked against the reference implementation rather than
trusted: the tests decrypt `web-push`'s own ciphertext with our code, match its
body framing byte for byte, and verify our VAPID JWTs against the public key.

## Files

| | |
|---|---|
| `worker/index.js` | Endpoints, schedule, KV storage |
| `worker/push.js` | Encryption and VAPID signing |
| `worker/wrangler.toml` | Cron, bindings, public config |
| `../scripts/gen-vapid.js` | Keypair generation |
