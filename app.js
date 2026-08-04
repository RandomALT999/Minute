/* Minute — max reps in 60 seconds.
   Ported from the Claude Design prototype (Minute.dc.html) to a standalone,
   dependency-free PWA. The template DSL and DCLogic base class are replaced by
   the micro-vdom + app object below; renderVals() is kept faithful to the
   original so the UI behaves identically. */
(function () {
'use strict';

/* ------------------------------------------------------------------ vdom - */

var SVG_NS = 'http://www.w3.org/2000/svg';
var SVG_TAGS = { svg: 1, path: 1, circle: 1, line: 1, g: 1, rect: 1, text: 1, polyline: 1, polygon: 1, ellipse: 1 };
var refQueue = [];

function h(tag, props) {
  var kids = [];
  for (var i = 2; i < arguments.length; i++) flatten(arguments[i], kids);
  return { tag: tag, props: props || {}, kids: kids, key: props ? props.key : undefined };
}

function flatten(x, out) {
  if (x === null || x === undefined || x === false || x === true) return;
  if (Array.isArray(x)) { for (var i = 0; i < x.length; i++) flatten(x[i], out); return; }
  out.push(x);
}

function evtName(prop) { return prop.slice(2).toLowerCase(); }

function dispatch(e) {
  var fn = e.currentTarget['_h' + e.type];
  if (fn) fn(e);
}

function applyProps(el, oldP, newP, isSvg) {
  var k;
  for (k in newP) {
    if (k === 'key') continue;
    var nv = newP[k], ov = oldP[k];
    if (k === 'ref') {
      if (nv) refQueue.push([nv, el]);
    } else if (k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110 && k.charCodeAt(2) >= 65 && k.charCodeAt(2) <= 90) {
      var ev = evtName(k);
      el['_h' + ev] = nv;
      if (!el._ls) el._ls = {};
      if (!el._ls[ev]) { el._ls[ev] = 1; el.addEventListener(ev, dispatch, ev === 'scroll' ? { passive: true } : false); }
    } else if (k === 'style') {
      if (nv !== ov) el.style.cssText = nv || '';
    } else if (nv !== ov) {
      if (nv === null || nv === undefined || nv === false) el.removeAttribute(k);
      else el.setAttribute(k, nv);
    }
  }
  for (k in oldP) {
    if (k === 'key' || k === 'ref' || k in newP) continue;
    if (k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110 && k.charCodeAt(2) >= 65 && k.charCodeAt(2) <= 90) el['_h' + evtName(k)] = null;
    else if (k === 'style') el.style.cssText = '';
    else el.removeAttribute(k);
  }
}

function create(v, isSvg) {
  if (typeof v !== 'object') return document.createTextNode(String(v));
  var svg = isSvg || SVG_TAGS[v.tag] === 1;
  var el = svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
  applyProps(el, {}, v.props, svg);
  for (var i = 0; i < v.kids.length; i++) el.appendChild(create(v.kids[i], svg));
  return el;
}

function patch(parent, dom, oldV, newV, isSvg) {
  var oldText = typeof oldV !== 'object', newText = typeof newV !== 'object';
  if (oldText && newText) {
    if (String(oldV) !== String(newV)) dom.nodeValue = String(newV);
    return dom;
  }
  if (oldText !== newText || oldV.tag !== newV.tag || oldV.key !== newV.key) {
    var nd = create(newV, isSvg);
    parent.replaceChild(nd, dom);
    return nd;
  }
  var svg = isSvg || SVG_TAGS[newV.tag] === 1;
  applyProps(dom, oldV.props, newV.props, svg);
  patchKids(dom, oldV.kids, newV.kids, svg);
  return dom;
}

function patchKids(dom, oldK, newK, isSvg) {
  var i, n = Math.min(oldK.length, newK.length);
  for (i = 0; i < n; i++) patch(dom, dom.childNodes[i], oldK[i], newK[i], isSvg);
  for (i = oldK.length - 1; i >= newK.length; i--) dom.removeChild(dom.childNodes[i]);
  for (i = oldK.length; i < newK.length; i++) dom.appendChild(create(newK[i], isSvg));
}

/* ------------------------------------------------------------- constants - */

var STORE_KEY = 'wt.minute.v1';
var APP_NAME = 'One Minute';
var APP_VERSION = '2.3.0';

var EXS = [
  { id: 'push', label: 'Push-ups', short: 'Push', lower: 'push-ups' },
  { id: 'pull', label: 'Pull-ups', short: 'Pull', lower: 'pull-ups' },
  { id: 'situp', label: 'Sit-ups', short: 'Sit', lower: 'sit-ups' }
];

var ACCENTS = [
  { id: 'orange', hex: '#FF7A29' }, { id: 'lime', hex: '#B7E23F' }, { id: 'blue', hex: '#4C9BFF' },
  { id: 'red', hex: '#FF5A5A' }, { id: 'violet', hex: '#B98CFF' }, { id: 'teal', hex: '#3ED6C0' }
];

var THEMES = {
  'dark-gym': {
    name: 'Dark gym',
    fu: "'Barlow',-apple-system,system-ui,sans-serif", fn: "'Barlow Condensed','Barlow',sans-serif", fm: "'IBM Plex Mono',ui-monospace,monospace",
    r: '20px', rb: '16px', rp: '999px',
    dark: { bg: '#0A0A0B', surf: '#141416', surf2: '#1E1E21', line: 'rgba(255,255,255,0.09)', fg: '#F7F7F5', fg2: 'rgba(247,247,245,0.60)', fg3: 'rgba(247,247,245,0.56)' },
    light: { bg: '#F3F3F1', surf: '#FFFFFF', surf2: '#EAEAE7', line: 'rgba(0,0,0,0.09)', fg: '#111113', fg2: 'rgba(17,17,19,0.62)', fg3: 'rgba(17,17,19,0.56)' }
  },
  swiss: {
    name: 'Swiss',
    fu: "'Helvetica Neue',Helvetica,Arial,sans-serif", fn: "'Helvetica Neue',Helvetica,Arial,sans-serif", fm: "'IBM Plex Mono',ui-monospace,monospace",
    r: '3px', rb: '2px', rp: '2px',
    dark: { bg: '#0E0E0E', surf: '#161616', surf2: '#212121', line: 'rgba(255,255,255,0.14)', fg: '#FAFAFA', fg2: 'rgba(250,250,250,0.62)', fg3: 'rgba(250,250,250,0.58)' },
    light: { bg: '#F0F0EE', surf: '#FFFFFF', surf2: '#E5E5E2', line: 'rgba(0,0,0,0.16)', fg: '#0E0E0E', fg2: 'rgba(14,14,14,0.64)', fg3: 'rgba(14,14,14,0.58)' }
  },
  soft: {
    name: 'Soft neutral',
    fu: "'Figtree',-apple-system,system-ui,sans-serif", fn: "'Figtree',-apple-system,system-ui,sans-serif", fm: "'IBM Plex Mono',ui-monospace,monospace",
    r: '26px', rb: '20px', rp: '999px',
    dark: { bg: '#16151A', surf: '#211F27', surf2: '#2B2833', line: 'rgba(255,255,255,0.07)', fg: '#F4F2F7', fg2: 'rgba(244,242,247,0.60)', fg3: 'rgba(244,242,247,0.56)' },
    light: { bg: '#F6F3EF', surf: '#FFFDFB', surf2: '#EEE9E2', line: 'rgba(0,0,0,0.07)', fg: '#1A1720', fg2: 'rgba(26,23,32,0.60)', fg3: 'rgba(26,23,32,0.56)' }
  },
  ink: {
    name: 'Ink and paper',
    fu: "'Helvetica Neue',Helvetica,Arial,sans-serif", fn: "'Instrument Serif',Georgia,serif", fm: "'IBM Plex Mono',ui-monospace,monospace",
    r: '0px', rb: '0px', rp: '0px',
    dark: { bg: '#0E0D0C', surf: '#0E0D0C', surf2: '#1A1816', line: 'rgba(243,239,231,0.18)', fg: '#F3EFE7', fg2: 'rgba(243,239,231,0.62)', fg3: 'rgba(243,239,231,0.58)' },
    light: { bg: '#FAF7F1', surf: '#FAF7F1', surf2: '#EFE9DE', line: 'rgba(20,18,15,0.20)', fg: '#14120F', fg2: 'rgba(20,18,15,0.64)', fg3: 'rgba(20,18,15,0.58)' }
  }
};

var THEME_IDS = ['dark-gym', 'swiss', 'soft', 'ink'];
var RANGES = [{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All' }];
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var RANGE_MS = { week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5, all: Infinity };
var LOG_PAGE = 80;

/* Reminder wording. Deliberately says nothing about which exercise — the
   nudge is to show up, and you pick what to do when you get there. */
var NUDGES = [
  'Time for your minute.',
  'Sixty seconds. That is the whole ask.',
  'Your minute is waiting.',
  'Got a minute? This is it.',
  'One minute, then you are done.',
  'This is your nudge.',
  'Sixty seconds well spent.',
  'Quick one — sixty seconds.',
  'Your minute, whenever you are ready.',
  'One minute. That is all.'
];

var HAS_NOTIF = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

/* Web Push. config.js supplies { endpoint, vapidPublicKey }; with neither set
   the app falls back to the foreground reminder engine, which can only fire
   while the app is running. Real delivery to a closed app needs the server. */
var PUSH = window.MINUTE_PUSH || {};
var PUSH_KEY = PUSH.vapidPublicKey || '';
var PUSH_API = PUSH.endpoint ? String(PUSH.endpoint).replace(/\/+$/, '') : '';
/* 'server'  a live endpoint stores the subscription for us
   'manual'  no endpoint: the device shows a code to paste into a GitHub
             Actions secret once, and the cron there does the sending
   'off'     no key at all — foreground reminders only */
var PUSH_MODE = PUSH_API && PUSH_KEY ? 'server' : (PUSH_KEY ? 'manual' : 'off');
var PUSH_ON = PUSH_MODE !== 'off';

function urlB64ToUint8Array(b64) {
  var pad = new Array((4 - b64.length % 4) % 4 + 1).join('=');
  var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function lum(hex) {
  if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length < 7) return 0;
  var n = parseInt(hex.slice(1), 16);
  var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
}

function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

/* An installed iOS app gets its own storage, separate from Safari's, so
   choices made in the browser are invisible to it on first launch. iOS does
   capture the page URL when you add to the Home Screen, so the look travels in
   the query string instead. */
var LOOK_KEYS = ['theme', 'mode', 'accent', 'icon', 'ex'];

function lookFromQuery() {
  try {
    var q = new URLSearchParams(location.search);
    if (!q.get('theme') && !q.get('icon')) return null;
    var out = {};
    if (THEME_IDS.indexOf(q.get('theme')) >= 0) out.theme = q.get('theme');
    if (q.get('mode') === 'light' || q.get('mode') === 'dark') out.mode = q.get('mode');
    if (/^#[0-9a-fA-F]{6}$/.test(q.get('accent') || '')) out.accent = q.get('accent');
    var ic = parseInt(q.get('icon'), 10);
    if (ic >= 0 && ic <= 3) out.icon = ic;
    if (EXS.some(function (e) { return e.id === q.get('ex'); })) out.ex = q.get('ex');
    return Object.keys(out).length ? out : null;
  } catch (e) { return null; }
}

/* Keep the address bar in step with the current look while in a browser, so
   whatever is on screen is what gets installed. */
function syncLookToUrl(s) {
  if (isStandalone() || !history.replaceState) return;
  var sig = LOOK_KEYS.map(function (k) { return s[k]; }).join('|');
  if (syncLookToUrl._sig === sig) return;
  syncLookToUrl._sig = sig;
  try {
    var q = LOOK_KEYS.map(function (k) { return k + '=' + encodeURIComponent(s[k]); }).join('&');
    history.replaceState(null, '', location.pathname + '?' + q);
  } catch (e) {}
}


function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}

function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function download(text, filename, mime) {
  var blob = new Blob([text], { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
}

function stamp() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ------------------------------------------------------------------- app - */

var app = {

  props: { theme: 'dark-gym', accent: '#FF7A29', appearance: 'dark' },

  state: {
    page: 'home',
    ex: 'push',
    theme: 'dark-gym',
    mode: 'dark',
    accent: '#FF7A29',
    icon: 0,
    notif: false,
    notifMode: 'interval',
    interval: 4,
    times: [],
    lastNotif: 0,
    lookSig: null,
    dH: 6, dM: 6, dP: 0,
    logged: [],
    rest: [],
    phase: 'idle',
    countVal: 3,
    remaining: 60,
    entry: '',
    elapsed: 60,
    range: 'all',
    scrub: null,
    toast: null,
    /* additions */
    logLimit: LOG_PAGE,
    selSet: null,
    clearArm: false,
    perm: HAS_NOTIF ? Notification.permission : 'unsupported',
    canInstall: false,
    updateReady: false,
    pushLive: false,
    pushErr: null,
    pushSub: null
  },

  setState: function (patch, cb) {
    var p = typeof patch === 'function' ? patch(this.state) : patch;
    if (p) for (var k in p) this.state[k] = p[k];
    schedule();
    if (cb) cb();
  },

  set: function (patch, cb) {
    this.setState(patch, function () { app.persist(); if (cb) cb(); });
  },

  /* ---------------------------------------------------------- lifecycle - */

  mount: function () {
    var look = lookFromQuery();
    var lookSig = look ? JSON.stringify(look) : null;
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        this.setState(function (s) {
          return {
            logged: Array.isArray(d.logged) ? d.logged : s.logged,
            rest: Array.isArray(d.rest) ? d.rest : s.rest,
            ex: d.ex || s.ex, accent: d.accent || s.accent, mode: d.mode || s.mode,
            theme: d.theme || s.theme, icon: typeof d.icon === 'number' ? d.icon : s.icon,
            notif: !!d.notif, notifMode: d.notifMode || s.notifMode,
            interval: d.interval || s.interval,
            times: Array.isArray(d.times) ? d.times : s.times,
            lastNotif: d.lastNotif || 0,
            lookSig: d.lookSig || null
          };
        });
      }
      /* Adopt the look the installer captured when it is one this copy has not
         seen before. Keying off "nothing stored" alone is not enough: iOS does
         not reliably clear an app's storage when its icon is deleted, so a
         re-add would silently keep the old look.
         An existing install updating for the first time has no signature yet.
         Adopting there would undo whatever the user had already changed in the
         app, so record the signature and leave their settings alone — only a
         genuinely new install, or a later re-install made with different
         choices, actually applies it. */
      if (look) {
        var seen = this.state.lookSig;
        if (seen === null || seen === undefined || seen !== lookSig) {
          if (seen !== null && seen !== undefined) this.setState(look);
          else if (!raw) this.setState(look);
          this.setState({ lookSig: lookSig });
          /* Write it out here rather than waiting for the next settings
             change: setState alone is memory-only, so the signature would be
             recomputed as "unseen" on every launch and a later re-install with
             different choices would never register as new. */
          this.persist();
        }
      }
    } catch (e) {}

    this.applyTheme();
    this.applyIcon();

    this.timer = setInterval(function () { app.tick(); }, 40);
    this.reminder = setInterval(function () { app.dayWatch(); app.reminderTick(); }, 30000);
    this._day = new Date().toDateString();

    document.addEventListener('visibilitychange', function () { app.onVisibility(); });
    window.addEventListener('pageshow', function () { app.onVisibility(); });

    /* A rotation can leave iOS with the page scrolled or sized to the old
       orientation. Nothing has crashed, but taps land where the layout used to
       be, which reads as a frozen app. Reset the scroll and redraw. */
    var onResize = function () {
      try { window.scrollTo(0, 0); } catch (e) {}
      schedule();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      app._installEvt = e;
      app.setState({ canInstall: true });
    });
    window.addEventListener('appinstalled', function () {
      app._installEvt = null;
      app.setState({ canInstall: false });
    });

    var fileEl = document.getElementById('import-file');
    if (fileEl) fileEl.addEventListener('change', function () { app.readImport(this); });
  },

  persist: function () {
    var s = this.state;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        logged: s.logged, rest: s.rest, ex: s.ex, accent: s.accent, mode: s.mode, theme: s.theme,
        icon: s.icon, notif: s.notif, notifMode: s.notifMode, interval: s.interval,
        times: s.times, lastNotif: s.lastNotif, lookSig: s.lookSig
      }));
    } catch (e) {}
    /* Any settings change is a reason to re-send prefs to the push server. */
    if (PUSH_ON && s.notif) {
      clearTimeout(this._syncT);
      this._syncT = setTimeout(function () { app.syncPush(); }, 800);
    }
  },

  applyTheme: function () {
    var st = this.state || {};
    var accent = st.accent || '#FF7A29';
    this._sig = st.theme + '|' + st.mode + '|' + accent;
    var t = THEMES[st.theme] || THEMES['dark-gym'];
    var p = t[st.mode] || t.dark;
    var el = document.documentElement;
    var la = lum(accent);
    var cr = function (c) { var l = lum(c); var hi = Math.max(la, l), lo = Math.min(la, l); return (hi + 0.05) / (lo + 0.05); };
    var ink = cr('#141210') >= cr('#FFFFFF') ? '#141210' : '#FFFFFF';
    var vars = {
      bg: p.bg, surf: p.surf, surf2: p.surf2, line: p.line, fg: p.fg, fg2: p.fg2, fg3: p.fg3,
      accent: accent, 'accent-ink': ink, r: t.r, rb: t.rb, rp: t.rp, fu: t.fu, fn: t.fn, fm: t.fm
    };
    Object.keys(vars).forEach(function (k) { el.style.setProperty('--' + k, vars[k]); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.bg);
    document.body.style.background = p.bg;
    /* The canvas propagates from html and paints beyond the viewport, which is
       where an installed iOS app leaves a strip under the home indicator. Tab
       bar colour there makes it read as part of the bar. */
    document.documentElement.style.background = p.surf;
  },

  applyIcon: function () {
    var i = this.state.icon;
    if (this._icoSig === i) return;
    this._icoSig = i;
    var a = document.getElementById('apple-icon');
    if (a) a.setAttribute('href', './icons/icon-' + i + '-180.png');
    var m = document.getElementById('manifest-link');
    if (m) m.setAttribute('href', i ? './manifest-' + i + '.webmanifest' : './manifest.webmanifest');
  },

  didRender: function () {
    var st = this.state || {};
    if (st.theme + '|' + st.mode + '|' + st.accent !== this._sig) this.applyTheme();
    this.applyIcon();
    syncLookToUrl(st);
  },

  dayKey: function (ts) { return new Date(ts).toDateString(); },

  restedOn: function (key) { return (this.state.rest || []).indexOf(key) >= 0; },

  trainedOn: function (key) {
    var self = this;
    return this.state.logged.some(function (x) { return self.dayKey(x.ts) === key; });
  },

  /* Walks back from today counting consecutive days trained. A rest day
     bridges the chain without adding to it — the streak survives, but taking
     the day off does not inflate it. Today missing is tolerated: the day is
     not over yet.
     Steps a real date rather than subtracting 24h, which lands on the same
     day twice across a DST change and would miscount the streak. */
  streak: function () {
    var trained = {};
    this.sessions().forEach(function (x) { trained[new Date(x.ts).toDateString()] = 1; });
    var d = new Date();
    d.setHours(12, 0, 0, 0);                 /* noon keeps DST off the boundary */
    var n = 0;
    for (var i = 0; i < 400; i++) {
      var key = d.toDateString();
      if (trained[key]) n++;
      else if (!this.restedOn(key) && i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  },

  restDay: function () {
    var key = app.dayKey(Date.now());
    if (app.restedOn(key)) {
      app.set(function (st) {
        return { rest: st.rest.filter(function (k) { return k !== key; }) };
      });
      app.toastMsg('Rest day removed.');
      return;
    }
    if (app.trainedOn(key)) { app.toastMsg('You already logged a minute today.'); return; }
    app.set(function (st) { return { rest: (st.rest || []).concat([key]) }; });
    var n = app.streak();
    app.toastMsg(n ? 'Rest day logged — ' + n + ' day streak safe.' : 'Rest day logged.');
  },

  /* "today" and "yesterday" are rendered once and then sit there. Without a
     nudge at midnight the last-set label stays stale until something else
     happens to redraw. */
  dayWatch: function () {
    var d = new Date().toDateString();
    if (this._day !== d) { this._day = d; schedule(); }
  },

  sessions: function () {
    var ex = this.state.ex;
    return this.state.logged.filter(function (s) { return s.ex === ex; }).sort(function (a, b) { return a.ts - b.ts; });
  },

  lastSetTs: function () {
    return this.state.logged.reduce(function (m, x) { return x.ts > m ? x.ts : m; }, 0);
  },

  /* -------------------------------------------------------------- timer - */

  tick: function () {
    var s = this.state;
    if (s.phase === 'count') {
      var left = Math.ceil((this.countAt - Date.now()) / 1000);
      if (left <= 0) {
        this.runAt = this.countAt + 60000;
        this.setState({ phase: 'run', remaining: Math.max(0, (this.runAt - Date.now()) / 1000) });
        this.blip(660, 0.12);
      } else if (left !== s.countVal) { this.setState({ countVal: left }); this.blip(520, 0.07); }
      return;
    }
    if (s.phase !== 'run') return;
    var rem = Math.max(0, (this.runAt - Date.now()) / 1000);
    if (rem <= 0) { this.finish(); return; }
    this.setState({ remaining: rem });
  },

  finish: function () {
    this.setState({ phase: 'entry', remaining: 0, elapsed: 60, entry: '' });
    this.releaseWake();
    this.alarm();
    if (document.hidden) this.notify("Your minute's up — log your reps while you remember them.");
  },

  /* Recover from a backgrounded/suspended tab: timers stop, but countAt and
     runAt are absolute, so the correct phase can be recomputed on resume. */
  onVisibility: function () {
    if (document.hidden) return;
    this.clearNudges();
    var s = this.state;
    if (s.phase === 'count' || s.phase === 'run') {
      this.ac();
      this.requestWake();
    }
    if (s.phase === 'count' && this.countAt && Date.now() >= this.countAt) {
      this.runAt = this.countAt + 60000;
      this.setState({ phase: 'run', remaining: Math.max(0, (this.runAt - Date.now()) / 1000) });
    }
    if (this.state.phase === 'run' && this.runAt && Date.now() >= this.runAt) this.finish();
    this.reminderTick();
  },

  ac: function () {
    if (!this._ac) { var C = window.AudioContext || window.webkitAudioContext; if (C) this._ac = new C(); }
    if (this._ac && this._ac.state === 'suspended') this._ac.resume();
    return this._ac;
  },

  blip: function (freq, dur, when) {
    var ac = this.ac(); if (!ac) return;
    var t0 = ac.currentTime + (when || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.32, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  },

  alarm: function () {
    var self = this;
    [0, 0.26, 0.52].forEach(function (d) { self.blip(880, 0.2, d); });
    this.blip(1320, 0.5, 0.78);
    if (navigator.vibrate) navigator.vibrate([180, 90, 180, 90, 420]);
  },

  requestWake: function () {
    if (!navigator.wakeLock || this._wl) return;
    navigator.wakeLock.request('screen').then(function (l) {
      app._wl = l;
      l.addEventListener('release', function () { app._wl = null; });
    }).catch(function () {});
  },

  releaseWake: function () {
    if (this._wl) { try { this._wl.release(); } catch (e) {} this._wl = null; }
  },

  start: function () {
    app.ac();
    app.countAt = Date.now() + 3000;
    app.runAt = app.countAt + 60000;
    app.setState({ phase: 'count', countVal: 3, remaining: 60 });
    app.requestWake();
    app.blip(520, 0.07);
  },

  cancel: function () {
    app.releaseWake();
    app.setState({ phase: 'idle', remaining: 60, entry: '' });
  },

  saveSet: function () {
    var reps = parseInt(app.state.entry, 10);
    if (!reps) return;
    var list = app.sessions();
    var prev = list[list.length - 1];
    var best = list.reduce(function (m, s) { return Math.max(m, s.reps); }, 0);
    var rec = { i: 'u' + Date.now(), ex: app.state.ex, ts: Date.now(), reps: reps, dur: app.state.elapsed };
    var msg;
    if (reps > best) msg = 'New personal best — ' + reps + ' reps.';
    else if (!prev) msg = 'First one logged. ' + reps + ' reps on the board.';
    else if (reps > prev.reps) msg = 'Nice, +' + (reps - prev.reps) + ' on your last set.';
    else if (reps === prev.reps) msg = 'Matched your last set. Consistent.';
    else msg = 'Logged — ' + (best - reps) + ' off your best. Next one.';
    app.set(function (s) {
      return { logged: s.logged.concat([rec]), phase: 'idle', entry: '', remaining: 60, scrub: null };
    });
    app.toastMsg(msg);
  },

  toastMsg: function (msg) {
    this.setState({ toast: msg });
    clearTimeout(this.toastT);
    this.toastT = setTimeout(function () { app.setState({ toast: null }); }, 2800);
  },

  key: function (k) {
    return function () {
      if (k === 'del') return app.setState(function (s) { return { entry: s.entry.slice(0, -1) }; });
      app.setState(function (s) { return s.entry.length >= 3 ? null : { entry: (s.entry === '0' ? '' : s.entry) + k }; });
    };
  },

  /* ------------------------------------------------------ notifications - */

  /* The message goes in the title slot and there is no body. Every platform
     already labels a notification with the app it came from, so putting the
     name here as well renders as "One Minute from One Minute". */
  notify: function (message) {
    if (!HAS_NOTIF || Notification.permission !== 'granted') return;
    var opts = {
      icon: './icons/icon-' + this.state.icon + '-192.png',
      badge: './icons/icon-' + this.state.icon + '-192.png',
      tag: 'minute',
      renotify: true,
      vibrate: [180, 90, 180]
    };
    if (this.swReg && this.swReg.showNotification) this.swReg.showNotification(message, opts).catch(function () {});
    else { try { new Notification(message, opts); } catch (e) {} }
  },

  /* Everything the server needs to fire the right nudge at the right time.
     Times are local wall-clock plus a tz, so the server stays DST-correct. */
  pushPrefs: function () {
    var s = this.state;
    return {
      enabled: s.notif,
      mode: s.notifMode,
      intervalHours: s.interval,
      times: s.times.slice().sort(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      exercise: s.ex,
      icon: s.icon,
      lastSetTs: this.lastSetTs()
    };
  },

  subscribePush: function () {
    if (!PUSH_ON || !app.swReg || !app.swReg.pushManager) return Promise.resolve(false);
    return app.swReg.pushManager.getSubscription().then(function (sub) {
      if (sub) return sub;
      return app.swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(PUSH_KEY)
      });
    }).then(function (sub) {
      if (PUSH_MODE === 'manual') {
        app.setState({ pushSub: sub ? sub.toJSON() : null, pushErr: null });
        return !!sub;
      }
      return app.syncPush(sub);
    }).catch(function (e) {
      app.setState({ pushLive: false, pushSub: null, pushErr: String((e && e.message) || e) });
      return false;
    });
  },

  /* The blob that goes into the PUSH_SUBSCRIPTIONS secret: who to push to,
     plus the schedule to push on. Re-copy it after changing reminder times. */
  deviceCode: function () {
    if (!this.state.pushSub) return '';
    return JSON.stringify([{ subscription: this.state.pushSub, prefs: this.pushPrefs() }], null, 2);
  },

  /* Getting this off the phone and into a repo secret is the awkward bit, so
     offer the share sheet first — that is what makes it a two-tap job. */
  copyDeviceCode: function () {
    var code = app.deviceCode();
    if (!code) { app.toastMsg('Turn reminders on first.'); return; }

    var toFile = function () {
      download(code, 'one-minute-device.json', 'application/json');
      app.toastMsg('Saved as a file.');
    };
    var toClipboard = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(code).then(function () { app.toastMsg('Device code copied.'); }, toFile);
      }
      toFile();
    };

    if (navigator.share) {
      navigator.share({ title: APP_NAME + ' device code', text: code })
        .then(function () { app.toastMsg('Sent.'); })
        .catch(function (e) { if (!e || e.name !== 'AbortError') toClipboard(); });
      return;
    }
    toClipboard();
  },

  syncPush: function (sub) {
    if (!PUSH_ON || !app.swReg) return Promise.resolve(false);
    var send = function (s) {
      if (!s) return false;
      return fetch(PUSH_API + '/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: s, prefs: app.pushPrefs() })
      }).then(function (r) {
        app.setState({ pushLive: r.ok, pushErr: r.ok ? null : 'server said ' + r.status });
        return r.ok;
      }).catch(function (e) {
        app.setState({ pushLive: false, pushErr: 'unreachable' });
        return false;
      });
    };
    if (sub) return send(sub);
    return app.swReg.pushManager.getSubscription().then(send);
  },

  unsubscribePush: function () {
    if (!PUSH_ON || !app.swReg) return Promise.resolve();
    return app.swReg.pushManager.getSubscription().then(function (sub) {
      if (!sub) return;
      return fetch(PUSH_API + '/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      }).catch(function () {}).then(function () { return sub.unsubscribe(); });
    }).then(function () {
      app.setState({ pushLive: false, pushErr: null });
    }).catch(function () {});
  },

  toggleNotif: function () {
    var s = app.state;
    if (s.notif) {
      app.setState({ pushSub: null });
      app.set({ notif: false }, function () { app.unsubscribePush(); });
      return;
    }
    if (!HAS_NOTIF) { app.toastMsg('This browser has no notification support.'); return; }
    if (Notification.permission === 'denied') {
      app.setState({ perm: 'denied' });
      app.toastMsg('Blocked in system settings — turn ' + APP_NAME + ' back on there.');
      return;
    }
    if (Notification.permission === 'granted') {
      app.set({ notif: true, perm: 'granted', lastNotif: Date.now() }, function () { app.subscribePush(); });
      return;
    }
    /* Must be called straight off the tap — this is the user gesture. */
    Notification.requestPermission().then(function (p) {
      app.setState({ perm: p });
      if (p === 'granted') app.set({ notif: true, lastNotif: Date.now() }, function () { app.subscribePush(); });
      else app.toastMsg(p === 'denied' ? 'Blocked — enable ' + APP_NAME + ' in system settings.' : 'Notifications not enabled.');
    }).catch(function () {});
  },

  /* One nudge per window, skipped when a set was already logged in it. */
  dueAt: function () {
    var s = this.state, now = Date.now();
    if (!s.notif || !HAS_NOTIF || Notification.permission !== 'granted') return 0;
    if (s.notifMode === 'interval') {
      var step = s.interval * 3600e3;
      var base = Math.max(this.lastSetTs(), s.lastNotif || 0, startOfToday());
      var at = base + step;
      return now >= at ? at : 0;
    }
    var best = 0, last = this.lastSetTs();
    s.times.forEach(function (t) {
      var p = t.split(':'), hh = +p[0], mm = +p[1];
      for (var d = 0; d < 2; d++) {
        var dt = new Date();
        dt.setDate(dt.getDate() - d);
        dt.setHours(hh, mm, 0, 0);
        var ts = dt.getTime();
        if (ts <= now && now - ts < 2 * 3600e3 && ts > best) best = ts;
      }
    });
    if (!best || (s.lastNotif || 0) >= best || last >= best) return 0;
    return best;
  },

  /* Clear anything already on screen and treat opening the app as having
     answered the nudge, so launching it — whether from the icon or from the
     notification itself — cannot trigger a second one. */
  clearNudges: function () {
    if (app.swReg && app.swReg.getNotifications) {
      app.swReg.getNotifications({ tag: 'minute' }).then(function (list) {
        list.forEach(function (n) { n.close(); });
      }).catch(function () {});
    }
    if (app.state.notif && Date.now() - (app.state.lastNotif || 0) > 60000) {
      app.set({ lastNotif: Date.now() });
    }
  },

  reminderTick: function () {
    /* Once a push server is configured it owns delivery outright. Leaving the
       in-app engine running as a backup means a second notification fires the
       moment the app is opened, because the server's sends are invisible to
       this device's lastNotif. */
    if (PUSH_ON || this.state.pushLive) return;
    var at = this.dueAt();
    if (!at) return;
    this.set({ lastNotif: Date.now() });
    this.notify(NUDGES[Math.floor(Math.random() * NUDGES.length)]);
  },

  /* -------------------------------------------------------- import/export */

  exportJSON: function () {
    var s = app.state;
    download(JSON.stringify({
      app: 'minute', schema: 1, version: APP_VERSION, exportedAt: new Date().toISOString(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      settings: {
        ex: s.ex, theme: s.theme, mode: s.mode, accent: s.accent, icon: s.icon,
        notif: s.notif, notifMode: s.notifMode, interval: s.interval, times: s.times
      },
      sets: s.logged,
      rest: s.rest || []
    }, null, 2), 'minute-' + stamp() + '.json', 'application/json');
    app.toastMsg('Exported ' + s.logged.length + ' sets.');
  },

  exportCSV: function () {
    var rows = ['client_id,exercise,performed_at,reps,duration_s,seconds_per_rep'];
    app.state.logged.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (x) {
      rows.push([x.i, x.ex, new Date(x.ts).toISOString(), x.reps, x.dur, (x.dur / x.reps).toFixed(2)].join(','));
    });
    download(rows.join('\n'), 'minute-sets-' + stamp() + '.csv', 'text/csv');
    app.toastMsg('Exported ' + app.state.logged.length + ' sets.');
  },

  pickImport: function () {
    var el = document.getElementById('import-file');
    if (el) { el.value = ''; el.click(); }
  },

  readImport: function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(String(fr.result));
        var incoming = Array.isArray(d.sets) ? d.sets : (Array.isArray(d.logged) ? d.logged : null);
        if (!incoming) { app.toastMsg("That file doesn't look like a " + APP_NAME + " export."); return; }
        var seen = {}, merged = [], added = 0;
        app.state.logged.forEach(function (x) { var k = x.i || x.ts; if (!seen[k]) { seen[k] = 1; merged.push(x); } });
        incoming.forEach(function (x) {
          if (!x || typeof x.reps !== 'number' || typeof x.ts !== 'number') return;
          var k = x.i || x.ts;
          if (seen[k]) return;
          seen[k] = 1;
          merged.push({ i: x.i || ('u' + x.ts), ex: x.ex || 'push', ts: x.ts, reps: x.reps, dur: typeof x.dur === 'number' ? x.dur : 60 });
          added++;
        });
        merged.sort(function (a, b) { return a.ts - b.ts; });
        var rest = (app.state.rest || []).slice();
        if (Array.isArray(d.rest)) d.rest.forEach(function (k) {
          if (typeof k === 'string' && rest.indexOf(k) < 0) rest.push(k);
        });
        app.set({ logged: merged, rest: rest, scrub: null, logLimit: LOG_PAGE });
        app.toastMsg(added ? 'Imported ' + added + ' new sets.' : 'Nothing new to import.');
      } catch (e) { app.toastMsg("Couldn't read that file."); }
    };
    fr.readAsText(f);
  },

  install: function () {
    if (!app._installEvt) return;
    app._installEvt.prompt();
    app._installEvt = null;
    app.setState({ canInstall: false });
  },

  /* ------------------------------------------------------------ helpers - */

  draft24: function () {
    var h12 = this.state.dH + 1;
    var hr = (h12 % 12) + this.state.dP * 12;
    return String(hr).padStart(2, '0') + ':' + String(this.state.dM * 5).padStart(2, '0');
  },

  wheelRef: function (key, idx) {
    return function (el) { if (el && el._k !== key) { el._k = key; el.scrollTop = idx * 44; } };
  },

  wheelScroll: function (key, max) {
    return function (e) {
      var el = e.currentTarget || e.target;
      clearTimeout(app['_w' + key]);
      app['_w' + key] = setTimeout(function () {
        var i = Math.max(0, Math.min(max, Math.round(el.scrollTop / 44)));
        if (app.state[key] !== i) app.setState({ [key]: i });
      }, 110);
    };
  },

  fmt12: function (t) {
    var p = t.split(':'), hr = +p[0];
    return ((hr % 12) || 12) + ':' + p[1] + ' ' + (hr < 12 ? 'AM' : 'PM');
  },

  chartAt: function (e) {
    var r = e.currentTarget.getBoundingClientRect();
    var pts = this.points();
    if (!pts.length) return;
    var f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    this.setState({ scrub: Math.round(f * (pts.length - 1)) });
  },

  chartDown: function (e) {
    app.dragging = true;
    if (e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
    app.chartAt(e);
  },
  chartMove: function (e) { if (app.dragging) app.chartAt(e); },
  chartUp: function () { app.dragging = false; },

  inRange: function () {
    var all = this.sessions();
    var span = RANGE_MS[this.state.range];
    if (span === Infinity) return all;
    var cut = Date.now() - span;
    return all.filter(function (s) { return s.ts >= cut; });
  },

  points: function () {
    var list = this.inRange();
    if (list.length < 2) return list.map(function (s) { return { x: 160, y: 66, s: s }; });
    var reps = list.map(function (s) { return s.reps; });
    var min = Math.min.apply(null, reps), max = Math.max.apply(null, reps);
    var span = max - min || 1;
    return list.map(function (s, i) {
      return { x: 6 + (i / (list.length - 1)) * 308, y: 118 - ((s.reps - min) / span) * 100, s: s };
    });
  },

  fmtDay: function (ts) { var d = new Date(ts); return DAYS[d.getDay()] + ' ' + d.getDate(); },
  fmtShort: function (ts) { var d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate(); },

  /* Calendar days, not elapsed milliseconds. Dividing the gap by 24h means a
     set logged at 8pm yesterday reads "today" until 8pm tonight; comparing
     midnights makes it "yesterday" the moment the date rolls over. */
  ago: function (ts) {
    var a = new Date(ts); a.setHours(0, 0, 0, 0);
    var b = new Date(); b.setHours(0, 0, 0, 0);
    var d = Math.round((b.getTime() - a.getTime()) / 864e5);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 7) return d + 'd ago';
    if (d < 60) return Math.round(d / 7) + 'w ago';
    return Math.round(d / 30) + 'mo ago';
  },

  pill: function (active) {
    return 'flex:1;padding:10px 6px;border-radius:var(--rp);text-align:center;font-size:14.5px;font-weight:600;letter-spacing:.01em;transition:background .16s,color .16s;' +
      (active ? 'background:var(--accent);color:var(--accent-ink)' : 'background:transparent;color:var(--fg2)');
  },
  mini: function (active) {
    return 'padding:7px 13px;border-radius:var(--rp);font-size:13.5px;font-weight:600;' +
      (active ? 'background:var(--accent);color:var(--accent-ink)' : 'background:transparent;color:var(--fg2)');
  },
  chip: function (active) {
    return 'padding:9px 14px;border-radius:var(--rp);font-family:var(--fm);font-size:13px;border:1px solid ' +
      (active ? 'var(--accent);background:color-mix(in oklab, var(--accent) 18%, transparent);color:var(--accent)' : 'var(--line);background:transparent;color:var(--fg2)');
  },
  wheelItem: function (active) {
    return 'height:44px;line-height:44px;scroll-snap-align:center;font-family:var(--fm);font-size:18px;transition:color .15s,opacity .15s;' +
      (active ? 'color:var(--fg);opacity:1' : 'color:var(--fg2);opacity:.5');
  },
  track: function (on) {
    return 'width:50px;height:30px;border-radius:999px;padding:3px;display:flex;transition:background .18s;background:' + (on ? 'var(--accent)' : 'var(--surf2)') +
      ';justify-content:' + (on ? 'flex-end' : 'flex-start');
  },
  knob: function (on) {
    return 'width:24px;height:24px;border-radius:50%;background:' + (on ? 'var(--accent-ink)' : 'var(--fg3)') + ';transition:background .18s';
  },
  icoSt: function (i) {
    return 'width:64px;height:64px;border-radius:16px;padding:0;overflow:hidden;transition:box-shadow .15s;box-shadow:0 0 0 ' +
      (this.state.icon === i ? '2.5px var(--surf),0 0 0 5px var(--accent)' : '1px var(--line)');
  },
  rowBtn: function () {
    return 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:var(--fg)';
  },

  /* ---------------------------------------------------------- renderVals - */

  renderVals: function () {
    var self = this;
    var s = this.state;
    var ex = EXS.filter(function (e) { return e.id === s.ex; })[0] || EXS[0];
    var list = this.sessions();
    var last = list[list.length - 1];
    var best = list.reduce(function (m, x) { return x.reps > m.reps ? x : m; }, { reps: 0, ts: 0 });

    /* log grouping — month totals come from the full list, only the rendered
       rows are capped, so the headers stay correct while paginating. */
    var groups = [], shown = 0;
    var reversed = list.slice().reverse();
    reversed.forEach(function (x) {
      var d = new Date(x.ts), y = d.getFullYear(), mi = d.getMonth();
      var g = groups[groups.length - 1];
      if (!g || g.y !== y) { g = { y: y, year: String(y), months: [] }; groups.push(g); }
      var m = g.months[g.months.length - 1];
      if (!m || m.mi !== mi) { m = { mi: mi, label: MONTHS[mi], rows: [], reps: 0, dur: 0 }; g.months.push(m); }
      m.reps += x.reps; m.dur += x.dur;
      if (shown < s.logLimit) {
        shown++;
        var id = x.i || String(x.ts);
        m.rows.push({
          id: id,
          day: self.fmtDay(x.ts),
          reps: x.reps,
          pace: (x.dur / x.reps).toFixed(1) + ' s/rep',
          sel: s.selSet === id,
          tap: (function (rid) { return function () { app.setState(function (st) { return { selSet: st.selSet === rid ? null : rid }; }); }; })(id),
          del: (function (rid) {
            return function (e) {
              if (e && e.stopPropagation) e.stopPropagation();
              app.set(function (st) {
                return { logged: st.logged.filter(function (r) { return (r.i || String(r.ts)) !== rid; }), selSet: null, scrub: null };
              });
              app.toastMsg('Set deleted.');
            };
          })(id)
        });
      }
    });
    groups.forEach(function (g) {
      g.months = g.months.filter(function (m) {
        m.meta = m.reps.toLocaleString() + ' reps · ' + (m.dur / m.reps).toFixed(1) + ' s/rep';
        return m.rows.length;
      });
    });
    groups = groups.filter(function (g) { return g.months.length; });

    /* stats */
    var rl = this.inRange();
    var lifetime = list.reduce(function (a, x) { return a + x.reps; }, 0);
    var rangeReps = rl.reduce(function (a, x) { return a + x.reps; }, 0);
    var rangeDur = rl.reduce(function (a, x) { return a + x.dur; }, 0);
    var avg = function (arr) { return arr.length ? Math.round(arr.reduce(function (a, b) { return a + b.reps; }, 0) / arr.length) : 0; };
    /* Compare the opening sets against the most recent ones, with a window
       that grows as the log does: one set each side up to 3 logged, two up to
       5, three from 6 on. Sized so the two windows never overlap — a fixed
       window of 3 has them sharing sets below 6, which made "then" and "now"
       come out identical at 2 and 3 sets. */
    var win = rl.length >= 6 ? 3 : rl.length >= 4 ? 2 : 1;
    var thenAvg = avg(rl.slice(0, win)), nowAvg = avg(rl.slice(-win));
    var gain = nowAvg - thenAvg;
    var slope = 0;
    if (rl.length > 2) {
      var t0 = rl[0].ts;
      var xs = rl.map(function (x) { return (x.ts - t0) / 864e5; }), ys = rl.map(function (x) { return x.reps; });
      var mx = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
      var my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length;
      var num = 0, den = 0;
      xs.forEach(function (x, i) { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
      slope = den ? num / den : 0;
    }
    /* The trend rate is quoted in a unit that suits the span being looked at:
       a per-month figure is meaningless spread over an all-time log. */
    var perUnit = s.range === 'week' ? 1 : s.range === 'month' ? 7 : s.range === 'year' ? 30 : 365;
    var perLabel = s.range === 'week' ? 'per day' : s.range === 'month' ? 'per week' : s.range === 'year' ? 'per month' : 'per year';
    var rangeWord = s.range === 'all' ? 'all time' : 'this ' + s.range;

    var pts = this.points();
    var si = pts.length ? Math.min(pts.length - 1, s.scrub === null ? pts.length - 1 : s.scrub) : 0;
    var sp = pts[si];
    var line = pts.length > 1 ? pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ') : '';
    var area = pts.length > 1 ? line + ' L314 128 L6 128 Z' : '';

    var streak = this.streak();
    var todayKey = this.dayKey(Date.now());
    var restedToday = this.restedOn(todayKey);

    var reps = parseInt(s.entry, 10) || 0;
    var t = THEMES[s.theme] || THEMES['dark-gym'];
    var draft = this.draft24();
    var dupe = s.times.indexOf(draft) >= 0;

    /* Only says something when there is something to do about it — how the
       reminders get delivered is not the user's problem. */
    var notifSub, notifNote = null;
    if (!HAS_NOTIF) notifSub = 'Not supported on this browser';
    else if (s.perm === 'denied') {
      notifSub = 'Blocked in system settings';
      notifNote = 'Notifications are blocked for this site. Re-enable them in your device settings, then flip this back on.';
    } else if (s.notif) {
      if (isIOS() && !isStandalone()) {
        notifSub = 'Add to Home Screen first';
        notifNote = 'On iPhone, add ' + APP_NAME + ' to your Home Screen and open it from there — iOS only delivers notifications to installed web apps.';
      } else notifSub = 'On';
    } else notifSub = 'Off';

    return {
      isHome: s.page === 'home', isLog: s.page === 'log', isStats: s.page === 'stats', isSet: s.page === 'settings',
      idle: s.phase === 'idle', running: s.phase === 'run', counting: s.phase === 'count', entering: s.phase === 'entry',
      countVal: s.countVal, toast: s.toast,

      exLabel: ex.label, exLower: ex.lower, exSubLabel: 'Max ' + ex.lower + ' in 60 seconds',
      exOpts: EXS.map(function (e) {
        return { label: e.short, pick: function () { app.set({ ex: e.id, scrub: null, selSet: null, logLimit: LOG_PAGE }); }, segSt: self.pill(e.id === s.ex) };
      }),
      exNext: function () {
        app.set(function (st) {
          var idx = 0;
          EXS.forEach(function (e, i) { if (e.id === st.ex) idx = i; });
          return { ex: EXS[(idx + 1) % 3].id, scrub: null, selSet: null, logLimit: LOG_PAGE };
        });
      },
      clock: s.phase === 'run'
        ? Math.floor(Math.ceil(s.remaining) / 60) + ':' + String(Math.ceil(s.remaining) % 60).padStart(2, '0')
        : s.phase === 'entry' ? '0:00' : '1:00',
      ringOffset: (741.4 * (1 - (s.phase === 'run' ? s.remaining / 60 : s.phase === 'entry' ? 0 : 1))).toFixed(1),
      phaseLabel: s.phase === 'run' ? 'Go' : s.phase === 'entry' ? "Time's up" : 'Ready',
      start: this.start, cancel: this.cancel, saveSet: this.saveSet,

      lastReps: last ? last.reps : '—', lastWhen: last ? this.ago(last.ts) : 'no sets yet',
      bestReps: best.reps || '—', bestWhen: best.ts ? this.ago(best.ts) : '—',
      streakLabel: streak + ' day streak',
      restDay: this.restDay,
      restLabel: restedToday ? 'Resting today' : 'Rest day',
      restSt: 'align-self:center;height:38px;padding:0 20px;border-radius:var(--rp);font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;font-family:var(--fu);border:1px solid var(--line);background:var(--surf2);color:' +
        (restedToday ? 'var(--accent)' : 'var(--fg2)'),

      logGroups: groups, logEmpty: !list.length,
      logSummary: list.length ? list.length + (list.length === 1 ? ' set · ' : ' sets · ') + lifetime.toLocaleString() + ' reps' : 'No sets yet',
      logMore: reversed.length > shown,
      logMoreLabel: 'Show ' + Math.min(LOG_PAGE, reversed.length - shown) + ' more',
      logMoreTap: function () { app.setState(function (st) { return { logLimit: st.logLimit + LOG_PAGE }; }); },

      ranges: RANGES.map(function (r) {
        return { label: r.label, pick: function () { app.setState({ range: r.id, scrub: null }); }, st: self.pill(r.id === s.range) };
      }),
      lifetime: lifetime.toLocaleString(),
      rangeDelta: rl.length ? '+' + rangeReps.toLocaleString() + ' ' + rangeWord : 'nothing logged ' + rangeWord,
      statCards: [
        { k: 'Then → now', v: rl.length > 1 ? thenAvg + ' → ' + nowAvg : '—', sub: rl.length > 1 ? (gain >= 0 ? '+' + gain : gain) + ' reps a set' : 'need a few sets' },
        { k: 'Trend', v: rl.length > 2 ? (slope * perUnit >= 0 ? '+' : '') + (slope * perUnit).toFixed(1) : '—', sub: 'reps ' + perLabel },
        { k: 'Avg pace', v: rangeReps ? (rangeDur / rangeReps).toFixed(1) + 's' : '—', sub: 'per rep, ' + rangeWord },
        { k: 'Sets logged', v: rl.length || '—', sub: rangeWord }
      ],
      /* Nothing below the chart until there is something to say about it — the
         empty chart already explains itself. */
      statsNote: rl.length > 2
        ? (gain > 0
          ? 'Up ' + gain + ' reps a set since the start of ' + (s.range === 'all' ? 'your log' : 'the ' + s.range) + '. That progress is all yours — keep going.'
          : 'Holding steady around ' + nowAvg + '. Showing up is the hard part, and you’re doing it.')
        : null,
      hasChart: pts.length > 1, noChart: pts.length < 2,
      chartEmpty: rl.length === 1 ? 'One more minute and your trend line starts.' : 'Log two minutes to see your trend.',
      chartLine: line, chartArea: area,
      scrubX: sp ? sp.x.toFixed(1) : 160, scrubY: sp ? sp.y.toFixed(1) : 66,
      dotSt: 'position:absolute;width:11px;height:11px;border-radius:50%;box-sizing:border-box;background:var(--bg);border:2.5px solid var(--accent);pointer-events:none;transform:translate(-50%,-50%);left:' +
        ((sp ? sp.x : 160) / 320 * 100).toFixed(2) + '%;top:' + (sp ? sp.y : 66).toFixed(1) + 'px',
      scrubDate: sp ? new Date(sp.s.ts).toDateString().slice(0, 10) : 'No data',
      scrubReps: sp ? sp.s.reps : '—',
      chartFrom: rl.length ? this.fmtShort(rl[0].ts) : '—',
      chartTo: rl.length ? this.fmtShort(rl[rl.length - 1].ts) : '—',
      chartDown: this.chartDown, chartMove: this.chartMove, chartUp: this.chartUp,

      keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(function (k) {
        return {
          label: k,
          press: k === 'C' ? function () { app.setState({ entry: '' }); } : self.key(k === '⌫' ? 'del' : k)
        };
      }),

      modes: [{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }].map(function (m) {
        return { label: m.label, pick: function () { app.set({ mode: m.id }); }, st: self.mini(m.id === s.mode) };
      }),
      accents: ACCENTS.map(function (a) {
        return {
          pick: function () { app.set({ accent: a.hex }); },
          st: 'width:34px;height:34px;border-radius:50%;background:' + a.hex +
            ';box-shadow:0 0 0 ' + (a.hex === s.accent ? '2.5px var(--bg),0 0 0 5px ' + a.hex : '0 transparent') + ';transition:box-shadow .15s'
        };
      }),
      themeName: s.theme === 'dark-gym' ? (s.mode === 'light' ? 'Light gym' : 'Dark gym') : t.name,
      cycleTheme: function () {
        app.set(function (st) { return { theme: THEME_IDS[(THEME_IDS.indexOf(st.theme) + 1) % THEME_IDS.length] }; });
      },

      notifOn: s.notif, notifSub: notifSub, notifNote: notifNote,
      showDeviceCode: PUSH_MODE === 'manual' && s.notif && s.perm === 'granted',
      deviceRegistered: !!s.pushSub,
      shareLabel: navigator.share ? 'Send code' : 'Copy code',
      copyDeviceCode: this.copyDeviceCode,
      toggleNotif: this.toggleNotif,
      notifTrack: this.track(s.notif), notifKnob: this.knob(s.notif),
      notifModes: [{ id: 'interval', label: 'Interval' }, { id: 'scheduled', label: 'Scheduled' }].map(function (m) {
        return { label: m.label, pick: function () { app.set({ notifMode: m.id }); }, st: self.mini(m.id === s.notifMode) };
      }),
      notifInterval: s.notifMode === 'interval', notifScheduled: s.notifMode === 'scheduled',
      intervalLabel: s.interval + ' hours',
      intervals: [2, 4, 6, 8, 10].map(function (hr) {
        return { label: hr + 'h', pick: function () { app.set({ interval: hr }); }, st: self.chip(hr === s.interval) };
      }),
      times: s.times.slice().sort().map(function (tm) {
        return {
          label: self.fmt12(tm),
          remove: function () { app.set(function (st) { return { times: st.times.filter(function (x) { return x !== tm; }) }; }); },
          st: self.chip(true)
        };
      }),
      colSt: 'flex:1;overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y mandatory;padding:44px 0;text-align:center;scrollbar-width:none;-ms-overflow-style:none',
      hoursCol: Array.from({ length: 12 }, function (_, i) { return { label: String(i + 1), st: self.wheelItem(i === s.dH) }; }),
      minsCol: Array.from({ length: 12 }, function (_, i) { return { label: String(i * 5).padStart(2, '0'), st: self.wheelItem(i === s.dM) }; }),
      apCol: ['AM', 'PM'].map(function (l, i) { return { label: l, st: self.wheelItem(i === s.dP) }; }),
      hRef: this.wheelRef('h', s.dH), mRef: this.wheelRef('m', s.dM), pRef: this.wheelRef('p', s.dP),
      hScroll: this.wheelScroll('dH', 11), mScroll: this.wheelScroll('dM', 11), pScroll: this.wheelScroll('dP', 1),
      addLabel: dupe ? 'Already added' : 'Add ' + this.fmt12(draft),
      addTime: function () {
        app.set(function (st) { return st.times.indexOf(app.draft24()) >= 0 ? null : { times: st.times.concat([app.draft24()]) }; });
      },
      addSt: 'width:100%;margin-top:12px;height:46px;border-radius:var(--rp);font-size:14px;font-weight:700;letter-spacing:.04em;' +
        (dupe ? 'background:var(--surf2);color:var(--fg3)' : 'background:var(--accent);color:var(--accent-ink)'),

      exportJSON: this.exportJSON, exportCSV: this.exportCSV, pickImport: this.pickImport,
      clearLabel: s.clearArm ? 'Tap again to erase every set' : 'Erase logged sets',
      clearAll: function () {
        if (!app.state.clearArm) {
          app.setState({ clearArm: true });
          clearTimeout(app._armT);
          app._armT = setTimeout(function () { app.setState({ clearArm: false }); }, 4000);
          return;
        }
        clearTimeout(app._armT);
        app.set({ logged: [], rest: [], scrub: null, selSet: null, clearArm: false, logLimit: LOG_PAGE });
        app.toastMsg('Logged sets erased.');
      },

      canInstall: s.canInstall, install: this.install,
      preInstall: !isStandalone(),
      showAddHint: isIOS() && !isStandalone(),
      footer: APP_NAME + ' · v' + APP_VERSION + (isStandalone() ? ' · installed' : ' · add to home screen'),
      /* Temporary readout so the bottom-bar spacing can be diagnosed from the
         actual device rather than guessed at. Remove once it is settled. */

      ico0: function () { app.set({ icon: 0 }); }, ico1: function () { app.set({ icon: 1 }); },
      ico2: function () { app.set({ icon: 2 }); }, ico3: function () { app.set({ icon: 3 }); },
      icoSt0: this.icoSt(0), icoSt1: this.icoSt(1), icoSt2: this.icoSt(2), icoSt3: this.icoSt(3),

      entryTitle: 'Minute complete',
      entryHint: reps ? 'That’s ' + (s.elapsed / reps).toFixed(1) + ' seconds a rep' : 'How many did you get?',
      entryDisplay: s.entry || '0',
      entryColor: s.entry ? 'var(--fg)' : 'var(--fg3)',
      saveSt: 'flex:1;height:56px;border-radius:var(--rp);font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;' +
        (reps ? 'background:var(--accent);color:var(--accent-ink)' : 'background:var(--surf2);color:var(--fg3)'),

      tabs: [
        { id: 'home', label: 'Train', d: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16M12 9.5V13l2.5 1.8M9.5 2.5h5' },
        { id: 'log', label: 'Log', d: 'M4 7h16M4 12h16M4 17h10' },
        { id: 'stats', label: 'Stats', d: 'M4 18l5.5-6.5 4 3L20 6' },
        { id: 'settings', label: 'Settings', d: 'M4 8h9M17 8h3M4 16h3M11 16h9M15 5.5v5M8 13.5v5' }
      ].map(function (t2) {
        return {
          label: t2.label, d: t2.d,
          pick: function () { app.setState({ page: t2.id, selSet: null }); },
          st: 'flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:7px 0 3px;transition:color .15s;color:' +
            (s.page === t2.id ? 'var(--accent)' : 'var(--fg3)')
        };
      })
    };
  }
};

/* ------------------------------------------------------------------ view - */

var SECT = 'font-family:var(--fm);font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--fg3);padding:26px 2px 9px';
var CARD = 'background:var(--surf);border:1px solid var(--line);border-radius:var(--r);overflow:hidden';
var HR = 'height:1px;background:var(--line)';

function screenHome(v) {
  return h('div', { key: 'home', style: 'flex:1;min-height:0;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 16px) 20px 0;animation:wtFade .22s ease' },

    h('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:18px' },
      h('div', { style: 'font-family:var(--fm);font-size:12.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--fg2)' }, APP_NAME),
      h('div', { style: 'font-family:var(--fm);font-size:12.5px;letter-spacing:.08em;color:var(--fg3)' }, v.streakLabel)
    ),

    h('div', { style: 'display:flex;gap:4px;padding:4px;background:var(--surf);border:1px solid var(--line);border-radius:var(--rp)' },
      v.exOpts.map(function (o) { return h('button', { onClick: o.pick, style: o.segSt }, o.label); })
    ),

    h('div', { style: 'flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;position:relative;padding:12px 0' },
      h('div', { style: 'position:relative;height:min(100%,286px);max-width:74vw;aspect-ratio:1;flex:0 1 auto;min-height:0' },
        h('svg', { viewBox: '0 0 260 260', style: 'width:100%;height:100%;transform:rotate(-90deg);overflow:visible' },
          h('circle', { cx: '130', cy: '130', r: '118', fill: 'none', stroke: 'var(--surf2)', 'stroke-width': '7' }),
          h('circle', {
            cx: '130', cy: '130', r: '118', fill: 'none', stroke: 'var(--accent)', 'stroke-width': '7',
            'stroke-linecap': 'round', 'stroke-dasharray': '741.4', 'stroke-dashoffset': v.ringOffset,
            style: 'transition:stroke-dashoffset .18s linear'
          })
        ),
        h('div', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center' },
          h('div', { style: 'font-family:var(--fn);font-size:clamp(42px,19vh,76px);font-weight:600;line-height:.92;letter-spacing:-.02em;font-variant-numeric:tabular-nums' }, v.clock),
          h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--fg3);margin-top:10px' }, v.phaseLabel)
        )
      ),
      h('div', { style: 'font-family:var(--fm);font-size:12.5px;letter-spacing:.1em;color:var(--fg3);text-transform:uppercase;text-align:center;flex:none;white-space:nowrap' }, v.exSubLabel)
    ),

    h('div', { style: 'display:flex;flex-direction:column;gap:14px;padding-bottom:16px' },
      v.idle ? h('button', { key: 'rest', onClick: v.restDay, style: v.restSt }, v.restLabel) : null,
      v.idle ? h('button', { key: 'start', onClick: v.start, style: 'height:62px;border-radius:var(--rp);background:var(--accent);color:var(--accent-ink);font-size:16px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:var(--fu)' }, 'Start the minute') : null,
      v.running ? h('button', { key: 'cancel', onClick: v.cancel, style: 'height:62px;border-radius:var(--rp);border:1.5px solid var(--line);color:var(--fg2);font-size:16px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:var(--surf)' }, 'Cancel') : null,
      h('div', { style: 'display:flex;gap:10px' },
        h('div', { style: 'flex:1;background:var(--surf);border:1px solid var(--line);border-radius:var(--rb);padding:13px 15px' },
          h('div', { style: 'font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3)' }, 'Last set'),
          h('div', { style: 'display:flex;align-items:baseline;gap:7px;margin-top:5px' },
            h('span', { style: 'font-family:var(--fn);font-size:27px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums' }, v.lastReps),
            h('span', { style: 'font-size:13px;color:var(--fg2)' }, v.lastWhen)
          )
        ),
        h('div', { style: 'flex:1;background:var(--surf);border:1px solid var(--line);border-radius:var(--rb);padding:13px 15px' },
          h('div', { style: 'font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3)' }, 'Personal best'),
          h('div', { style: 'display:flex;align-items:baseline;gap:7px;margin-top:5px' },
            h('span', { style: 'font-family:var(--fn);font-size:27px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums' }, v.bestReps),
            h('span', { style: 'font-size:13px;color:var(--fg2)' }, v.bestWhen)
          )
        )
      )
    )
  );
}

