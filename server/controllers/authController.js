const User = require("../models/User");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "This account is inactive",
      });
    }

    req.session.userId = user._id.toString();

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout failed",
      });
    }

    res.clearCookie("oep.sid");

    return res.json({
      message: "Logout successful",
    });
  });
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.active) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not retrieve current user",
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
};