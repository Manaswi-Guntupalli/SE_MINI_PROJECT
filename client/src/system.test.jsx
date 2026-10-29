// @vitest-environment-options {"url":"http://localhost:5173"}
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
const require = createRequire(resolve(process.cwd(), '../server/package.json'));
const { connectTestDatabase, closeTestDatabase } = require('./test/database.mjs');
let listener, App, Exam, Attempt, User, Response, Result;

beforeAll(async () => {
  // Real bcrypt/network/database calls need more than the default 1s DOM wait on CI.
  configure({ asyncUtilTimeout: 10000 });
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'isolated-react-http-system-test-secret';
  await connectTestDatabase();
  User = require('./models/User');
  Exam = require('./models/Exam');
  Attempt = require('./models/Attempt');
  Response = require('./models/Response');
  Result = require('./models/Result');
  const bcrypt = require('bcryptjs');
  await Promise.all([User.init(), Exam.init(), Attempt.init()]);
  const passwordHash = await bcrypt.hash('SystemTest123!', 12);
  for (const role of ['Instructor', 'Student', 'Admin']) await User.create({ name: `System ${role}`, email: `${role.toLowerCase()}@system.invalid`, passwordHash, role });
  await User.create({ name: 'Other Student', email: 'otherstudent@system.invalid', passwordHash, role: 'Student' });
  const app = require('./app');
  listener = await new Promise(resolve => {
    const server = app.listen(0, 'localhost', () => resolve(server));
  });
  vi.stubEnv('VITE_API_URL', `http://localhost:${listener.address().port}/api`);
  App = (await import('./App')).default;
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
}, 180000);
afterAll(async () => {
  cleanup();
  if (listener) await new Promise(resolve => listener.close(resolve));
  await closeTestDatabase();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function signIn(role) {
  fireEvent.change(await screen.findByPlaceholderText('Email'), { target: { value: `${role}@system.invalid` } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'SystemTest123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
}

it('SYS-INSTRUCTOR-01: real React → HTTP/session/CSRF → Express → MongoDB create/edit/options/publish/reload → Student start', async () => {
  render(<App />);
  await signIn('instructor');
  await screen.findByText('System Instructor');
  fireEvent.change(screen.getByPlaceholderText('Exam title'), { target: { value: 'System verified quiz' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Exam' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
  fireEvent.change(await screen.findByLabelText('Edit exam title'), { target: { value: 'System revised quiz' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Exam Changes' }));
  await screen.findByText('System revised quiz');
  fireEvent.change(screen.getByPlaceholderText('Question'), { target: { value: 'Which answer is correct?' } });
  fireEvent.change(screen.getByPlaceholderText('Option 1'), { target: { value: 'Correct response' } });
  fireEvent.change(screen.getByPlaceholderText('Option 2'), { target: { value: 'Incorrect response' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove option 4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove option 3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Question' }));
  await screen.findByText('1. Which answer is correct?');
  fireEvent.click(screen.getByRole('button', { name: 'Publish Exam' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Publish Exam' })).toBeNull());
  const stored = await Exam.findOne({ title: 'System revised quiz' });
  expect(stored.status).toBe('Published');
  expect(stored.questions[0].options).toHaveLength(2);
  expect(stored.questions[0].options.filter(option => option.isCorrect)).toHaveLength(1);
  cleanup();
  render(<App />);
  await screen.findByText('System revised quiz');
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await signIn('student');
  fireEvent.click(await screen.findByRole('button', { name: 'Start or resume System revised quiz' }));
  await screen.findByText('Exam started');
  expect(screen.getByRole('heading', { name: '1. Which answer is correct?' })).toBeTruthy();
  expect(screen.queryByText('Edit Question')).toBeNull();
  expect(await Attempt.countDocuments({ examId: stored._id })).toBe(1);

  // OEP-39/40: persist a student's answer, submit, evaluate and display only that student's result.
  fireEvent.click(screen.getByLabelText('Correct response'));
  await waitFor(async () => expect(await Response.countDocuments({ attemptId: (await Attempt.findOne({ examId: stored._id }))._id })).toBe(1));
  fireEvent.click(screen.getByRole('button', { name: 'Submit examination' }));
  await screen.findByText('Evaluation complete: 1 / 1');
  const savedResult = await Result.findOne({ examId: stored._id });
  expect(savedResult).toBeTruthy();
  expect(savedResult.score).toBe(1);
  expect(savedResult.maximum).toBe(1);
  expect(savedResult.status).toBe('Evaluated');
  expect(await Attempt.countDocuments({ examId: stored._id, evaluationStatus: 'Evaluated' })).toBe(1);
  expect(await Result.countDocuments({ attemptId: savedResult.attemptId })).toBe(1);

  // OEP-41: the exam's instructor can retrieve and view its evaluated result.
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await signIn('instructor');
  fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
  await screen.findByRole('heading', { name: 'Manage Exam' });
  fireEvent.click(screen.getByRole('button', { name: 'Load student results' }));
  await screen.findByText('System Student');
  expect(screen.getByText('Score: 1 / 1')).toBeTruthy();

  // OEP-40 security: a different student must not see the first student's result.
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  fireEvent.change(await screen.findByPlaceholderText('Email'), { target: { value: 'otherstudent@system.invalid' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'SystemTest123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await screen.findByText(/Welcome, Other Student/);
  await screen.findByText('No evaluated results yet. Submitted results will appear here.');
  expect(screen.queryByText('Score: 1 / 1')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await signIn('admin');
  await screen.findByRole('heading', { name: 'Accounts' });
  for (const [field, value] of Object.entries({ name: 'New System User', email: 'new@system.invalid', password: 'SystemAccount123!' })) {
    fireEvent.change(screen.getByLabelText(`Account ${field}`), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  const roleControl = await screen.findByRole('combobox', { name: 'Role for new@system.invalid' });
  fireEvent.change(roleControl, { target: { value: 'Instructor' } });
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Role for new@system.invalid' }).value).toBe('Instructor'));
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate new@system.invalid' }));
  await screen.findByRole('button', { name: 'Activate new@system.invalid' });
  const account = await User.findOne({ email: 'new@system.invalid' }).select('+passwordHash');
  expect(account.role).toBe('Instructor');
  expect(account.active).toBe(false);
  expect(account.passwordHash).not.toBe('SystemAccount123!');
}, 30000);
