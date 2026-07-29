# iOS standalone web app notes

What it took to make a web app sit correctly on an iPhone Home Screen, written
down because none of it is guessable and all of it cost time here.

## The dead strip under a bottom bar

**Symptom.** Installed to the Home Screen, a bottom-anchored bar stops short of
the screen edge with a strip of dead space beneath it. Trimming the bar's
padding never removes it — the strip just moves.

**Cause.** This combination:

```html
<meta name="viewport" content="..., viewport-fit=cover">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

`black-translucent` draws the page under the status bar, so it starts at y=0 —
but iOS still gives the page a viewport **62px shorter than the screen** (the
status bar height). The page therefore renders `0 → 812` on an 874px screen and
the last 62px is *outside the page*. No layout or paint can reach it.

**Fix.** Use `black` (or `default`) instead:

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```

iOS then lays the web view out *below* the status bar and sizes it to the rest
of the screen. Keep `viewport-fit=cover` — the bottom inset is still needed so
the bar can clear the home indicator.

⚠️ **iOS reads this meta only when the app is added to the Home Screen.**
Changing it does nothing until the icon is deleted and re-added.

## Diagnosing it in any app

`env()` values cannot be read from JS, so measure them with a probe element.
The three numbers below tell you which bug you have:

```js
const px = (len) => {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:' + len;
  document.body.appendChild(p);
  const v = Math.round(parseFloat(getComputedStyle(p).paddingBottom) || 0);
  p.remove();
  return v;
};

const bar = document.querySelector('YOUR_BOTTOM_BAR');
console.log({
  barGap: innerHeight - Math.round(bar.getBoundingClientRect().bottom),
  vpGap: screen.height - innerHeight,
  top: px('env(safe-area-inset-top)'),
  bot: px('env(safe-area-inset-bottom)')
});
```

| Reading | Meaning |
|---|---|
| `barGap > 0` | Ordinary CSS bug. The bar is short of the page's own bottom. Fixable in CSS. |
| `barGap 0`, `vpGap > 0`, `top > 0` | The `black-translucent` trap above. Needs the meta change and a reinstall. |
| `barGap 0`, `vpGap == status bar height`, `top 0` | Correct. Those pixels belong to iOS. |

`barGap` is the one that matters: **0 means the page already reaches its own
bottom edge**, so the strip is not yours to fix in CSS. Measure it first — it
separates "my layout is wrong" from "the viewport is wrong" in one number.

## Safe-area padding

Do not add the inset to a fixed value. This double-counts, and on an iPhone the
inset is already ~34px:

```css
padding-bottom: calc(env(safe-area-inset-bottom) + 9px);   /* 43px — too much */
```

Scale it instead, with a floor for devices reporting 0:

```css
padding-bottom: max(calc(env(safe-area-inset-bottom) * 0.6), 8px);
```

That gives 20px on an iPhone, 14px on an Android gesture bar, 8px on a desktop
browser. Subtracting a constant instead would crush the smaller insets to
nothing.

## Viewport height

`position: fixed; inset: 0` resolves against the **small viewport** in iOS
Safari, so when the bottom toolbar auto-hides the element stops short. Use the
dynamic viewport, with a fallback:

```css
position: fixed; left: 0; right: 0; top: 0;
height: 100vh;    /* fallback */
height: 100dvh;
```

This is a real fix, but only for a **browser tab** — it does nothing for the
installed case, which is the status bar meta above. They are separate bugs with
similar symptoms.

## Canvas colour

Any area the viewport does not cover is painted with the **canvas** background,
which propagates from `<html>` — not `<body>`. Setting it to the bottom bar's
colour makes a residual strip read as part of the bar:

```css
html { background: var(--surf); }   /* bar colour */
body { background: var(--bg); }     /* app colour */
```

Worth keeping as a backstop even after the status bar fix.

## Status bar colour is fixed at install

With `black` the status bar is always black. An in-app light/dark toggle
**cannot** change it, because iOS reads the setting once when the app is
installed. Options are: always black, always light (`default`), or accept the
mismatch in whichever mode is used less.

## Notifications

- Web push reaches an iPhone **only** for an app installed to the Home Screen.
  A Safari tab gets nothing.
- iOS appends **"from <app name>"** to every web push notification and it cannot
  be removed. Put the message in the *title* and leave the body empty, or it
  reads "App Name from App Name".
- Notifications are rendered by the **service worker**, so a stale worker keeps
  showing old wording. Post `skipWaiting` as soon as a new worker installs
  rather than waiting for every window to close.
