/**
 * Simulated notification dispatch.
 *
 * In production this would call a real provider (SendGrid, SES,
 * Twilio, FCM, etc.) using credentials injected via environment
 * variables / a secrets manager - never hardcoded. For this
 * assignment we log the "send" so the event flow is fully visible
 * end-to-end without requiring real third-party accounts.
 */
async function sendWelcomeEmail({ name, email }) {
  const message = `Welcome to the platform, ${name}!`;
  console.log(`[notification] (simulated) sending email to ${email}: "${message}"`);
  // Simulate network latency of a real provider call
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { channel: "email", to: email, message, deliveredAt: new Date().toISOString() };
}

module.exports = { sendWelcomeEmail };
