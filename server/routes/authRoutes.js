const express = require("express");

const {
  login,
  logout,
  getCurrentUser,
} = require("../controllers/authController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const {
  getCsrfToken,
  requireCsrf,
} = require("../middleware/csrfMiddleware");

const router = express.Router();

router.post("/login", login);

router.get(
  "/me",
  requireAuth,
  getCurrentUser
);

router.get(
  "/csrf-token",
  requireAuth,
  getCsrfToken
);

router.post(
  "/logout",
  requireAuth,
  requireCsrf,
  logout
);

module.exports = router;