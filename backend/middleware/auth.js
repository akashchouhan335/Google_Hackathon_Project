const db = require('../db/firestore');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No authorization header provided.' });
  }

  // Check format
  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Format is Authorization: Bearer <token>' });
  }

  try {
    // Verify Firebase ID Token using the modular db instance
    const actualToken = token.split(' ')[1];
    const decoded = await db.admin.auth().verifyIdToken(actualToken);
    
    // Set user id in request using uid to match existing records
    req.user = { id: decoded.uid, email: decoded.email, uid: decoded.uid };
    next();
  } catch (err) {
    console.error('Firebase Auth Error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired authorization token.' });
  }
};
