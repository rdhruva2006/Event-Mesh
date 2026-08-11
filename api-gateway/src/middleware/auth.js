const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT before a request is ever proxied to a backend
 * service. This centralizes authentication at the edge, so backend
 * services only need to handle already-authenticated traffic (they
 * still re-verify independently as defense in depth - see each
 * service's own auth middleware).
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