function logRow(r) {
  return h('div', {
    onClick: r.tap,
    style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer'
  },
    h('div', { style: 'display:flex;align-items:baseline;gap:10px' },
      h('span', { style: 'font-family:var(--fm);font-size:14px;color:var(--fg);min-width:52px' }, r.day),
      h('span', { style: 'font-family:var(--fm);font-size:12.5px;color:var(--fg3)' }, r.pace)
    ),
    r.sel
      ? h('button', {
          key: 'del', onClick: r.del,
          style: 'padding:7px 14px;border-radius:var(--rp);border:1px solid #FF5A5A;color:#FF5A5A;font-family:var(--fm);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase'
        }, 'Delete')
      : h('div', { key: 'reps', style: 'display:flex;align-items:baseline;gap:5px' },
          h('span', { style: 'font-family:var(--fn);font-size:22px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums' }, r.reps),
          h('span', { style: 'font-size:12.5px;color:var(--fg3)' }, 'reps')
        )
  );
}

function screenLog(v) {
  return h('div', { key: 'log', style: 'flex:1;min-height:0;display:flex;flex-direction:column;animation:wtFade .22s ease' },
    h('div', { style: 'padding:calc(env(safe-area-inset-top) + 16px) 20px 14px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid var(--line)' },
      h('div', null,
        h('div', { style: 'font-family:var(--fn);font-size:32px;font-weight:600;line-height:1;letter-spacing:-.01em' }, 'Log'),
        h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg3);margin-top:7px;white-space:nowrap' }, v.logSummary)
      ),
      h('button', { onClick: v.exNext, style: 'padding:8px 14px;border-radius:var(--rp);background:color-mix(in oklab, var(--accent) 16%, transparent);color:var(--accent);font-family:var(--fm);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase' }, v.exLabel)
    ),
    h('div', { style: 'flex:1;min-height:0;overflow-y:auto;padding:0 20px 24px' },
      v.logGroups.map(function (g) {
        return h('div', null,
          h('div', { style: 'font-family:var(--fn);font-size:14px;font-weight:600;letter-spacing:.2em;color:var(--fg3);padding:22px 0 6px' }, g.year),
          g.months.map(function (m) {
            return h('div', { style: 'margin-bottom:16px' },
              h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;padding:10px 0 9px;border-bottom:1px solid var(--line)' },
                h('div', { style: 'font-size:15px;font-weight:600;letter-spacing:-.005em' }, m.label),
                h('div', { style: 'font-family:var(--fm);font-size:12.5px;color:var(--fg2);letter-spacing:.02em' }, m.meta)
              ),
              m.rows.map(logRow)
            );
          })
        );
      }),
      v.logMore ? h('button', {
        key: 'more', onClick: v.logMoreTap,
        style: 'width:100%;margin-top:18px;height:46px;border-radius:var(--rp);border:1px solid var(--line);color:var(--fg2);font-size:14px;font-weight:600;letter-spacing:.04em'
      }, v.logMoreLabel) : null,
      !v.logEmpty && !v.logMore ? h('div', { key: 'hint', style: 'text-align:center;font-size:12.5px;color:var(--fg3);padding:18px 0 0' }, 'Tap a set to delete it.') : null,
      v.logEmpty ? h('div', { key: 'empty', style: 'padding:64px 8px;text-align:center' },
        h('div', { style: 'font-family:var(--fn);font-size:22px;font-weight:600;color:var(--fg2)' }, 'Nothing logged yet'),
        h('div', { style: 'font-size:14.5px;color:var(--fg3);margin-top:8px;line-height:1.5' }, 'One minute is all it takes. Head to Train', h('br', null), 'and hit start.')
      ) : null
    )
  );
}

