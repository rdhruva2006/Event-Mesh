const { v4: uuidv4 } = require("uuid");
const { publishEvent } = require("../config/nats");

/**
 * Publishes a "user.created" domain event. This is how the User
 * Service tells the rest of the system a new user signed up,
 * WITHOUT calling the Notification Service directly (no REST, no
 * WebSocket, no tight coupling). Any number of future services
 * (analytics, billing, notifications) can subscribe independently.
 */
async function publishUserCreated(user) {
  const subject = process.env.NATS_SUBJECT_USER_CREATED || "user.events.created";
  const event = {
    eventId: uuidv4(),
    eventType: "user.created",
    occurredAt: new Date().toISOString(),
    data: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  };

  const ack = await publishEvent(subject, event);
  console.log(
    `[event] published "${event.eventType}" (eventId=${event.eventId}) -> stream seq ${ack.seq}`
  );
  return event;
}

module.exports = { publishUserCreated };
