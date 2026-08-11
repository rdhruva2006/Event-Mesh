const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Same note as user-service/src/config/db.js: a JSON file keeps this
// assignment runnable with zero external dependencies. Swap for a
// real datastore (Mongo/Postgres) behind this same interface for
// production use.

const dbFile = path.join(__dirname, "..", "..", "data", "notifications.json");
const adapter = new FileSync(dbFile);
const db = low(adapter);
db.defaults({ notifications: [] }).write();

function record({ userId, type, message, sourceEventId }) {
  const entry = {
    id: uuidv4(),
    userId,
    type,
    message,
    sourceEventId,
    createdAt: new Date().toISOString(),
  };
  db.get("notifications").push(entry).write();
  return entry;
}

function findByUserId(userId) {
  return db.get("notifications").filter({ userId }).value();
}

function findAll() {
  return db.get("notifications").value();
}

module.exports = { record, findByUserId, findAll };
