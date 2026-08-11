const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { publishUserCreated } = require("../events/publisher");

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existing = User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = User.create({ name, email, passwordHash });

    // Publish the domain event asynchronously. We do not block the
    // HTTP response on the Notification Service being available or
    // fast - that is the whole point of using a message broker.
    // If publishing fails we log it; JetStream persistence plus a
    // retry/outbox strategy (see README "Reliability" section)
    // is how this is hardened for production.
    try {
      await publishUserCreated(user);
    } catch (eventErr) {
      console.error(`[event] failed to publish user.created: ${eventErr.message}`);
      // We deliberately do not fail the HTTP request here - user
      // creation itself succeeded. A production system would write
      // this event to an outbox table and retry it out-of-band.
    }

    const token = signToken(user);
    return res.status(201).json({ user: User.toPublic(user), token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.status(200).json({ user: User.toPublic(user), token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function getUserById(req, res) {
  const user = User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(200).json({ user: User.toPublic(user) });
}

function listUsers(req, res) {
  const users = User.findAll().map(User.toPublic);
  return res.status(200).json({ users, count: users.length });
}

module.exports = { register, login, getUserById, listUsers };
