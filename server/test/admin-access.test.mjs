import { createRequire } from 'node:module';
import { beforeAll, beforeEach, afterAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const AdminAccessLock = require('../models/AdminAccessLock');
const bcrypt = require('bcryptjs');
let admins, accounts, student, passwordHash;
const password = 'AdminRegression123!';
beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([User.init(), AdminAccessLock.init()]);
  passwordHash = await bcrypt.hash(password, 4);
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), AdminAccessLock.deleteMany({})]);
  admins = await User.create(['a', 'b'].map(name => ({ name, email: `${name}@admin-regression.invalid`, passwordHash, role: 'Admin', active: true })));
  student = await User.create({ name: 'Student', email: 'student@admin-regression.invalid', passwordHash, role: 'Student', active: true });
  accounts = [];
  for (const admin of admins) {
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: admin.email, password })).status).toBe(200);
    accounts.push({ agent, token: (await agent.get('/api/auth/csrf-token')).body.csrfToken });
  }
});
afterAll(closeTestDatabase);

it.each([{ active: false }, { role: 'Student' }, { role: 'Instructor', active: false }])('BUG-02: concurrent cross-admin updates preserve an active admin: %j', async changes => {
  // Both requests pass their ordinary authentication check before either writes.
  const original = User.findById.bind(User);
  let arrivals = 0, release;
  const authorized = new Promise(resolve => { release = resolve; });
  const spy = vi.spyOn(User, 'findById').mockImplementation(async (...args) => {
    const user = await original(...args);
    if (++arrivals <= 2) { if (arrivals === 2) release(); await authorized; }
    return user;
  });
  try {
    const responses = await Promise.all(accounts.map((account, index) => account.agent.patch(`/api/admin/users/${admins[1 - index].id}`)
      .set('X-CSRF-Token', account.token).send(changes)));
    expect(responses.map(response => response.status).sort()).toEqual([200, 403]);
    expect(await User.countDocuments({ role: 'Admin', active: true })).toBe(1);
    expect(await AdminAccessLock.countDocuments()).toBe(1);
  } finally { spy.mockRestore(); }
});

it('BUG-02: normal role/status changes and self-protection still work', async () => {
  const account = accounts[0];
  const patch = (id, changes) => account.agent.patch(`/api/admin/users/${id}`).set('X-CSRF-Token', account.token).send(changes);
  expect((await patch(student.id, { role: 'Instructor' })).status).toBe(200);
  expect((await patch(student.id, { active: false })).status).toBe(200);
  expect((await patch(admins[0].id, { active: false })).status).toBe(400);
  expect((await patch(admins[0].id, { role: 'Student' })).status).toBe(400);
  expect((await patch(student.id, { role: 'Invalid' })).status).toBe(400);
  expect(await User.findById(student.id)).toMatchObject({ role: 'Instructor', active: false });
  expect(await User.countDocuments({ role: 'Admin', active: true })).toBe(2);
});
