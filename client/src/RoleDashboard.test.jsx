import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import RoleDashboard from './RoleDashboard';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const props = { api: 'http://localhost:5000/api', csrfToken: 'csrf', logout: vi.fn() };

describe('OEP-40 persisted result states', () => {
  it('closes answer entry when submission persisted but scoring failed', async () => {
    let submitted = false;
    axios.get.mockImplementation(url => {
      if (url.endsWith('/student/exams')) return Promise.resolve({ data: [{ _id: 'exam', title: 'Retry quiz', duration: 30 }] });
      if (url.endsWith('/attempts/attempt')) return Promise.resolve({ data: { attempt: { status: 'Submitted' }, result: null } });
      if (url.endsWith('/pending-results')) return Promise.resolve({ data: submitted ? [{ _id: 'attempt', examTitle: 'Retry quiz' }] : [] });
      return Promise.resolve({ data: [] });
    });
    axios.post.mockImplementation(url => {
      if (url.endsWith('/start')) return Promise.resolve({ data: { attempt: { _id: 'attempt', status: 'Active', deadline: new Date(Date.now() + 60000).toISOString() }, questions: [] } });
      submitted = true;
      return Promise.reject(new Error('evaluation unavailable'));
    });
    render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start or resume Retry quiz' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit examination' }));
    await screen.findByText('Submission saved. Evaluation pending.');
    expect(screen.queryByText('Exam started')).toBeNull();
    await screen.findByText(/Your submitted answers are saved/);
  });
  it('shows results loading, pending evaluations and persisted scores after refresh/remount', async () => {
    let finish;
    let evaluated = false;
    axios.get.mockImplementation(url => {
      if (url.endsWith('/student/exams')) return Promise.resolve({ data: [] });
      if (url.endsWith('/pending-results')) return Promise.resolve({ data: evaluated ? [] : [{ _id: 'attempt', examTitle: 'Pending quiz' }] });
      if (!evaluated) return new Promise(resolve => { finish = resolve; });
      return Promise.resolve({ data: [{ _id: 'result', examTitle: 'Pending quiz', score: 2, maximum: 3, status: 'Evaluated' }] });
    });
    const user = { role: 'Student', name: 'Student' };
    const view = render(<RoleDashboard {...props} user={user} />);
    expect(screen.getByText('Loading results...')).toBeTruthy();
    expect(screen.queryByText('No evaluated results yet. Submitted results will appear here.')).toBeNull();
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    finish({ data: [] });
    await screen.findByText(/Evaluation pending/);
    expect(screen.queryByText('No evaluated results yet. Submitted results will appear here.')).toBeNull();
    evaluated = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh results' }));
    await screen.findByText('Score: 2 / 3');
    expect(screen.queryByText(/Evaluation pending/)).toBeNull();
    view.unmount();
    render(<RoleDashboard {...props} user={user} />);
    await screen.findByText('Score: 2 / 3');
  });
  it('shows a result API failure and recovers with explicit unavailable state on retry', async () => {
    let failed = true;
    axios.get.mockImplementation(url => url.endsWith('/student/results') && failed
      ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [] }));
    render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    await screen.findByText('Could not load results. Please retry.');
    expect(screen.queryByText('No evaluated results yet. Submitted results will appear here.')).toBeNull();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh results' }));
    await screen.findByText('No evaluated results yet. Submitted results will appear here.');
  });
});

describe('Supporting role boundaries', () => {
  it('Student sees eligibility list, starts/resumes and receives the persisted deadline', async () => {
    axios.get.mockResolvedValue({ data: [{ _id: 'exam', title: 'Available quiz', duration: 30, startTime: null }] });
    axios.post.mockResolvedValue({ data: { attempt: { deadline: '2026-10-25T10:00:00Z' }, questions: [{ _id: 'q', questionText: 'Question', options: [{ _id: 'o', text: 'Option' }] }] } });
    render(<RoleDashboard {...props} user={{ id: 's', name: 'Student', role: 'Student' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start or resume Available quiz' }));
    expect(await screen.findByText('Exam started')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1. Question' })).toBeTruthy();
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/student/exams/exam/start', {}, { headers: { 'X-CSRF-Token': 'csrf' } });
    expect(screen.queryByText('Accounts')).toBeNull();
  });
  it('Student sees an explicit empty state and start errors', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    const { unmount } = render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    expect(await screen.findByText('No exams available yet.')).toBeTruthy();
    unmount();
    axios.get.mockResolvedValue({ data: [{ _id: 'exam', title: 'Quiz', duration: 1 }] });
    axios.post.mockRejectedValue({ response: { data: { message: 'Exam is not available' } } });
    render(<RoleDashboard {...props} user={{ role: 'Student' }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start or resume Quiz' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Exam is not available');
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
    for (const [field, value] of Object.entries({ name: 'New User', email: 'new@test.invalid', password: 'Example12345!' })) {
      fireEvent.change(screen.getByLabelText(`Account ${field}`), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1]).toEqual({ name: 'New User', email: 'new@test.invalid', password: 'Example12345!', role: 'Student' });
    await waitFor(() => expect(screen.getByLabelText('Account password').value).toBe(''));
  });
});
