# Minute

Max reps in 60 seconds. Pick push-ups, pull-ups or sit-ups, hit start, get a 3-second countdown
and a one-minute timer, then log the reps. The app keeps your log, your streak and your trend line.

Built from the [Claude Design prototype](design-source/Minute.dc.html) as a static, installable
PWA. No build step, no dependencies, no server — it runs entirely on the device.

**Live:** https://randomalt999.github.io/Minute/

## Install it on your phone

1. Open the link above in Safari (iPhone) or Chrome (Android).
2. iPhone: Share → **Add to Home Screen**. Android: the menu offers **Install app**.
3. Launch it from the Home Screen. It runs full screen, works with no signal, and can send
   reminders — none of which work from a browser tab on iOS.

Pick your icon in Settings *before* you add it: iOS bakes the icon in at install time.

## What's in it

| | |
|---|---|
| **Train** | Exercise picker, 3-2-1 countdown with audio cues, 60-second ring timer, alarm + haptics, rep keypad |
| **Log** | Sets grouped by year and month with per-month totals and pace, tap a set to delete it, paged at 80 rows |
| **Stats** | Lifetime reps, week/month/year/all ranges, draggable trend chart, then→now, trend slope, average pace |
| **Settings** | Dark/light, 6 accents, 4 visual styles, 4 app icons, reminders, JSON/CSV export and JSON import |

Your data lives in `localStorage` under `wt.minute.v1` and never leaves the device. **Export a
backup before you switch phones** — Settings → Data → Export a backup.

## Local development

```bash
node scripts/dev-server.js
```

Then open http://localhost:8123. A plain file:// open will not work — service workers need
`http://localhost` or HTTPS.

| File | |
|---|---|
| `index.html` | Document head, theme CSS variables, keyframes |
| `app.js` | Micro-vdom, app state, timer, stats, and the whole view tree |
| `sw.js` | Precached shell, offline assets, push and notification handlers |
| `manifest*.webmanifest` | One per app icon; the picker swaps the `<link>` |
| `icons/` | Generated PNGs, 180/192/512 plus a 512 maskable per design |
| `design-source/` | The original Claude Design export this was built from |

Deployed straight from `main` by GitHub Pages. Push and it's live.

## Status against [BACKEND.md](BACKEND.md)

`BACKEND.md` is the original spec for what a real backend would add. This build is static, so
everything that does not need a server is done, and everything that does is not.

**Done**

- **§1 PWA shell** — manifest with a full icon set (incl. maskable), `apple-touch-icon`, service
  worker with a precached shell, offline-capable assets, registration and update prompt.
  The **icon picker** was kept and made real: it swaps the `apple-touch-icon` and the manifest,
  so it chooses the icon iOS installs. It cannot restyle an *already installed* app — iOS has no
  alternate-icon API for web apps — so Settings says so plainly.
- **§4 delete** — tap a Log row to reveal Delete.
- **§4 / §5 pagination** — the Log renders 80 rows at a time. Month headers are still computed
  from the full history, so the totals stay correct while paging.
- **§7 permission flow** — the Settings toggle calls `Notification.requestPermission()` straight
  off the tap, handles `denied` by showing the toggle as blocked with a note, and stays off by
  default. `sw.js` has working `push` and `notificationclick` handlers.
- **§7 scheduler, client half** — interval and scheduled modes both resolve in local time, cap at
  one nudge per window, and skip the nudge if a set was already logged in it.
- **§8 timer reliability** — `visibilitychange` reconciles from the absolute `countAt` / `runAt`
  timestamps and jumps straight to the rep sheet if the minute elapsed while hidden;
  `AudioContext` resumes on the way back; a local notification fires if the minute ends while
  backgrounded; a Screen Wake Lock holds the display on during the set.
- **§10 export** — JSON backup and CSV of all sets, plus a JSON import that dedupes on
  `client_id`, so history survives a new phone without accounts.

**Not done — needs a server**

- **§2 auth**, **§3 server data model**, **§4–§6 the APIs**. `localStorage` is the source of
  truth; export/import covers device migration instead.
- **§7 real Web Push.** A VAPID keypair and a scheduler worker are the missing half — a static
  host cannot hold a private key or run cron. Reminders therefore only fire while the app is
  open or recently used. The client is ready: add a push server and it subscribes.
- **§9 offline outbox.** There is nothing to sync to, so writes go straight to `localStorage`.
- **§10 rate limiting**, **HealthKit** — server-side and native respectively.
