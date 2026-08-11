const { connect, StringCodec, AckPolicy, DeliverPolicy } = require("nats");

const sc = StringCodec();
let natsConnection = null;

/**
 * Connects to NATS and creates (or reuses) a durable JetStream
 * consumer bound to the user-events stream. A "durable" consumer
 * means:
 *   - If this service crashes/restarts, it resumes from the last
 *     acknowledged message instead of missing events.
 *   - Messages are only removed from the "unacked" set once we
 *     explicitly call msg.ack() after successfully processing them,
 *     giving us at-least-once delivery even under failures.
 */
async function connectNats() {
  const url = process.env.NATS_URL || "nats://localhost:4222";

  natsConnection = await connect({
    servers: url,
    reconnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
  });

  console.log(`[nats] connected to ${natsConnection.getServer()}`);

  natsConnection.closed().then((err) => {
    if (err) console.error(`[nats] connection closed with error: ${err.message}`);
  });

  return natsConnection;
}

/**
 * Subscribes to the given subject with a durable, ack-explicit
 * JetStream consumer and invokes `onMessage` for every event.
 * `onMessage` must be async; the message is only ack'd if it
 * resolves without throwing, so a processing failure causes NATS to
 * redeliver the message rather than silently dropping it.
 */
async function subscribeDurable(subject, durableName, onMessage) {
  const jsm = await natsConnection.jetstreamManager();
  const streamName = process.env.NATS_STREAM_NAME || "USER_EVENTS";

  // Ensure consumer exists (idempotent)
  try {
    await jsm.consumers.info(streamName, durableName);
  } catch {
    await jsm.consumers.add(streamName, {
      durable_name: durableName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      filter_subject: subject,
      max_deliver: 5, // retry a failed message up to 5 times before it is parked
    });
    console.log(`[nats] created durable consumer "${durableName}" on stream "${streamName}"`);
  }

  const js = natsConnection.jetstream();
  const consumer = await js.consumers.get(streamName, durableName);

  (async () => {
    const messages = await consumer.consume();
    for await (const m of messages) {
      try {
        const payload = JSON.parse(sc.decode(m.data));
        await onMessage(payload);
        m.ack();
      } catch (err) {
        console.error(`[nats] failed to process message (redelivery will be attempted): ${err.message}`);
        m.nak(); // negative-ack -> NATS redelivers per the backoff policy
      }
    }
  })().catch((err) => console.error(`[nats] consume loop error: ${err.message}`));
}

module.exports = { connectNats, subscribeDurable };
