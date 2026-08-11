const { verifyToken } = require("../utils/jwt");

/**
 * Verifies the JWT on protected routes. In this architecture the API
 * Gateway also verifies the token before forwarding the request, but
 * each service re-verifies independently ("defense in depth") so a
 * service is never left unprotected if it is ever called directly
 * (e.g. during local development or a gateway mis-configuration).
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
