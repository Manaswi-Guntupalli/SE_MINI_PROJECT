import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const User = require('../models/User');
const bcrypt = require('bcryptjs');
let uri;
const script = fileURLToPath(new URL('../scripts/seedUsers.js', import.meta.url));
beforeAll(async () => { uri = await connectTestDatabase(); await User.init(); });
afterAll(closeTestDatabase);

function seed(mode = 'development') {
  return execFileSync(process.execPath, [script], {
    env: { ...process.env, NODE_ENV: mode, MONGO_URI: uri },
    encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

it('generates independent demo credentials, stores hashes and generates new credentials on an explicit rerun', async () => {
  const first = [...seed().matchAll(/Created\/updated: (\S+) \| temporary password: (\S+)/g)];
  expect(first).toHaveLength(5);
  expect(new Set(first.map(match => match[2])).size).toBe(5);
  for (const [, email, password] of first) {
    expect(password.length).toBeGreaterThanOrEqual(12);
    const user = await User.findOne({ email }).select('+passwordHash');
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  }
  const second = [...seed().matchAll(/Created\/updated: (\S+) \| temporary password: (\S+)/g)];
  expect(second).toHaveLength(5);
  expect(second.every((match, index) => match[2] !== first[index][2])).toBe(true);
  expect(await User.countDocuments()).toBe(5);
});

it('refuses production seeding and leaves existing accounts unchanged', async () => {
  const before = await User.find().select('+passwordHash').lean();
  expect(() => seed('production')).toThrow();
  expect(await User.find().select('+passwordHash').lean()).toEqual(before);
});
