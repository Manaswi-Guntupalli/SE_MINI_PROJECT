import { afterEach, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';
import RoleDashboard from './RoleDashboard';
vi.mock('axios', () => ({ default: { defaults: {}, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.resetAllMocks(); });
const props = { user: { id: 'admin', role: 'Admin' }, api: '/api', csrfToken: 'token', logout: vi.fn() };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

it.each(['open', 'save', 'list'].flatMap(action => ['resolve', 'reject'].map(outcome => [action, outcome])))('BUG-01: ignores a previous instructor\'s late %s request that %ss after another account signs in', async (action, outcome) => {
  const delayed = deferred();
  const user = { id: 'teacher-a', name: 'Teacher A', role: 'Instructor' };
  const exam = { _id: 'private-a', title: 'Private exam from A', status: 'Draft', duration: 30, questions: [{ _id: 'q', questionText: 'Private question from A', marks: 5, options: [{ _id: 'o', text: 'Secret correct answer', isCorrect: true }] }] };
  let delayList = false, switched = false;
  axios.get.mockImplementation(url => {
    if (url.endsWith('/auth/me')) return Promise.resolve({ data: { user } });
    if (url.endsWith('/csrf-token')) return Promise.resolve({ data: { csrfToken: 'token' } });
    if (url.endsWith('/mine')) return delayList ? delayed.promise : Promise.resolve({ data: switched ? [] : [exam] });
    return action === 'open' ? delayed.promise : Promise.resolve({ data: exam });
  });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
  if (action !== 'open') {
    await screen.findByRole('heading', { name: 'Manage Exam' });
    axios.put.mockImplementation(() => action === 'save' ? delayed.promise : Promise.resolve({ data: exam }));
    if (action === 'list') delayList = true;
    fireEvent.click(screen.getByRole('button', { name: 'Save Exam Changes' }));
    if (action === 'list') await waitFor(() => expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/mine'))).toHaveLength(2));
  }
  axios.post.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  await screen.findByRole('button', { name: 'Login' });
  switched = true; delayList = false;
  axios.post.mockResolvedValue({ data: { user: { id: 'teacher-b', name: 'Teacher B', role: 'Instructor' } } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'b@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password123456!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await screen.findByText('Teacher B');
  await act(async () => { if (outcome === 'resolve') delayed.resolve({ data: action === 'list' ? [exam] : exam }); else delayed.reject(new Error('Private old request failed')); });
  expect(screen.queryByRole('heading', { name: 'Manage Exam' })).toBeNull();
  expect(screen.queryByText('Private exam from A')).toBeNull();
  expect(screen.queryByText(/successfully/)).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('No exams created yet.')).toBeTruthy();
});

const restored = { attempt: { _id: 'attempt', status: 'Active', deadline: '2099-01-01' }, questions: [], responses: [], serverTime: '2026-11-08T00:00:00Z' };
it('BUG-03: restores the active attempt even if the exam list fails', async () => {
  sessionStorage.setItem('oep-attempt-student', 'attempt');
  axios.get.mockImplementation(url => url.endsWith('/student/exams') ? Promise.reject(new Error('listing offline')) : Promise.resolve({ data: restored }));
  render(<RoleDashboard {...props} user={{ id: 'student', role: 'Student' }} />);
  expect(await screen.findByRole('heading', { name: 'Exam started' })).toBeTruthy();
  expect(axios.get).toHaveBeenCalledWith('/api/student/attempts/attempt');
  expect(screen.queryByText(/No exam is open/)).toBeNull();
});

it('BUG-03: a failed restoration has its own retry without claiming the attempt is missing', async () => {
  sessionStorage.setItem('oep-attempt-student', 'attempt');
  let fail = true;
  axios.get.mockImplementation(url => url.endsWith('/student/exams') ? Promise.resolve({ data: [] }) : fail ? Promise.reject(new Error('attempt offline')) : Promise.resolve({ data: restored }));
  render(<RoleDashboard {...props} user={{ id: 'student', role: 'Student' }} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Current attempt' }));
  await screen.findByText(/Could not restore your attempt/);
  expect(screen.queryByText(/No exam is open/)).toBeNull();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry attempt restoration' }));
  await screen.findByRole('heading', { name: 'Exam started' });
});

it.each(['resolve', 'reject'])('BUG-04: an older initial list cannot overwrite a newer creation refresh when it %ss', async result => {
  const initial = deferred();
  const created = { id: 'new', name: 'New User', email: 'new@example.test', role: 'Student', active: true };
  axios.get.mockImplementationOnce(() => initial.promise).mockResolvedValue({ data: [created] });
  axios.post.mockResolvedValue({ data: created });
  render(<RoleDashboard {...props} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
  fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));
  await screen.findByRole('combobox', { name: 'Role for new@example.test' });
  await act(async () => { if (result === 'resolve') initial.resolve({ data: [] }); else initial.reject(new Error('Old request failed')); });
  expect(screen.getByRole('combobox', { name: 'Role for new@example.test' })).toBeTruthy();
  expect(screen.getByText('Account created successfully')).toBeTruthy();
  expect(screen.queryByText('No accounts found.')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each(['Admin', 'Student'])('BUG-05: dismissing a %s list error retains an unavailable state until a successful retry', async role => {
  axios.get.mockRejectedValue(new Error('database unavailable'));
  render(<RoleDashboard {...props} user={{ id: 'user', role }} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('No accounts found.')).toBeNull();
  expect(screen.queryByText('No exams available yet.')).toBeNull();
  expect(screen.getByText('The list is unavailable. Retry loading it.')).toBeTruthy();
  axios.get.mockResolvedValue({ data: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
  await screen.findByText(role === 'Admin' ? 'No accounts found.' : 'No exams available yet.');
  expect(screen.queryByText('The list is unavailable. Retry loading it.')).toBeNull();
});
