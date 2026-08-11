const rateLimit = require("express-rate-limit");

// Public, unauthenticated routes (register/login) get a stricter
// limit to slow down credential-stuffing / brute-force attempts.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

// General limiter applied to all other gateway traffic.
const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

module.exports = { authRateLimiter, generalRateLimiter };
