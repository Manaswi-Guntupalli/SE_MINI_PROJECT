const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.active) {
      if (req.session) {
        req.session.destroy(() => {});
      }

      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Load the current account from MongoDB on every request.
    // This means role/status changes affect existing sessions.
    req.user = user;

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Authentication check failed",
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};