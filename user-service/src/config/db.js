const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

// NOTE ON PRODUCTION READINESS:
// lowdb (a flat JSON file) is used here so the assignment can be
// cloned and run with zero external database setup. It is NOT
// suitable for real production traffic (no concurrent-write safety,
// no indexing, no replication). In a production deployment this
// module would be replaced with a proper client for PostgreSQL
// (e.g. Prisma/Knex) or MongoDB (Mongoose) behind the same
// findById/create/findByEmail interface used by the controller,
// so the rest of the service does not need to change.

const dbFile = path.join(__dirname, "..", "..", "data", "users.json");
const adapter = new FileSync(dbFile);
const db = low(adapter);

db.defaults({ users: [] }).write();

module.exports = db;
