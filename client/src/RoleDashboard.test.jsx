import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import RoleDashboard from './RoleDashboard';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.resetAllMocks(); });
const props = { api: 'http://localhost:5000/api', csrfToken: 'csrf', logout: vi.fn() };

it('admin tabs show one section at a time and retain unfinished input with keyboard navigation', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
  await screen.findByText('No accounts found.');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
  expect(screen.queryByRole('heading', { name: 'Accounts' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Unfinished account' } });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Create account' }), { key: 'Home' });
  expect(screen.getByRole('heading', { name: 'Accounts' })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Accounts' }));
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Accounts' }), { key: 'ArrowRight' });
  expect(screen.getByLabelText('Account name').value).toBe('Unfinished account');
});

it('failed account creation stays on the form with its error and entered values', async () => {
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockRejectedValue({ response: { data: { message: 'Email already exists' } } });
  render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
  await screen.findByText('No accounts found.');
  fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
  fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Existing user' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));
  expect((await screen.findByRole('alert')).textContent).toBe('Email already exists');
  expect(screen.getByRole('tab', { name: 'Create account' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByLabelText('Account name').value).toBe('Existing user');
  expect(screen.getByRole('button', { name: 'Create account' }).disabled).toBe(false);
});

it('clears an old success before a failed update, supports dismissal, and clears messages on tab changes', async () => {
  axios.get.mockResolvedValue({ data: [{ id: 's', email: 'student@test.invalid', role: 'Student', active: true }] });
  axios.patch.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce({ response: { data: { message: 'Update denied' } } });
  render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate student@test.invalid' }));
  await screen.findByText('Account updated successfully');
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate student@test.invalid' }));
  await screen.findByText('Update denied');
  expect(screen.queryByText('Account updated successfully')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByRole('alert')).toBeNull();
  axios.patch.mockResolvedValueOnce({ data: {} });
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate student@test.invalid' }));
  await screen.findByText('Account updated successfully');
  fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
  expect(screen.queryByText('Account updated successfully')).toBeNull();
});

it.each(['create', 'update'])('reports a saved account %s separately from a failed list refresh', async action => {
  axios.get.mockResolvedValue({ data: [{ id: 's', email: 'student@test.invalid', role: 'Student', active: true }] });
  axios.post.mockResolvedValue({ data: {} });
  axios.patch.mockResolvedValue({ data: {} });
  render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
  await screen.findByRole('button', { name: 'Deactivate student@test.invalid' });
  axios.get.mockRejectedValueOnce(new Error('List refresh offline'));
  if (action === 'create') {
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));
  } else fireEvent.click(screen.getByRole('button', { name: 'Deactivate student@test.invalid' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain(`Account ${action === 'create' ? 'created' : 'updated'} successfully`);
  expect(alert.textContent).toContain('The account list could not refresh');
  expect(screen.queryByText(`Could not ${action} account`)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
  await screen.findByRole('button', { name: 'Deactivate student@test.invalid' });
  expect(screen.queryByRole('alert')).toBeNull();
});

describe('Supporting role boundaries', () => {
  it('Student sees eligibility list, starts/resumes and receives the persisted deadline', async () => {
    axios.get.mockResolvedValue({ data: [{ _id: 'exam', title: 'Available quiz', duration: 30, startTime: null }] });
    axios.post.mockResolvedValue({ data: { attempt: { deadline: '2099-01-01T10:00:00Z' }, serverTime: '2026-10-28T10:00:00Z', questions: [{ _id: 'q', questionText: 'Question', options: [{ _id: 'o', text: 'Option' }] }] } });
    render(<RoleDashboard {...props} user={{ id: 's', name: 'Student', role: 'Student' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start Available quiz' }));
    expect(await screen.findByText('Exam started')).toBeTruthy();
    expect(screen.getByText(/Question 1 of 1: Question/)).toBeTruthy();
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/student/exams/exam/start', {}, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(screen.queryByText('Accounts')).toBeNull();
  });
  it('Student sees an explicit empty state and start errors', async () => {
    axios.get.mockResolvedValue({ data: [] });
    const { unmount } = render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    expect(await screen.findByText('No exams available yet.')).toBeTruthy();
    unmount();
    axios.get.mockResolvedValue({ data: [{ _id: 'exam', title: 'Quiz', duration: 1 }] });
    axios.post.mockRejectedValue({ response: { data: { message: 'Exam is not available' } } });
    render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start Quiz' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Exam is not available');
  });
  it('#39 restores an owned attempt from the server after reload', async () => {
    sessionStorage.setItem('oep-attempt-s', 'attempt');
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/attempts/attempt')
      ? { attempt: { _id: 'attempt', status: 'Active', deadline: '2099-01-01' }, serverTime: '2026-10-28T10:00:00Z', responses: [], questions: [{ _id: 'q', questionText: 'Restored question', options: [] }] }
      : [] }));
    render(<RoleDashboard {...props} user={{ id: 's', role: 'Student' }} />);
    expect(await screen.findByText(/Restored question/)).toBeTruthy();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/student/attempts/attempt');
  });
  it('#38 uses server eligibility and disables scheduled and submitted exams', async () => {
    axios.get.mockResolvedValue({ data: [
      { _id: 'future', title: 'Future', canStart: false, attemptStatus: 'Not started' },
      { _id: 'done', title: 'Done', canStart: false, attemptStatus: 'Submitted' },
      { _id: 'active', title: 'Active', canStart: false, canResume: true, attemptStatus: 'Active' },
    ] });
    render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    expect((await screen.findByRole('button', { name: 'Start Future' })).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Submitted Done' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Resume Active' }).disabled).toBe(false);
  });
  it('Admin can update another account but own access controls are disabled', async () => {
    axios.get.mockResolvedValue({ data: [{ id: 'a', name: 'Admin', email: 'admin@test.invalid', role: 'Admin', active: true }, { id: 's', name: 'Student', email: 'student@test.invalid', role: 'Student', active: true }] });
    axios.patch.mockResolvedValue({ data: {} });
    render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
    expect((await screen.findByRole('combobox', { name: 'Role for admin@test.invalid' })).disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for student@test.invalid' }), { target: { value: 'Instructor' } });
    await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('http://localhost:5000/api/admin/users/s', { role: 'Instructor' }, { headers: { 'X-CSRF-Token': 'csrf' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate student@test.invalid' }));
    await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('http://localhost:5000/api/admin/users/s', { active: false }, expect.anything()));
    expect(screen.queryByText('Available exams')).toBeNull();
  });
  it('Admin account creation sends validated fields and clears the password', async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: {} });
    render(<RoleDashboard {...props} user={{ id: 'a', role: 'Admin' }} />);
    await screen.findByText('No accounts found.');
    fireEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    for (const [field, value] of Object.entries({ name: 'New User', email: 'new@test.invalid', password: 'Example12345!' })) {
      fireEvent.change(screen.getByLabelText(`Account ${field}`), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1]).toEqual({ name: 'New User', email: 'new@test.invalid', password: 'Example12345!', role: 'Student' });
    await waitFor(() => expect(screen.getByLabelText('Account password').value).toBe(''));
    expect(screen.getByRole('tab', { name: 'Accounts' }).getAttribute('aria-selected')).toBe('true');
  });
});

it('#47 clears the resume pointer on submission so dashboard refresh/reload cannot reopen it', async () => {
  sessionStorage.setItem('oep-attempt-s', 'attempt');
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/attempts/attempt')
    ? { attempt: { _id: 'attempt', status: 'Active', deadline: '2099-01-01' }, serverTime: '2026-10-28T10:00:00Z', responses: [], questions: [] }
    : [] }));
  axios.post.mockResolvedValue({ data: { attempt: { status: 'Submitted', evaluationStatus: 'Evaluated' } } });
  const propsForStudent = { ...props, user: { id: 's', role: 'Student' } };
  const { unmount } = render(<RoleDashboard {...propsForStudent} />);
  fireEvent.click(await screen.findByText('Submit examination'));
  fireEvent.click(screen.getByText('Confirm submission'));
  await screen.findByText('Exam submitted');
  await waitFor(() => expect(sessionStorage.getItem('oep-attempt-s')).toBeNull());
  expect(screen.queryByRole('timer')).toBeNull();
  expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/attempts/attempt'))).toHaveLength(1);
  unmount();
  render(<RoleDashboard {...propsForStudent} />);
  await screen.findByText('No exams available yet.');
  expect(screen.queryByText('Exam started')).toBeNull();
  expect(screen.queryByRole('timer')).toBeNull();
});
