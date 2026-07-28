/* Generate a VAPID keypair: node scripts/gen-vapid.js
   The public key goes in config.js (it ships to the browser and is meant to be
   public). The private key is a credential — put it in a GitHub Actions secret
   and never commit it. */
const { generateKeyPairSync } = require('crypto');

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });

const b64u = (s) => Buffer.from(s, 'base64url');
// Uncompressed EC point: 0x04 || X || Y — the form Web Push expects.
const pub = Buffer.concat([Buffer.from([4]), b64u(jwk.x), b64u(jwk.y)]).toString('base64url');

console.log(JSON.stringify({ publicKey: pub, privateKey: jwk.d }, null, 2));
