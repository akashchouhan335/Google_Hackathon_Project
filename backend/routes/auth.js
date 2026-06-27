const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/jsonDb');
const config = require('../config');
const auth = require('../middleware/auth');

// Register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Please enter all required fields.' });
  }

  // Check unique user
  const existingUser = db.findOne('users', { email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = db.insert('users', {
      email: email.toLowerCase(),
      name,
      passwordHash,
      settings: {
        workStartHour: 9,
        workEndHour: 17,
        theme: 'light'
      }
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, config.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Remove password hash from response
    delete newUser.passwordHash;

    res.status(201).json({ token, user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Server registration error: ' + err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter email and password.' });
  }

  const user = db.findOne('users', { email: email.toLowerCase() });
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials. User not found.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid credentials. Password incorrect.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, config.JWT_SECRET, {
    expiresIn: '7d'
  });

  delete user.passwordHash;
  res.json({ token, user });
});

// Me
router.get('/me', auth, (req, res) => {
  const user = db.findOne('users', { id: req.user.id });
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  delete user.passwordHash;
  res.json(user);
});

// Update Settings
router.put('/settings', auth, (req, res) => {
  const { workStartHour, workEndHour, theme } = req.body;
  const user = db.findOne('users', { id: req.user.id });
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const updatedSettings = {
    workStartHour: workStartHour !== undefined ? Number(workStartHour) : user.settings.workStartHour,
    workEndHour: workEndHour !== undefined ? Number(workEndHour) : user.settings.workEndHour,
    theme: theme || user.settings.theme
  };

  db.update('users', { id: req.user.id }, { settings: updatedSettings });
  
  const updatedUser = db.findOne('users', { id: req.user.id });
  delete updatedUser.passwordHash;

  res.json(updatedUser);
});

module.exports = router;
