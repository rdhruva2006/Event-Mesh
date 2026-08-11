const express = require("express");
const { register, login, getUserById, listUsers } = require("../controllers/userController");
const { registerRules, loginRules, handleValidation } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Public
router.post("/register", registerRules, handleValidation, register);
router.post("/login", loginRules, handleValidation, login);

// Protected (require a valid JWT)
router.get("/", requireAuth, listUsers);
router.get("/:id", requireAuth, getUserById);

module.exports = router;
