/* Push configuration.
 *
 * endpoint        URL of the push service in server/worker. With this set, the
 *                 app registers itself automatically and reminders arrive with
 *                 the app closed. Fill it in after `wrangler deploy`.
 * vapidPublicKey  public half of the VAPID keypair. It is meant to ship to the
 *                 browser. The private half lives only in a Worker secret.
 *
 * With endpoint blank the app still registers for push but has nowhere to send
 * the subscription, so Settings shows a device code to place by hand. With
 * both blank, reminders only fire while the app is open.
 *
 * See server/README.md.
 */
window.MINUTE_PUSH = {
  endpoint: '',
  vapidPublicKey: 'BJz8I3_sqznkD4t97QnLmYgaZtMWnsiqC2wQ_nZNHSTRaSmijHvRRvgk66ttKBBZC9gf81MTxTlS-RQ0fwnisxY'
};
