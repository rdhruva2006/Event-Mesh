const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");

class User {
  static findByEmail(email) {
    return db.get("users").find({ email: email.toLowerCase() }).value();
  }

  static findById(id) {
    return db.get("users").find({ id }).value();
  }

  static findAll() {
    return db.get("users").value();
  }

  static create({ name, email, passwordHash }) {
    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.get("users").push(user).write();
    return user;
  }

  /** Returns a user object with the password hash stripped out. */
  static toPublic(user) {
    if (!user) return null;
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}

module.exports = User;
