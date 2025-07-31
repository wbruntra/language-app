/**
 * Middleware to check if the user has admin privileges
 */
const requireAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Check if user has admin privileges
  if (!req.session.is_admin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // User is authenticated and is an admin, proceed
  next()
}

module.exports = {
  requireAdmin
}
