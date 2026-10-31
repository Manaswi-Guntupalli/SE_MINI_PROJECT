const crypto = require("crypto");

const getCsrfToken = (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  return res.json({
    csrfToken: req.session.csrfToken,
  });
};

const requireCsrf = (req, res, next) => {
  const token = req.get("X-CSRF-Token");

  if (
    !req.session ||
    !req.session.csrfToken ||
    !token ||
    token !== req.session.csrfToken
  ) {
    return res.status(403).json({
      message: "Invalid CSRF token",
    });
  }

  next();
};

module.exports = {
  getCsrfToken,
  requireCsrf,
};