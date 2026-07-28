/* Web Push over Web Crypto — RFC 8291 (aes128gcm) + RFC 8292 (VAPID).
 *
 * The usual `web-push` npm package is Node-only, so it cannot run on Workers.
 * This is the same protocol implemented against the Web Crypto API, which
 * exists both in Workers and in Node, so the tests exercise the real code.
 */

const enc = new TextEncoder();

export const b64uDecode = (s) => {
  const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
};

export const b64uEncode = (bytes) => {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* Info strings in RFC 8291 are NUL-terminated. */
const labelled = (s) => concat(enc.encode(s), new Uint8Array([0]));

const u32 = (n) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

/* WebCrypto HKDF does extract-then-expand, which is exactly what the spec
   asks for at all three derivation steps. */
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8);
  return new Uint8Array(bits);
}

/* Split an uncompressed P-256 point (0x04 || X || Y) into JWK coordinates. */
function pointToXY(point) {
  if (point.length !== 65 || point[0] !== 4) throw new Error('expected a 65-byte uncompressed P-256 point');
  return { x: b64uEncode(point.slice(1, 33)), y: b64uEncode(point.slice(33, 65)) };
}

/* ---------------------------------------------------------------- VAPID -- */

export async function vapidHeaders(endpoint, subject, publicKeyB64, privateKeyB64) {
  const aud = new URL(endpoint).origin;
  const { x, y } = pointToXY(b64uDecode(publicKeyB64));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: privateKeyB64, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const seg = (o) => b64uEncode(enc.encode(JSON.stringify(o)));
  const unsigned = seg({ typ: 'JWT', alg: 'ES256' }) + '.' +
    seg({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject });

  /* WebCrypto emits the raw r||s pair, which is the JOSE form ES256 wants. */
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  const jwt = unsigned + '.' + b64uEncode(new Uint8Array(sig));

  return { Authorization: 'vapid t=' + jwt + ', k=' + publicKeyB64 };
}

/* ----------------------------------------------------------- encryption -- */

export async function encryptPayload(p256dhB64, authB64, plaintext) {
  const uaPublic = b64uDecode(p256dhB64);
  const authSecret = b64uDecode(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(labelled('WebPush: info'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, labelled('Content-Encoding: aes128gcm'), 16);
  const nonce = await hkdf(salt, ikm, labelled('Content-Encoding: nonce'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  /* 0x02 marks the final record; there is only ever one here. */
  const body = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, body));

  return concat(salt, u32(4096), new Uint8Array([asPublic.length]), asPublic, ct);
}

/* Mirror of the above. Only the tests use it — it is what proves the
   encryption is right, by decrypting both our output and web-push's. */
export async function decryptPayload(uaPrivateJwk, uaPublicB64, authB64, packet) {
  const salt = packet.slice(0, 16);
  const idlen = packet[20];
  const asPublic = packet.slice(21, 21 + idlen);
  const ct = packet.slice(21 + idlen);

  const uaPublic = b64uDecode(uaPublicB64);
  const authSecret = b64uDecode(authB64);

  const priv = await crypto.subtle.importKey('jwk', uaPrivateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, priv, 256));

  const ikm = await hkdf(authSecret, shared, concat(labelled('WebPush: info'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, labelled('Content-Encoding: aes128gcm'), 16);
  const nonce = await hkdf(salt, ikm, labelled('Content-Encoding: nonce'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const out = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ct));

  let end = out.length;                       // strip the record delimiter
  while (end > 0 && out[end - 1] === 0) end--;
  return new TextDecoder().decode(out.slice(0, end - 1));
}

/* ------------------------------------------------------------------ send -- */

export async function sendPush(subscription, payload, vapid, ttl = 1800) {
  const { endpoint, keys } = subscription;
  const headers = await vapidHeaders(endpoint, vapid.subject, vapid.publicKey, vapid.privateKey);
  const body = await encryptPayload(keys.p256dh, keys.auth, payload);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'normal'
    },
    body
  });

  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text().catch(() => '') };
}
