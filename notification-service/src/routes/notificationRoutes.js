const express = require("express");
const notificationStore = require("../store/notificationStore");

const router = express.Router();

// GET /api/notifications/:userId - list notifications for a user
router.get("/:userId", (req, res) => {
  const notifications = notificationStore.findByUserId(req.params.userId);
  res.status(200).json({ notifications, count: notifications.length });
});

// GET /api/notifications - list all notifications (debug/admin use)
router.get("/", (req, res) => {
  const notifications = notificationStore.findAll();
  res.status(200).json({ notifications, count: notifications.length });
});

module.exports = router;