function screenStats(v) {
  return h('div', { key: 'stats', style: 'flex:1;min-height:0;display:flex;flex-direction:column;animation:wtFade .22s ease' },
    h('div', { style: 'padding:calc(env(safe-area-inset-top) + 16px) 20px 14px;display:flex;align-items:flex-end;justify-content:space-between' },
      h('div', { style: 'font-family:var(--fn);font-size:32px;font-weight:600;line-height:1;letter-spacing:-.01em' }, 'Stats'),
      h('button', { onClick: v.exNext, style: 'padding:8px 14px;border-radius:var(--rp);background:color-mix(in oklab, var(--accent) 16%, transparent);color:var(--accent);font-family:var(--fm);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase' }, v.exLabel)
    ),

    h('div', { style: 'flex:1;min-height:0;overflow-y:auto;padding:0 20px 24px' },
      h('div', { style: 'display:flex;gap:4px;padding:4px;background:var(--surf);border:1px solid var(--line);border-radius:var(--rp);margin-bottom:22px' },
        v.ranges.map(function (r) { return h('button', { onClick: r.pick, style: r.st }, r.label); })
      ),

      h('div', { style: 'text-align:center;padding:4px 0 22px' },
        h('div', { style: 'font-family:var(--fn);font-size:78px;font-weight:600;line-height:.9;letter-spacing:-.03em;font-variant-numeric:tabular-nums' }, v.lifetime),
        h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--fg3);margin-top:12px' }, 'Lifetime ' + v.exLower),
        h('div', { style: 'display:inline-block;margin-top:14px;padding:7px 14px;border-radius:var(--rp);background:color-mix(in oklab, var(--accent) 15%, transparent);color:var(--accent);font-size:13.5px;font-weight:600' }, v.rangeDelta)
      ),

      h('div', { style: 'background:var(--surf);border:1px solid var(--line);border-radius:var(--r);padding:16px 16px 10px;margin-bottom:14px' },
        v.hasChart ? h('div', { key: 'chart' },
          h('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px' },
            h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3)' }, v.scrubDate),
            h('div', { style: 'display:flex;align-items:baseline;gap:5px' },
              h('span', { style: 'font-family:var(--fn);font-size:26px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums' }, v.scrubReps),
              h('span', { style: 'font-size:12.5px;color:var(--fg3)' }, 'reps')
            )
          ),
          h('div', {
            onPointerDown: v.chartDown, onPointerMove: v.chartMove, onPointerUp: v.chartUp, onPointerLeave: v.chartUp,
            style: 'position:relative;touch-action:none;cursor:ew-resize;user-select:none;margin:0 -4px'
          },
            h('svg', { viewBox: '0 0 320 132', preserveAspectRatio: 'none', style: 'width:100%;height:132px;display:block;overflow:visible' },
              h('path', { d: v.chartArea, fill: 'var(--accent)', opacity: '0.1' }),
              h('path', { d: v.chartLine, fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
              h('line', { x1: v.scrubX, y1: '4', x2: v.scrubX, y2: '126', stroke: 'var(--fg3)', 'stroke-width': '1', 'vector-effect': 'non-scaling-stroke' })
            ),
            h('div', { style: v.dotSt })
          ),
          h('div', { style: 'display:flex;justify-content:space-between;font-family:var(--fm);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg3);padding:6px 0 4px' },
            h('span', null, v.chartFrom), h('span', null, 'Drag to scrub'), h('span', null, v.chartTo)
          )
        ) : null,
        v.noChart ? h('div', { key: 'nochart', style: 'padding:26px 4px 30px;text-align:center' },
          h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3)' }, 'Trend'),
          h('div', { style: 'font-size:14.5px;color:var(--fg2);margin-top:11px;line-height:1.5' }, v.chartEmpty)
        ) : null
      ),

      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' },
        v.statCards.map(function (c) {
          return h('div', { style: 'background:var(--surf);border:1px solid var(--line);border-radius:var(--rb);padding:15px 15px 16px' },
            h('div', { style: 'font-family:var(--fm);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg3);line-height:1.4' }, c.k),
            h('div', { style: 'font-family:var(--fn);font-size:31px;font-weight:600;line-height:1.05;margin-top:9px;letter-spacing:-.015em;font-variant-numeric:tabular-nums' }, c.v),
            h('div', { style: 'font-size:13px;color:var(--fg2);margin-top:4px' }, c.sub)
          );
        })
      ),

      v.statsNote ? h('div', { style: 'margin-top:14px;padding:16px 18px;border:1px solid var(--line);border-radius:var(--r);background:color-mix(in oklab, var(--accent) 8%, transparent)' },
        h('div', { style: 'font-size:14.5px;line-height:1.5;color:var(--fg)' }, v.statsNote)
      ) : null
    )
  );
}

