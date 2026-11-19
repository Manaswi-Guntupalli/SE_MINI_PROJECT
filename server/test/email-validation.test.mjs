import { createRequire } from 'node:module';
import { it, expect } from 'vitest';
const require = createRequire(import.meta.url);
const { isValidEmail } = require('../services/emailValidation');

it.each(['student@example.test', 'first.last+exam@dept.example.edu'])('accepts a normal account email: %s', email => {
  expect(isValidEmail(email)).toBe(true);
});

it.each([null, {}, '', '@example.test', 'name@', 'name@example', 'name@@example.test',
  'name@.test', 'name@example.', 'name @example.test', 'name@example.test\n',
  'a'.repeat(100000) + '@' + 'b'.repeat(100000)])('rejects malformed or excessive email input (%#)', email => {
  expect(isValidEmail(email)).toBe(false);
});
