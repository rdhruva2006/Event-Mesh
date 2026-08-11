require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const proxyRoutes = require("./routes/proxy");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// NOTE: body parsing is intentionally left to the backend services -
// the gateway proxies the raw request stream through unchanged,
// which avoids double-parsing/buffering large or streamed payloads.

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway", time: new Date().toISOString() });
});

app.use("/api", proxyRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Unexpected gateway error" });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] listening on port ${PORT}`);
});
