const { connect, StringCodec } = require("nats");

const sc = StringCodec();
let natsConnection = null;
let jetStreamClient = null;

/**
 * Connects to NATS and ensures the JetStream stream that this service
 * publishes to exists. Using JetStream (instead of core NATS pub/sub)
 * gives us:
 *   - Persistence: events survive broker restarts
 *   - At-least-once delivery: subscribers ack messages, unacked
 *     messages are redelivered
 *   - Replay: a newly-started Notification Service instance can
 *     replay events it missed while it was down
 */
async function connectNats() {
  const url = process.env.NATS_URL || "nats://localhost:4222";

  natsConnection = await connect({
    servers: url,
    reconnect: true,
    maxReconnectAttempts: -1, // retry forever
    reconnectTimeWait: 2000,
  });

  console.log(`[nats] connected to ${natsConnection.getServer()}`);

  const jsm = await natsConnection.jetstreamManager();
  const streamName = process.env.NATS_STREAM_NAME || "USER_EVENTS";
  const subject = process.env.NATS_SUBJECT_USER_CREATED || "user.events.created";

  // Idempotently create the stream (no-op if it already exists)
  try {
    await jsm.streams.info(streamName);
  } catch (err) {
    await jsm.streams.add({
      name: streamName,
      subjects: [`${subject.split(".").slice(0, 2).join(".")}.*`], // e.g. user.events.*
      retention: "limits",
      max_age: 24 * 60 * 60 * 1000 * 1000 * 1000, // 24h in nanoseconds
      storage: "file",
    });
    console.log(`[nats] created JetStream stream "${streamName}"`);
  }

  jetStreamClient = natsConnection.jetstream();

  natsConnection.closed().then((err) => {
    if (err) console.error(`[nats] connection closed with error: ${err.message}`);
  });

  return { natsConnection, jetStreamClient };
}

/**
 * Publishes a domain event to JetStream. Returns the ack (including
 * the sequence number) so callers can log/verify successful delivery.
 */
async function publishEvent(subject, payload) {
  if (!jetStreamClient) {
    throw new Error("NATS JetStream client is not initialised. Call connectNats() first.");
  }
  const data = sc.encode(JSON.stringify(payload));
  const ack = await jetStreamClient.publish(subject, data, {
    msgID: payload.eventId, // enables broker-side de-duplication if we retry a publish
  });
  return ack;
}

function getNatsConnection() {
  return natsConnection;
}

module.exports = { connectNats, publishEvent, getNatsConnection, sc };
