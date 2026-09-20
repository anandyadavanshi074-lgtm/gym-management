// Middleware for Authentication and Role Authorization

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login?error=' + encodeURIComponent('Please login to continue'));
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    if (req.session.user.role !== role) {
      // Redirect to their own dashboard if wrong role
      if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
      if (req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
      if (req.session.user.role === 'member') return res.redirect('/member/dashboard');
      return res.redirect('/login');
    }
    next();
  };
}

// Expose user to all views
function exposeUser(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.error = req.query.error || null;
  res.locals.success = req.query.success || null;
  next();
}

module.exports = {
  isAuthenticated,
  requireRole,
  exposeUser
};
