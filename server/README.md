# Background reminders

One Minute is a static site, so it cannot hold a VAPID private key or run a
clock. This directory is the half that can: a scheduler that runs on GitHub
Actions and sends Web Push, so a reminder arrives **whether or not the app is
open**. On iOS that is the only mechanism that works at all — a closed PWA gets
no timers, no background sync, nothing.

```
your phone  ──subscribe──►  browser push service (Apple/Google)
                                      ▲
GitHub Actions cron ──web-push, signed with VAPID──┘
```

## Setup

Steps 1 and 2 are already done in this repo.

**1. VAPID keypair** — `node scripts/gen-vapid.js` prints a fresh pair. The
public key goes in [`config.js`](../config.js); the private key goes in a
secret and nowhere else.

**2. Secrets** — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
(a `mailto:` for your own address, which push services require as a contact).

**3. Register your phone.** Open the app on the device you want nudged, go to
Settings → Reminders, turn notifications on and accept the permission prompt,
then tap **Copy code**. That code is your push subscription plus your reminder
schedule.

**4. Store it.** Paste the code into a `PUSH_SUBSCRIPTIONS` secret:

```bash
gh secret set PUSH_SUBSCRIPTIONS -R RandomALT999/One-Minute
```

It takes the code on stdin, so paste and press Ctrl-D (or use the repo's
Settings → Secrets page in a browser). To nudge more than one device, put both
objects in the same JSON array.

**5. Check it.** Run the workflow by hand with **dry run** ticked — it logs
what it would send and why, without sending:

```bash
gh workflow run reminders.yml -R RandomALT999/One-Minute -f dry_run=true
gh run watch -R RandomALT999/One-Minute
```

Then run it again without dry run and your phone should buzz.

## How it decides

`send-reminders.js` converts "now" into the device's own local time using the
`tz` recorded in the code, so it stays right through DST.

- **Scheduled mode** fires on your listed times.
- **Interval mode** has no memory of your last set — there is nowhere to store
  it — so instead of "every N hours since you trained" it becomes a fixed
  ladder from 08:00 to 22:00, every N hours.

A slot fires when the local clock is inside its window (`WINDOW_MINUTES`, 20 by
default). The window is wider than the 15-minute cron because GitHub's
scheduled runs start late under load.

## What to expect

- **Late, not missed.** GitHub queues cron jobs at low priority; a nudge can
  land 5–20 minutes after the time you set. If you want minute accuracy, this
  wants a real host — the client already speaks to a normal push server, set
  `endpoint` in `config.js` and it will POST subscriptions there instead.
- **Cron sleeps on quiet repos.** GitHub disables scheduled workflows after 60
  days with no commits. Any push wakes it up.
- **Re-copy after changing your times.** The schedule travels inside the code,
  so the secret is a snapshot. Changing reminder settings in the app does not
  reach the secret on its own.
- **Re-copy if reminders stop.** Push subscriptions expire and get rotated by
  the browser. The workflow log says `gone` when that has happened.

## Files

| | |
|---|---|
| `send-reminders.js` | Decides who is due and sends the push |
| `../.github/workflows/reminders.yml` | The cron that runs it |
| `../scripts/gen-vapid.js` | Generates a keypair |
| `../config.js` | Public key the app subscribes with |