function screenSettings(v) {
  return h('div', { key: 'settings', style: 'flex:1;min-height:0;display:flex;flex-direction:column;animation:wtFade .22s ease' },
    h('div', { style: 'padding:calc(env(safe-area-inset-top) + 16px) 20px 14px' },
      h('div', { style: 'font-family:var(--fn);font-size:32px;font-weight:600;line-height:1;letter-spacing:-.01em' }, 'Settings')
    ),
    h('div', { style: 'flex:1;min-height:0;overflow-y:auto;padding:0 20px 28px' },

      /* Only worth saying before the app is installed, which is the one moment
         it can still be acted on. */
      v.preInstall ? h('div', { key: 'pre', style: 'margin-top:14px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r);background:color-mix(in oklab, var(--accent) 8%, transparent);font-size:13.5px;color:var(--fg2);line-height:1.55' },
        'Set your theme, visual style and app icon before adding ' + APP_NAME + ' to your Home Screen — they carry across to the installed app, and the icon cannot be changed afterwards without re-adding it.'
      ) : null,

      h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--fg3);padding:14px 2px 9px' }, 'Appearance'),
      h('div', { style: CARD },
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:15px 16px' },
          h('div', { style: 'font-size:15px' }, 'Theme'),
          h('div', { style: 'display:flex;gap:3px;padding:3px;background:var(--surf2);border-radius:var(--rp)' },
            v.modes.map(function (m) { return h('button', { onClick: m.pick, style: m.st }, m.label); })
          )
        ),
        h('div', { style: HR }),
        h('div', { style: 'padding:15px 16px' },
          h('div', { style: 'font-size:15px;margin-bottom:13px' }, 'Accent color'),
          h('div', { style: 'display:flex;gap:11px;flex-wrap:wrap' },
            v.accents.map(function (a) { return h('button', { onClick: a.pick, style: a.st }); })
          )
        ),
        h('div', { style: HR }),
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 16px' },
          h('div', { style: 'min-width:0' },
            h('div', { style: 'font-size:15px' }, 'Visual style'),
            h('div', { style: 'font-size:13.5px;color:var(--fg3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, v.themeName)
          ),
          h('button', { onClick: v.cycleTheme, style: 'flex:none;padding:9px 15px;border-radius:var(--rp);border:1px solid var(--line);font-size:14px;font-weight:600;color:var(--fg2)' }, 'Switch')
        )
      ),

      h('div', { style: SECT }, 'App icon'),
      h('div', { style: 'background:var(--surf);border:1px solid var(--line);border-radius:var(--r);padding:17px 16px' },
        h('div', { style: 'display:flex;gap:16px;justify-content:space-between' },
          h('button', { onClick: v.ico0, style: v.icoSt0 },
            h('div', { style: 'width:100%;height:100%;border-radius:16px;background:var(--accent);display:flex;align-items:center;justify-content:center' },
              h('div', { style: 'width:42px;height:42px;border-radius:50%;border:5px solid var(--accent-ink)' })
            )
          ),
          h('button', { onClick: v.ico1, style: v.icoSt1 },
            h('div', { style: 'width:100%;height:100%;border-radius:16px;background:#0C0C0D;display:flex;align-items:flex-end;justify-content:center;gap:7px;padding:11px 0' },
              h('div', { style: 'width:9px;height:19px;border-radius:4px;background:var(--accent)' }),
              h('div', { style: 'width:9px;height:32px;border-radius:4px;background:var(--accent)' }),
              h('div', { style: 'width:9px;height:42px;border-radius:4px;background:var(--accent)' })
            )
          ),
          h('button', { onClick: v.ico2, style: v.icoSt2 },
            h('div', { style: 'width:100%;height:100%;border-radius:16px;background:#F5F3EE;display:flex;align-items:center;justify-content:center' },
              h('div', { style: 'width:34px;height:34px;background:var(--accent);transform:rotate(45deg);border-radius:7px' })
            )
          ),
          h('button', { onClick: v.ico3, style: v.icoSt3 },
            h('div', { style: 'width:100%;height:100%;border-radius:16px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--fn);font-size:45px;font-weight:700;color:var(--accent-ink);line-height:1' }, '60')
          )
        ),
      ),

      h('div', { style: SECT }, 'Reminders'),
      h('div', { style: CARD },
        h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:15px 16px' },
          h('div', null,
            h('div', { style: 'font-size:15px' }, 'Push notifications'),
            h('div', { style: 'font-size:13.5px;color:var(--fg3);margin-top:2px' }, v.notifSub)
          ),
          h('button', { onClick: v.toggleNotif, style: v.notifTrack }, h('div', { style: v.notifKnob }))
        ),
        v.notifNote ? h('div', { key: 'note' },
          h('div', { style: HR }),
          h('div', { style: 'padding:13px 16px;font-size:13px;color:var(--fg3);line-height:1.5' }, v.notifNote)
        ) : null,
        v.showDeviceCode ? h('div', { key: 'devcode' },
          h('div', { style: HR }),
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 16px' },
            h('div', { style: 'min-width:0' },
              h('div', { style: 'font-size:15px' }, 'Background delivery'),
              h('div', { style: 'font-size:13.5px;color:var(--fg3);margin-top:2px' },
                v.deviceRegistered ? 'This device is registered' : 'Waiting for the browser…')
            ),
            h('button', {
              onClick: v.copyDeviceCode,
              style: 'flex:none;padding:9px 15px;border-radius:var(--rp);border:1px solid var(--line);font-size:14px;font-weight:600;color:' + (v.deviceRegistered ? 'var(--accent)' : 'var(--fg3)')
            }, v.shareLabel)
          ),
          h('div', { style: 'padding:0 16px 15px;font-size:13px;color:var(--fg3);line-height:1.5' },
            'One-time setup: send this code to yourself, then save it as the ',
            h('span', { style: 'font-family:var(--fm);color:var(--fg2)' }, 'PUSH_SUBSCRIPTIONS'),
            ' secret in the repo. After that, reminders arrive even with ' + APP_NAME + ' closed. Send it again if you change the times below.')
        ) : null,
        v.notifOn ? h('div', { key: 'opts' },
          h('div', { style: HR }),
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:15px 16px' },
            h('div', { style: 'font-size:15px' }, 'Mode'),
            h('div', { style: 'display:flex;gap:3px;padding:3px;background:var(--surf2);border-radius:var(--rp)' },
              v.notifModes.map(function (n) { return h('button', { onClick: n.pick, style: n.st }, n.label); })
            )
          ),
          h('div', { style: HR }),
          v.notifInterval ? h('div', { key: 'iv', style: 'padding:15px 16px' },
            h('div', { style: 'font-size:15px;margin-bottom:12px' }, 'Every ' + v.intervalLabel),
            h('div', { style: 'display:flex;gap:8px' },
              v.intervals.map(function (i) { return h('button', { onClick: i.pick, style: i.st }, i.label); })
            )
          ) : null,
          v.notifScheduled ? h('div', { key: 'sc', style: 'padding:15px 16px' },
            h('div', { style: 'font-size:15px;margin-bottom:12px' }, 'At these times'),
            v.times.length
              ? h('div', { key: 'chips', style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' },
                  v.times.map(function (t) {
                    return h('button', { onClick: t.remove, style: t.st }, t.label, h('span', { style: 'color:var(--fg3);margin-left:7px' }, '×'));
                  })
                )
              : h('div', { key: 'none', style: 'font-size:13.5px;color:var(--fg3);line-height:1.5' }, 'No times set. Pick one below and add it.'),
            v.times.length
              ? h('div', { key: 'hint', style: 'font-size:13px;color:var(--fg3);margin-top:10px' }, 'Tap a time to remove it.')
              : null,
            h('div', { style: 'position:relative;margin-top:14px;border:1px solid var(--line);border-radius:var(--rb);overflow:hidden' },
              h('div', { style: 'position:absolute;left:10px;right:10px;top:44px;height:44px;border-radius:10px;background:var(--surf2);pointer-events:none' }),
              h('div', { style: 'position:relative;display:flex;height:132px;-webkit-mask-image:linear-gradient(180deg,transparent,#000 26%,#000 74%,transparent);mask-image:linear-gradient(180deg,transparent,#000 26%,#000 74%,transparent)' },
                h('div', { ref: v.hRef, onScroll: v.hScroll, style: v.colSt },
                  v.hoursCol.map(function (x) { return h('div', { style: x.st }, x.label); })
                ),
                h('div', { ref: v.mRef, onScroll: v.mScroll, style: v.colSt },
                  v.minsCol.map(function (x) { return h('div', { style: x.st }, x.label); })
                ),
                h('div', { ref: v.pRef, onScroll: v.pScroll, style: v.colSt },
                  v.apCol.map(function (x) { return h('div', { style: x.st }, x.label); })
                )
              )
            ),
            h('button', { onClick: v.addTime, style: v.addSt }, v.addLabel)
          ) : null
        ) : null
      ),

      h('div', { style: SECT }, 'Data'),
      h('div', { style: CARD },
        h('button', { onClick: v.exportJSON, style: 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:var(--fg)' }, 'Export a backup (JSON)'),
        h('div', { style: HR }),
        h('button', { onClick: v.exportCSV, style: 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:var(--fg)' }, 'Export sets (CSV)'),
        h('div', { style: HR }),
        h('button', { onClick: v.pickImport, style: 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:var(--fg)' }, 'Import a backup'),
        h('div', { style: HR }),
        h('button', { onClick: v.clearAll, style: 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:#FF5A5A' }, v.clearLabel)
      ),
      h('div', { style: 'font-size:13px;color:var(--fg3);margin-top:10px;padding:0 2px;line-height:1.5' },
        'Everything is stored on this device only. Export a backup before switching phones.'),

      v.canInstall || v.showAddHint ? h('div', { key: 'inst' },
        h('div', { style: SECT }, 'Install'),
        v.canInstall
          ? h('div', { style: CARD }, h('button', { onClick: v.install, style: 'display:block;width:100%;text-align:left;padding:15px 16px;font-size:15px;color:var(--accent)' }, 'Install ' + APP_NAME + ' on this device'))
          : h('div', { style: 'background:var(--surf);border:1px solid var(--line);border-radius:var(--r);padding:15px 16px;font-size:13.5px;color:var(--fg3);line-height:1.55' },
              'Tap the Share button in Safari, then ', h('span', { style: 'color:var(--fg2)' }, 'Add to Home Screen'), '. ' + APP_NAME + ' then runs full screen, works offline, and can send reminders.')
      ) : null,

      h('div', { style: 'text-align:center;font-family:var(--fm);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg3);padding:26px 0 6px' }, v.footer)
    )
  );
}

/* height:100dvh (with a 100vh fallback) rather than inset:0 — in iOS Safari a
   fixed inset:0 box resolves against the *small* viewport, so when the bottom
   toolbar auto-hides the tab bar stops short of the screen edge. */
function view(v) {
  return h('div', { style: 'position:fixed;left:0;right:0;top:0;height:100vh;height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font-family:var(--fu);overflow:hidden' },

    v.isHome ? screenHome(v) : null,
    v.isLog ? screenLog(v) : null,
    v.isStats ? screenStats(v) : null,
    v.isSet ? screenSettings(v) : null,

    /* A proportion of the safe-area inset rather than all of it, or the inset
       plus more. iOS reports 34px for the home indicator, which is generous
       for a tab bar; 60% clears the indicator without the dead strip. Scaling
       rather than subtracting a fixed amount keeps it sane wherever the inset
       is different — an Android gesture bar, or 0 in a desktop browser, where
       the 8px floor takes over. */
    h('div', { style: 'display:flex;border-top:1px solid var(--line);background:var(--surf);padding:9px 8px calc(env(safe-area-inset-bottom) + 9px)' },
      v.tabs.map(function (t) {
        return h('button', { onClick: t.pick, style: t.st },
          h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'width:22px;height:22px;display:block' },
            h('path', { d: t.d })
          ),
          h('span', { style: 'font-size:11.5px;font-weight:600;letter-spacing:.04em' }, t.label)
        );
      })
    ),

    v.entering ? h('div', { key: 'entry', style: 'position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);display:flex;flex-direction:column;justify-content:flex-end;animation:wtFade .18s ease' },
      h('div', { style: 'background:var(--bg);border-top:1px solid var(--line);border-radius:26px 26px 0 0;padding:22px 20px calc(env(safe-area-inset-bottom) + 18px);animation:wtSheet .3s cubic-bezier(.22,1,.36,1)' },
        h('div', { style: 'width:38px;height:4px;border-radius:2px;background:var(--surf2);margin:0 auto 20px' }),
        h('div', { style: 'display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px' },
          h('div', null,
            h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)' }, v.entryTitle),
            h('div', { style: 'font-size:14px;color:var(--fg2);margin-top:7px' }, v.entryHint)
          ),
          h('div', { style: 'text-align:right' },
            h('div', { style: 'font-family:var(--fn);font-size:64px;font-weight:600;line-height:.85;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:' + v.entryColor }, v.entryDisplay),
            h('div', { style: 'font-family:var(--fm);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3);margin-top:8px' }, 'Reps')
          )
        ),
        h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:9px' },
          v.keys.map(function (k) {
            return h('button', { onClick: k.press, style: 'height:58px;border-radius:var(--rb);background:var(--surf);border:1px solid var(--line);font-family:var(--fn);font-size:26px;font-weight:600;display:flex;align-items:center;justify-content:center' }, k.label);
          })
        ),
        h('div', { style: 'display:flex;gap:9px;margin-top:12px' },
          h('button', { onClick: v.cancel, style: 'width:96px;height:56px;border-radius:var(--rp);border:1px solid var(--line);color:var(--fg2);font-size:14px;font-weight:600' }, 'Discard'),
          h('button', { onClick: v.saveSet, style: v.saveSt }, 'Save set')
        )
      )
    ) : null,

    v.counting ? h('div', { key: 'count', style: 'position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:wtFade .16s ease' },
      h('div', { style: 'position:relative;display:flex;align-items:center;justify-content:center;width:220px;height:220px' },
        h('div', { style: 'position:absolute;inset:0;border-radius:50%;border:2px solid var(--accent);animation:wtHalo 1s ease-out infinite' }),
        h('div', { style: 'font-family:var(--fn);font-size:130px;font-weight:600;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums' }, v.countVal)
      ),
      h('div', { style: 'font-family:var(--fm);font-size:12.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--fg3);margin-top:34px' }, 'Get in position'),
      h('button', { onClick: v.cancel, style: 'margin-top:40px;padding:12px 26px;border-radius:var(--rp);border:1px solid var(--line);color:var(--fg2);font-size:14px;letter-spacing:.06em' }, 'Cancel')
    ) : null,

    v.toast ? h('div', { key: 'toast-' + v.toast, style: 'position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 82px);z-index:70;display:flex;justify-content:center;pointer-events:none' },
      h('div', { style: 'max-width:86%;padding:12px 20px;border-radius:var(--rp);background:var(--accent);color:var(--accent-ink);font-size:14px;font-weight:700;letter-spacing:.01em;animation:wtToast 2.8s ease forwards;box-shadow:0 8px 28px rgba(0,0,0,.34)' }, v.toast)
    ) : null
  );
}

/* ----------------------------------------------------------- render loop - */

var rootEl, prevTree, rootDom, queued = false;

/* rAF is paused whenever the page isn't compositing (backgrounded tab, an
   installed app that was swiped away). The timeout is the safety net so state
   never sits uncommitted — whichever fires first wins. */
function schedule() {
  if (queued) return;
  queued = true;
  var done = false;
  var go = function () {
    if (done) return;
    done = true; queued = false;
    render();
  };
  requestAnimationFrame(go);
  setTimeout(go, 80);
}

function render() {
  var tree = view(app.renderVals());
  refQueue.length = 0;
  try {
    if (!rootDom) { rootDom = create(tree, false); rootEl.appendChild(rootDom); }
    else rootDom = patch(rootEl, rootDom, prevTree, tree, false);
    prevTree = tree;
  } catch (e) {
    /* A patch that fails part way leaves the vnode tree out of step with the
       DOM, so every render after it fails too and the app stops responding.
       Throw the tree away and rebuild rather than staying wedged. */
    try {
      while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
      rootDom = create(tree, false);
      rootEl.appendChild(rootDom);
      prevTree = tree;
    } catch (e2) { return; }
  }
  for (var i = 0; i < refQueue.length; i++) refQueue[i][0](refQueue[i][1]);
  refQueue.length = 0;
  app.didRender();
}

/* --------------------------------------------------------- service worker - */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    app.swReg = reg;
    /* Ask for a worker update on every launch. Without this the browser may
       sit on a cached sw.js and keep serving whatever it shipped with. */
    if (reg.update) { try { reg.update(); } catch (e) {} }
    /* Re-assert the subscription each launch: browsers rotate endpoints. */
    if (PUSH_ON && app.state.notif && HAS_NOTIF && Notification.permission === 'granted') app.subscribePush();
    /* Take a new worker live at once rather than waiting for every window to
       close. Notifications are rendered by the service worker, so a stale one
       keeps showing the old wording however many times the app is reopened. */
    var adopt = function (sw) {
      if (!sw) return;
      sw.addEventListener('statechange', function () {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          sw.postMessage({ type: 'skip-waiting' });
          app.setState({ updateReady: true });
          app.toastMsg('Updated to the latest version.');
        }
      });
    };
    if (reg.waiting) reg.waiting.postMessage({ type: 'skip-waiting' });
    adopt(reg.installing);
    reg.addEventListener('updatefound', function () { adopt(reg.installing); });
  }).catch(function () {});

  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'open-timer') { app.setState({ page: 'home' }); app.clearNudges(); }
  });
}

/* ------------------------------------------------------------------ boot - */

function boot() {
  rootEl = document.getElementById('root');
  app.mount();
  render();
  registerSW();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.Minute = app;

})();
