// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Middleware to check if user is moderator
function requireModerator(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.session.isModerator) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  next();
}

module.exports = {
  requireAuth,
  requireModerator
};
