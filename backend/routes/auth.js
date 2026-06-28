const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');

// Register - saves profile info after Firebase Auth signup
router.post('/register', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Please enter all required fields.' });
  }

  try {
    const existingUser = await db.findOne('users', { email: email.toLowerCase() });
    if (!existingUser) {
      await db.insert('users', {
        id: email.toLowerCase(), // Use email as the document ID for users
        email: email.toLowerCase(),
        name,
        settings: {
          workStartHour: 9,
          workEndHour: 17,
          theme: 'light'
        }
      });
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server registration error: ' + err.message });
  }
});

// Me - gets user profile
router.get('/me', auth, async (req, res) => {
  try {
    let user = await db.findOne('users', { email: req.user.email });
    
    // Auto-create user profile if it doesn't exist (e.g. they signed up via Firebase UI directly or we missed the register step)
    if (!user) {
      user = await db.insert('users', {
        id: req.user.email,
        email: req.user.email,
        name: req.user.email.split('@')[0], // Default name
        settings: {
          workStartHour: 9,
          workEndHour: 17,
          theme: 'light'
        }
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update Settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { workStartHour, workEndHour, theme } = req.body;
    const user = await db.findOne('users', { email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const updatedSettings = {
      workStartHour: workStartHour !== undefined ? Number(workStartHour) : user.settings.workStartHour,
      workEndHour: workEndHour !== undefined ? Number(workEndHour) : user.settings.workEndHour,
      theme: theme || user.settings.theme
    };

    const updatedUser = await db.update('users', { id: user.id }, { settings: updatedSettings });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
