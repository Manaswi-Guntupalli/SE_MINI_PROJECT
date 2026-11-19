import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evidenceDirectory, evidenceFile } from './evidencePaths.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('evidence CLI rejects missing paths and directories outside retained evidence', () => {
  assert.throws(() => evidenceDirectory(), /Provide a report directory/);
  assert.throws(() => evidenceDirectory('.'), /inside docs\/evidence/);
  assert.throws(() => evidenceDirectory('docs/evidence/../..'), /inside docs\/evidence/);
});

test('evidence paths reject link escapes and arbitrary report filenames', () => {
  const directory = mkdtempSync(join(root, 'docs/evidence/.security-test-'));
  const outside = mkdtempSync(join(tmpdir(), 'oep-security-'));
  try {
    assert.equal(dirname(directory), join(root, 'docs', 'evidence'));
    assert.equal(dirname(outside), tmpdir());
    const normalized = evidenceDirectory(directory);
    assert.equal(evidenceFile(normalized, 'traceability.json'), join(normalized, 'traceability.json'));
    assert.throws(() => evidenceFile(normalized, '../../README.md'), /Unsupported/);
    const link = join(directory, 'escape');
    symlinkSync(outside, link, 'junction');
    assert.throws(() => evidenceDirectory(link), /inside docs\/evidence/);
    const report = join(directory, 'server-tests.json');
    // A directory junction is also an invalid report, even without file-link privileges.
    mkdirSync(join(outside, 'report'));
    symlinkSync(join(outside, 'report'), report, 'junction');
    assert.throws(() => evidenceFile(normalized, 'server-tests.json'), /symbolic links/);
    writeFileSync(join(directory, 'client-tests.json'), '{}');
    assert.equal(evidenceFile(normalized, 'client-tests.json'), join(normalized, 'client-tests.json'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
