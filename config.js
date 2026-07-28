/* Push configuration.
 *
 * Leave both blank and reminders only fire while the app is open. Fill them in
 * and One Minute subscribes to Web Push, so reminders arrive with the app
 * fully closed — which is the only way iOS will ever deliver them.
 *
 * endpoint        base URL of the push server in server/ (no trailing slash)
 * vapidPublicKey  the public half of the VAPID keypair, base64url
 *
 * See server/README.md for the four commands that produce both values.
 */
window.MINUTE_PUSH = {
  endpoint: '',
  vapidPublicKey: ''
};
