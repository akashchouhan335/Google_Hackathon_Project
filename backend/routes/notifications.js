const express = require('express');
const router = express.Router();
const db = require('../db/jsonDb');
const auth = require('../middleware/auth');

// Get all notifications
router.get('/', auth, (req, res) => {
  const list = db.find('notifications', { userId: req.user.id });
  // Sort by createdAt descending
  const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// Mark notification as read
router.put('/:id/read', auth, (req, res) => {
  const notificationId = req.params.id;
  const notif = db.findOne('notifications', { id: notificationId, userId: req.user.id });
  
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  db.update('notifications', { id: notificationId }, { read: true });
  res.json({ success: true, message: 'Notification marked as read.' });
});

// Clear read notifications
router.delete('/clear-read', auth, (req, res) => {
  db.delete('notifications', { userId: req.user.id, read: true });
  res.json({ success: true, message: 'Cleared all read notifications.' });
});

module.exports = router;
