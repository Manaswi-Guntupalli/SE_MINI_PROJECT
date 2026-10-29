import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

async function login(page, role) {
  await page.getByPlaceholder('Email', { exact: true }).fill(`${role}@browser.invalid`);
  await page.getByPlaceholder('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}
async function saveChoice(page, label) {
  const saved = page.waitForResponse(response => response.url().endsWith('/responses') && response.request().method() === 'POST');
  await page.getByLabel(label, { exact: true }).check();
  expect((await saved).status()).toBe(200);
}

test('OEP44-ST-01: browser → HTTP → database, save/change/navigation/reload, scoring, privacy and Admin', async ({ page, browser }, testInfo) => {
  testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  await page.goto('/');
  await login(page, 'instructor');
  await page.getByPlaceholder('Exam title', { exact: true }).fill('Browser Release 1');
  await page.getByRole('button', { name: 'Create Exam', exact: true }).click();
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  for (let n = 1; n <= 3; n++) {
    await page.getByPlaceholder('Question', { exact: true }).fill(`Browser question ${n}`);
    await page.getByPlaceholder('Option 1', { exact: true }).fill(`Correct ${n}`);
    await page.getByPlaceholder('Option 2', { exact: true }).fill(`Wrong ${n}`);
    await page.getByRole('button', { name: 'Remove option 4', exact: true }).click();
    await page.getByRole('button', { name: 'Remove option 3', exact: true }).click();
    await page.getByRole('button', { name: 'Add Question', exact: true }).click();
    await expect(page.getByText(`${n}. Browser question ${n}`, { exact: true })).toBeVisible();
  }
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Publish Exam', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish Exam', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'student');
  await page.getByRole('button', { name: 'Start or resume Browser Release 1', exact: true }).click();
  const deadline = await page.getByText(/^Deadline:/).textContent();
  // Navigate between question controls and change a previously acknowledged answer.
  await saveChoice(page, 'Wrong 1');
  await saveChoice(page, 'Wrong 2');
  await page.getByRole('heading', { name: '1. Browser question 1', exact: true }).scrollIntoViewIfNeeded();
  await saveChoice(page, 'Correct 1');
  await page.reload();
  await page.getByRole('button', { name: 'Start or resume Browser Release 1', exact: true }).click();
  await expect(page.getByLabel('Correct 1', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Wrong 2', { exact: true })).toBeChecked();
  expect(await page.getByText(/^Deadline:/).textContent()).toBe(deadline);
  // A failed save is visible and does not replace the acknowledged database answer.
  await page.route('**/api/student/attempts/*/responses', route => route.abort());
  await page.getByLabel('Correct 2', { exact: true }).check();
  await expect(page.getByRole('alert')).toContainText('Could not save answer');
  await page.unroute('**/api/student/attempts/*/responses');
  await page.reload();
  await page.getByRole('button', { name: 'Start or resume Browser Release 1', exact: true }).click();
  await expect(page.getByLabel('Wrong 2', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Submit examination', exact: true }).click();
  // Q1 correct, Q2 wrong, Q3 unanswered.
  await expect(page.getByText('Score: 1 / 3', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Score: 1 / 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'other');
  await expect(page.getByText('No evaluated results yet. Submitted results will appear here.')).toBeVisible();
  await expect(page.getByText('Score: 1 / 3', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'instructor');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('button', { name: 'Load student results', exact: true }).click();
  await expect(page.getByText('student@browser.invalid', { exact: true })).toBeVisible();
  await expect(page.getByText('Score: 1 / 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, 'admin');
  await page.getByLabel('Account name', { exact: true }).fill('Browser New');
  await page.getByLabel('Account email', { exact: true }).fill('new@browser.invalid');
  await page.getByLabel('Account password', { exact: true }).fill('BrowserAccount123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('combobox', { name: 'Role for new@browser.invalid', exact: true }).selectOption('Instructor');
  await expect(page.getByRole('combobox', { name: 'Role for new@browser.invalid', exact: true })).toHaveValue('Instructor');
  await page.getByRole('button', { name: 'Deactivate new@browser.invalid', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activate new@browser.invalid', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('release1-admin.png'), fullPage: true });
});

test('OEP44-ST-02: closing the browser does not stop server timeout evaluation', async ({ browser }, testInfo) => {
  testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  const require = createRequire(new URL('../../server/package.json', import.meta.url));
  const mongoose = require('mongoose');
  const { uri } = JSON.parse(readFileSync(new URL('../reports/browser-fixture.json', import.meta.url), 'utf8'));
  // Connect only to the disposable fixture database, never MONGO_URI/.env.
  await mongoose.connect(uri);
  const User = require('./models/User'), Exam = require('./models/Exam');
  const Attempt = require('./models/Attempt'), Result = require('./models/Result');
  const context = await browser.newContext();
  try {
    const instructor = await User.findOne({ role: 'Instructor' });
    const student = await User.findOne({ email: 'other@browser.invalid' });
    const exam = await Exam.create({ title: 'Closed browser timeout', duration: 30, instructorId: instructor._id, status: 'Published',
      questions: [{ questionText: 'Timeout question', options: [{ text: 'Timeout correct', isCorrect: true }, { text: 'Timeout wrong' }] }],
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await login(page, 'other');
    await page.getByRole('button', { name: 'Start or resume Closed browser timeout', exact: true }).click();
    await saveChoice(page, 'Timeout correct');
    const attempt = await Attempt.findOne({ examId: exam._id, studentId: student._id });
    await context.close();
    // Advance only this disposable attempt's DB fixture to expiry, avoiding a
    // thirty-minute wait. No browser/client submission request is sent.
    await Attempt.collection.updateOne({ _id: attempt._id }, { $set: { startedAt: new Date(Date.now() - 120000), deadline: new Date(Date.now() - 60000) } });
    await expect.poll(async () => Result.countDocuments({ attemptId: attempt._id }), { timeout: 10000 }).toBe(1);
    expect(await Result.findOne({ attemptId: attempt._id })).toMatchObject({ score: 1, maximum: 1 });
    expect(await Attempt.findById(attempt._id)).toMatchObject({ status: 'Submitted', submissionReason: 'Timeout', evaluationStatus: 'Evaluated' });
  } finally {
    await context.close();
    await mongoose.disconnect();
  }
});
