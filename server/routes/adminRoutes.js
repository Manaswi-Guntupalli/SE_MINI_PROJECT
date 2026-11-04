const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireCsrf } = require('../middleware/csrfMiddleware');
const router = express.Router();
router.use(requireAuth, requireRole('Admin'));
const roles = ['Student', 'Instructor', 'Admin'];
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });
router.get('/users', async (req, res) => {
  try { res.json((await User.find().sort({ name: 1 })).map(publicUser)); }
  catch { res.status(500).json({ message: 'Could not load accounts' }); }
});
router.post('/users', requireCsrf, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (Object.keys(req.body).some(key => !['name', 'email', 'password', 'role'].includes(key)) ||
        typeof name !== 'string' || !name.trim() || typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' ||
        password.length < 12 || Buffer.byteLength(password, 'utf8') > 72 || !roles.includes(role)) {
      return res.status(400).json({ message: 'Provide a name, valid email, role and password of at least 12 characters and at most 72 UTF-8 bytes' });
    }
    const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12), role, active: true });
    res.status(201).json(publicUser(user));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? 'Email already exists' : 'Could not create account' });
  }
});
router.patch('/users/:id', requireCsrf, async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id) || !Object.keys(req.body).length ||
        Object.keys(req.body).some(key => !['role', 'active'].includes(key)) ||
        (req.body.role !== undefined && !roles.includes(req.body.role)) ||
        (req.body.active !== undefined && typeof req.body.active !== 'boolean')) {
      return res.status(400).json({ message: 'Only a valid role and active status may be updated' });
    }
    // No deletion endpoint: historical exam/attempt/result references remain intact.
    if (req.params.id === String(req.user._id) && (req.body.active === false || (req.body.role && req.body.role !== 'Admin'))) {
      return res.status(400).json({ message: 'Use another Admin to change your own access' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.json(publicUser(user));
  } catch { res.status(400).json({ message: 'Could not update account' }); }
});
module.exports = router;
