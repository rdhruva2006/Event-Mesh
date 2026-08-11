const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { requireAuth } = require("../middleware/auth");
const { authRateLimiter, generalRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4001";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4002";

const userServiceProxy = createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/users": "/api/users" },
  onError: (err, req, res) => {
    console.error(`[gateway] user-service proxy error: ${err.message}`);
    res.status(502).json({ error: "User service is unavailable" });
  },
});

const notificationServiceProxy = createProxyMiddleware({
  target: NOTIFICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/notifications": "/api/notifications" },
  onError: (err, req, res) => {
    console.error(`[gateway] notification-service proxy error: ${err.message}`);
    res.status(502).json({ error: "Notification service is unavailable" });
  },
});

// --- Public auth endpoints (stricter rate limit, no JWT required yet) ---
router.post("/users/register", authRateLimiter, userServiceProxy);
router.post("/users/login", authRateLimiter, userServiceProxy);

// --- Protected endpoints (JWT required, forwarded on to the service,
//     which independently re-verifies it) ---
router.use("/users", generalRateLimiter, requireAuth, userServiceProxy);
router.use("/notifications", generalRateLimiter, requireAuth, notificationServiceProxy);

module.exports = router;
