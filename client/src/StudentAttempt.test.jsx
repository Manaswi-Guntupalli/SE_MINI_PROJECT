import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import RoleDashboard from './RoleDashboard';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const props = { api: 'http://localhost:5000/api', csrfToken: 'csrf', logout: vi.fn(), user: { id: 'student', name: 'Student', role: 'Student' } };
const baseTime = Date.parse('2026-10-30T10:00:00Z');
let attempt;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => {
  attempt = {
    serverTime: new Date(baseTime).toISOString(),
    attempt: { _id: 'attempt', status: 'Active', deadline: new Date(baseTime + 60000).toISOString() },
    responses: [],
    questions: [1, 2].map(n => ({ _id: `q${n}`, questionText: `Question ${n}`, options: [{ _id: `a${n}`, text: `Choice A${n}` }, { _id: `b${n}`, text: `Choice B${n}` }] })),
  };
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/student/exams')
    ? [{ _id: 'exam', title: 'Quiz', duration: 1, attemptStatus: submissions().length ? 'Submitted' : 'Not started' }]
    : url.includes('/attempts/') ? attempt : [] }));
  axios.post.mockImplementation(url => Promise.resolve({ data: url.endsWith('/start') ? attempt : url.endsWith('/submit')
    ? { attempt: { status: 'Submitted', evaluationStatus: 'Evaluated' }, result: { score: 1, maximum: 2 } } : {} }));
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); });
async function open() {
  render(<RoleDashboard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Start Quiz' }));
  await screen.findByRole('heading', { name: 'Exam started' });
}
const saves = () => axios.put.mock.calls;
const submissions = () => axios.post.mock.calls.filter(([url]) => url.endsWith('/submit'));

describe('Student acceptance regressions #38 #40 #46 #47', () => {
  it('AC40-ORDER: serializes rapid selections so a delayed older request cannot overwrite the newer acknowledged answer; navigation retains it', async () => {
    const first = deferred(), second = deferred();
    axios.put.mockImplementation(() => saves().length === 1 ? first.promise : second.promise);
    await open();
    fireEvent.click(screen.getByLabelText('Choice A1'));
    fireEvent.click(screen.getByLabelText('Choice B1'));
    await waitFor(() => expect(saves()).toHaveLength(1));
    expect(screen.getByText('Saving answer…')).toBeTruthy();
    expect(saves()[0][1].selectedOptionId).toBe('a1');
    await act(async () => { first.resolve({ data: { response: { selectedOptionId: 'a1', revision: 1 } } }); });
    await waitFor(() => expect(saves()).toHaveLength(2));
    expect(saves()[1][1].selectedOptionId).toBe('b1');
    expect(screen.queryByText('Answer saved')).toBeNull();
    await act(async () => { second.resolve({ data: { response: { selectedOptionId: 'b1', revision: 2 } } }); });
    await screen.findByText('Answer saved');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByText(/Question 2 of 2: Question 2/)).toBeTruthy();
    expect(screen.getByText('Unanswered.')).toBeTruthy();
    expect(screen.getByLabelText('Choice A2').checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(screen.getByLabelText('Choice B1').checked).toBe(true);
    expect(screen.getByText('Answer saved')).toBeTruthy();
  });

  it('AC40-RETRY: failed selections are explicitly unsaved and can be retried without pretending they were acknowledged', async () => {
    let failed = false;
    axios.put.mockImplementation(() => {
      if (!failed) { failed = true; return Promise.reject(new Error('offline')); }
      return Promise.resolve({ data: { response: { selectedOptionId: 'b1', revision: 1 } } });
    });
    await open();
    fireEvent.click(screen.getByLabelText('Choice B1'));
    await screen.findByText('Answer not saved.');
    expect(screen.queryByText('Answer saved')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry answer save' }));
    await screen.findByText('Answer saved');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(saves()).toHaveLength(2);
  });

  it('AC47-DRAIN: manual submission waits for the pending answer acknowledgement and closes the completed listing action', async () => {
    const pending = deferred();
    axios.post.mockImplementation(url => Promise.resolve({ data: url.endsWith('/start') ? attempt : { attempt: { status: 'Submitted', evaluationStatus: 'Evaluated' }, result: { score: 1, maximum: 2 } } }));
    await open();
    axios.put.mockImplementation(() => pending.promise);
    fireEvent.click(screen.getByLabelText('Choice A1'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit examination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm submission' }));
    await waitFor(() => expect(saves()).toHaveLength(1));
    expect(submissions()).toHaveLength(0);
    expect(screen.getByLabelText('Choice B1').matches(':disabled')).toBe(true);
    expect(screen.getByText(/Only successfully saved responses will be submitted/)).toBeTruthy();
    await act(async () => { pending.resolve({ data: { response: { selectedOptionId: 'a1', revision: 1 } } }); });
    await screen.findByText('Exam submitted');
    expect(submissions()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Submitted Quiz' }).disabled).toBe(true);
    expect(screen.queryByText('Exam started')).toBeNull();
  });

  it('AC46-CLOCK: countdown uses server time and monotonic elapsed time despite device-clock changes', async () => {
    vi.useFakeTimers();
    await act(async () => { render(<RoleDashboard {...props} />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' })); });
    expect(screen.getByRole('timer').textContent).toBe('Time remaining: 1:00');
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('timer').textContent).toBe('Time remaining: 0:59');
    vi.setSystemTime(new Date('2000-01-01T00:00:00Z'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('timer').textContent).toBe('Time remaining: 0:58');
  });

  it('AC46-EXPIRY: expiry disables editing even when finalization fails, and permits submission retry', async () => {
    attempt.attempt.deadline = new Date(baseTime + 1000).toISOString();
    vi.useFakeTimers();
    await act(async () => { render(<RoleDashboard {...props} />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' })); });
    axios.post.mockRejectedValueOnce(new Error('submission offline'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1250); });
    expect(submissions()).toHaveLength(1);
    expect(screen.getByRole('timer').textContent).toBe('Time remaining: 0:00');
    expect(screen.getByLabelText('Choice A1').matches(':disabled')).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(submissions()).toHaveLength(1);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry submission' })); });
    expect(screen.getByText('Exam submitted')).toBeTruthy();
  });

  it('AC47-EXPIRY: a hung pending save cannot delay finalization beyond the persisted deadline', async () => {
    attempt.attempt.deadline = new Date(baseTime + 1000).toISOString();
    vi.useFakeTimers();
    await act(async () => { render(<RoleDashboard {...props} />); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' })); });
    const pending = deferred();
    axios.put.mockImplementation(() => pending.promise);
    await act(async () => { fireEvent.click(screen.getByLabelText('Choice A1')); fireEvent.click(screen.getByRole('button', { name: 'Submit examination' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm submission' })); });
    expect(submissions()).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1250); });
    expect(submissions()).toHaveLength(1);
    expect(screen.getByText('Exam submitted')).toBeTruthy();
    await act(async () => { pending.reject(new Error('late write rejected')); });
  });

  it('AC38-STATES: listing distinguishes Start/Resume/Submitted/Expired and disables ended attempts', async () => {
    axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/student/exams')
      ? ['Not started', 'Active', 'Submitted', 'Expired'].map((attemptStatus, index) => ({ _id: String(index), title: `Quiz ${index}`, attemptStatus })) : [] }));
    render(<RoleDashboard {...props} />);
    expect((await screen.findByRole('button', { name: 'Start Quiz 0' })).disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Resume Quiz 1' }).disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Submitted Quiz 2' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Expired Quiz 3' }).disabled).toBe(true);
  });
});
