# Minute — backend work

The prototype is fully functional client-side. All state lives in `localStorage` under the single key
`wt.minute.v1`. Everything below is what a real backend has to add.

---

## 1. PWA shell (blocking — required before anything else)

iOS gives an installed web app almost nothing unless these exist. Notifications are **impossible**
without them.

- `manifest.webmanifest` — `name`, `short_name: "Minute"`, `display: "standalone"`,
  `start_url: "/"`, `background_color`, `theme_color`, and a real `icons` array
  (180×180, 192×192, 512×512, plus a 512 `maskable`).
- `<link rel="manifest">` + `<link rel="apple-touch-icon">` in the document head.
  The current head only has the `apple-mobile-web-app-*` meta tags.
- **Service worker** (`sw.js`) — install/activate, precache the app shell, cache-first for
  static assets, network-first for API. This is also the only place a push handler can live.
- Registration + update flow (`navigator.serviceWorker.register`, prompt on `updatefound`).

⚠️ **App icon picker caveat:** the four tiles in Settings are currently cosmetic. iOS does *not*
support alternate icons for home-screen web apps — only native apps get `setAlternateIconName`.
Either drop the picker, or ship it as a **theme** choice that changes in-app branding only, or
wrap the app in a thin native shell later. Decide this before building against it.

---

## 2. Auth + identity

- Minimal is fine: device-scoped anonymous ID issued on first launch, upgradeable to a real
  account (Apple Sign-In fits the audience) so history survives a new phone.
- Session as httpOnly cookie or refresh-token pair.

---

## 3. Data model

```
user(id, created_at, tz)                      -- tz needed for scheduled notifications
set(id, user_id, exercise, reps, duration_s, performed_at, client_id, created_at)
settings(user_id, exercise, theme, mode, accent, icon,
         notif_enabled, notif_mode, interval_hours, scheduled_times[])
push_subscription(id, user_id, endpoint, p256dh, auth, created_at, last_ok_at, failures)
```

`exercise` is an enum: `push | pull | situp`.
`client_id` is the client-generated id (`'u' + Date.now()` today) — carry it through so
offline-created sets dedupe idempotently on sync.

---

## 4. Sets API

- `POST /sets` — create. Idempotent on `(user_id, client_id)`.
- `GET /sets?exercise=&from=&to=&cursor=` — paginated, newest first. The Log page currently
  renders the *entire* history in one pass; add cursor pagination before a heavy user hits it.
- `DELETE /sets/:id` — the UI has no delete yet; add swipe-to-delete on a Log row when this exists.
- `POST /sets/sync` — batch upsert of queued offline sets, returns server truth.

## 5. Stats API

Right now every stat is recomputed in the browser from the full set list on each render — fine at
prototype scale, wrong at years of data.

- `GET /stats?exercise=&range=week|month|year|all` returning: `lifetime_reps`, `range_reps`,
  `first3_avg`, `last3_avg`, `slope_per_day`, `avg_seconds_per_rep`, `set_count`, `best`,
  and a downsampled `series[{t, reps}]` for the chart.
- Downsample server-side (LTTB or weekly buckets) — the chart scrubber gets unusable past a few
  hundred points.
- `GET /log/summary?exercise=` for the year/month headers (`total_reps`, `avg_seconds_per_rep`
  per month) so the Log page doesn't fetch every row to compute them.
- Streak calculation belongs server-side too (it's timezone-sensitive; the client currently uses
  local `toDateString()`).

## 6. Settings API

- `GET /settings`, `PATCH /settings`. Sync theme, mode, accent, icon, notification prefs.
- Keep writing to `localStorage` as the offline cache; server is the source of truth on login.

---

## 7. Push notifications (the real work)

iOS 16.4+ supports Web Push **only for an installed home-screen web app**. Requirements:

- **VAPID keypair**, private key server-side only.
- `POST /push/subscribe` / `DELETE /push/unsubscribe` — store the subscription from
  `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
- Permission must be requested from a **user gesture** — wire it to the Settings toggle
  (`Notification.requestPermission()`), and handle `denied` by showing the toggle as blocked
  with a note to re-enable in iOS Settings. Notifications stay off by default, as specced.
- **Scheduler** — a worker (cron / queue, e.g. BullMQ or a Cloud Tasks-style timer) that computes
  each user's next fire time from their mode:
  - `interval` — every N hours from last set or from midnight, N ∈ {2,3,4,6,8}.
  - `scheduled` — the user's custom time list, resolved in **their** `tz` (DST-aware; store times
    as local wall-clock, not UTC).
  - Skip a nudge if a set was already logged in that window. Cap at one per window.
- Send via `web-push` (or equivalent). On `404`/`410`, delete the subscription; track `failures`
  and prune.
- `sw.js` handlers: `push` → `showNotification`; `notificationclick` → focus or open the app at
  the timer, pre-armed.

---

## 8. Timer reliability

`setInterval` at 40ms drives both the 3s countdown and the 60s timer. When the screen locks or
the app backgrounds, iOS suspends timers and **the alarm will not fire on time**.

- Already partly mitigated: the timer derives from absolute timestamps (`countAt`, `runAt`), so
  elapsed time is correct on resume.
- Still needed: on `visibilitychange`, reconcile — if `runAt` has passed while hidden, jump
  straight to the rep-entry sheet rather than waiting for a tick.
- For an alarm that fires while backgrounded, schedule a local notification at `runAt` as a
  fallback and cancel it if the app is still foregrounded when the timer completes.
- `AudioContext` gets suspended on background; resume it on `visibilitychange` before the alarm
  (the code already calls `resume()` on `ac()`, keep that path).

## 9. Offline queue

- IndexedDB outbox for sets created offline (localStorage is fine for settings, not for a queue).
- Replay through `POST /sets/sync` on reconnect / SW `sync` event.
- Conflict rule: sets are append-only and immutable, so last-write-wins is safe; dedupe on `client_id`.

## 10. Nice-to-have

- `GET /export` — CSV/JSON of all sets. Users of a tracker like this ask for it.
- Rate limiting on `POST /sets` (trivially spammable).
- Apple Health / HealthKit write — needs a native wrapper, out of reach for pure web.

---

## Client changes this implies

1. Replace direct `localStorage` reads in `componentDidMount` with an API fetch + cache fallback.
2. Replace `this.state.logged.concat(...)` in `saveSet` with an optimistic write + outbox enqueue.
3. Replace the in-`renderVals` stat math with the `/stats` response (keep the local math as the
   offline path).
4. Paginate the Log list.
5. Wire the Settings notification toggle to real permission + subscribe calls.
