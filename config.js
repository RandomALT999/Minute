/* Push configuration.
 *
 * vapidPublicKey  public half of the VAPID keypair. It is meant to ship to the
 *                 browser. The private half lives only in a GitHub Actions
 *                 secret — never put it here.
 * endpoint        base URL of a push server that stores subscriptions itself.
 *                 Left blank, the app runs in "manual" mode: it registers for
 *                 push and shows a device code in Settings → Reminders that
 *                 you paste into the PUSH_SUBSCRIPTIONS secret once.
 *
 * With vapidPublicKey blank too, reminders only fire while the app is open.
 * See server/README.md.
 */
window.MINUTE_PUSH = {
  vapidPublicKey: 'BJz8I3_sqznkD4t97QnLmYgaZtMWnsiqC2wQ_nZNHSTRaSmijHvRRvgk66ttKBBZC9gf81MTxTlS-RQ0fwnisxY',
  endpoint: ''
};
