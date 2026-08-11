const { sendWelcomeEmail } = require("../services/emailService");
const notificationStore = require("../store/notificationStore");

/**
 * Handles a single "user.created" event consumed from NATS
 * JetStream. Throwing here causes the message to be nak'd and
 * redelivered by the broker (see config/nats.js), so this function
 * should be safe to run more than once for the same event
 * (idempotent) - we guard on sourceEventId before writing.
 */
async function handleUserCreated(event) {
  if (event.eventType !== "user.created") {
    console.warn(`[notification] ignoring unexpected event type: ${event.eventType}`);
    return;
  }

  const { userId, name, email } = event.data;

  const alreadyProcessed = notificationStore
    .findByUserId(userId)
    .some((n) => n.sourceEventId === event.eventId);
  if (alreadyProcessed) {
    console.log(`[notification] event ${event.eventId} already processed, skipping (idempotent)`);
    return;
  }

  const result = await sendWelcomeEmail({ name, email });

  notificationStore.record({
    userId,
    type: "welcome_email",
    message: result.message,
    sourceEventId: event.eventId,
  });

  console.log(`[notification] recorded welcome notification for user ${userId}`);
}

module.exports = { handleUserCreated };
