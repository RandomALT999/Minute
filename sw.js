/* One Minute service worker — app shell precache, offline-first statics,
   and the push/notification handlers the app needs on iOS. */

var APP_NAME = 'One Minute';
var VERSION = 'v1.1.0';
var SHELL_CACHE = 'minute-shell-' + VERSION;
var ASSET_CACHE = 'minute-assets-' + VERSION;
var FONT_CACHE = 'minute-fonts';

var SHELL = [
  './',
  './index.html',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './icons/icon-0-180.png',
  './icons/icon-0-192.png',
  './icons/icon-0-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () { /* a missing shell file must not block install */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== ASSET_CACHE && k !== FONT_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* The page shows "reopen to apply" by default; this lets it apply sooner. */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'skip-waiting') self.skipWaiting();
});

function isFont(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* Navigations: network first so a deploy is picked up, cache as the
     offline fallback. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  /* Google Fonts: stale-while-revalidate, so the app still looks right offline. */
  if (isFont(url)) {
    e.respondWith(
      caches.open(FONT_CACHE).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Own static assets: stale-while-revalidate. Offline launches are instant
     off the cache, and a deploy still lands without a VERSION bump — pure
     cache-first would pin the app to whatever shipped first. */
  e.respondWith(
    caches.open(ASSET_CACHE).then(function (c) {
      return caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    })
  );
});

/* Web Push. Nothing sends these yet — a push server (VAPID keypair +
   scheduler, per BACKEND.md §7) is the missing half — but the client side is
   done, so subscriptions start working the moment one exists. */
self.addEventListener('push', function (e) {
  var d = { body: 'Time for a set.', icon: 0 };
  if (e.data) {
    try { d = Object.assign(d, e.data.json()); }
    catch (err) { d.body = e.data.text() || d.body; }
  }
  /* Title is always the app name, so the notification reads "One Minute" over
     the message instead of repeating it in the attribution line. */
  e.waitUntil(self.registration.showNotification(APP_NAME, {
    body: d.body,
    icon: './icons/icon-' + (d.icon || 0) + '-192.png',
    badge: './icons/icon-' + (d.icon || 0) + '-192.png',
    tag: 'minute',
    renotify: true,
    vibrate: [180, 90, 180],
    data: { url: './' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) {
          list[i].postMessage({ type: 'open-timer' });
          return list[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
