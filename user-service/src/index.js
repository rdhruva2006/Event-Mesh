require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const userRoutes = require("./routes/userRoutes");
const { connectNats } = require("./config/nats");

const app = express();
const PORT = process.env.PORT || 4001;

// --- Security & hardening middleware ---
app.use(helmet());
app.use(express.json({ limit: "10kb" })); // small limit mitigates payload-based DoS
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 requests/minute/IP at the service level (gateway applies its own limit too)
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Health check (used by orchestrators / docker-compose) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "user-service", time: new Date().toISOString() });
});

app.use("/api/users", userRoutes);

// --- 404 + centralized error handler ---
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Unexpected server error" });
});

async function start() {
  try {
    await connectNats();
    app.listen(PORT, () => {
      console.log(`[user-service] listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[user-service] failed to start:", err.message);
    process.exit(1);
  }
}

start();
