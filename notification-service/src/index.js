require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const notificationRoutes = require("./routes/notificationRoutes");
const { connectNats, subscribeDurable } = require("./config/nats");
const { handleUserCreated } = require("./handlers/notificationHandler");

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "notification-service",
    time: new Date().toISOString(),
  });
});

app.use("/api/notifications", notificationRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Unexpected server error" });
});

async function start() {
  try {
    await connectNats();

    const subject = process.env.NATS_SUBJECT_USER_CREATED || "user.events.created";
    const durableName = process.env.NATS_DURABLE_NAME || "notification-service-durable";

    await subscribeDurable(subject, durableName, handleUserCreated);
    console.log(`[notification-service] subscribed to "${subject}" as durable "${durableName}"`);

    app.listen(PORT, () => {
      console.log(`[notification-service] listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[notification-service] failed to start:", err.message);
    process.exit(1);
  }
}

start();
