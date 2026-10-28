import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import ExamAttempt from './ExamAttempt';
vi.mock('axios', () => ({ default: { put: vi.fn(), post: vi.fn(), get: vi.fn() } }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });
const data = { attempt: { _id: 'a', status: 'Active', deadline: '2099-01-01' }, serverTime: '2026-10-28T10:00:00Z', responses: [], questions: [
  { _id: 'q1', questionText: 'First', options: [{ _id: 'o1', text: 'One' }, { _id: 'o2', text: 'Two' }] },
  { _id: 'q2', questionText: 'Second', options: [{ _id: 'o3', text: 'Three' }] },
] };
it('#40 saves acknowledged choices and preserves unanswered navigation', async () => {
  axios.put.mockResolvedValue({ data: { response: { questionId: 'q1', selectedOptionId: 'o1', revision: 1 } } });
  render(<ExamAttempt data={data} api="/api" csrfToken="token" />);
  fireEvent.click(screen.getByLabelText('One'));
  await screen.findByText('Answer saved');
  fireEvent.click(screen.getByText('Next question'));
  expect(screen.getByLabelText('Three').checked).toBe(false);
  fireEvent.click(screen.getByText('Previous question'));
  expect(screen.getByLabelText('One').checked).toBe(true);
  expect(axios.put).toHaveBeenCalledWith('/api/student/attempts/a/responses/q1', { selectedOptionId: 'o1', expectedRevision: 0 }, expect.anything());
});
it('#40 reports failure and retries without claiming the answer was saved', async () => {
  axios.put.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { response: { questionId: 'q1', selectedOptionId: 'o2', revision: 1 } } });
  render(<ExamAttempt data={data} api="/api" csrfToken="token" />);
  fireEvent.click(screen.getByLabelText('Two'));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Two').checked).toBe(false);
  fireEvent.click(screen.getByText('Retry answer save'));
  await waitFor(() => expect(screen.getByLabelText('Two').checked).toBe(true));
});

it('#47 confirms submission only after saves finish and shows evaluation pending', async () => {
  let resolveSave;
  axios.put.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
  axios.post.mockResolvedValue({ data: { attempt: { status: 'Submitted', evaluationStatus: 'Pending' } } });
  render(<ExamAttempt data={data} api="/api" csrfToken="token" />);
  fireEvent.click(screen.getByLabelText('One'));
  expect(screen.getByText('Submit examination').disabled).toBe(true);
  resolveSave({ data: { response: { selectedOptionId: 'o1', revision: 1 } } });
  await screen.findByText('Answer saved');
  fireEvent.click(screen.getByText('Submit examination'));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByText('Confirm submission'));
  expect(await screen.findByText(/Evaluation pending/)).toBeTruthy();
  expect(screen.queryByRole('timer')).toBeNull();
  expect(screen.queryByLabelText('One')).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'Question navigation' })).toBeNull();
  expect(axios.post).toHaveBeenCalledWith('/api/student/attempts/a/submit', { reason: 'Manual' }, expect.anything());
});
it('#46 #47 expired content locks answers and requests timeout submission', async () => {
  axios.post.mockResolvedValue({ data: { attempt: { status: 'Submitted', evaluationStatus: 'Evaluated' } } });
  render(<ExamAttempt data={{ ...data, serverTime: '2099-01-02' }} api="/api" csrfToken="token" />);
  expect(screen.getByLabelText('One').matches(':disabled')).toBe(true);
  await screen.findByText('Exam submitted');
  expect(axios.post).toHaveBeenCalledWith('/api/student/attempts/a/submit', { reason: 'Timeout' }, expect.anything());
});

it('#47 restored submitted attempts have no countdown, questions or submission controls', () => {
  render(<ExamAttempt data={{ ...data, attempt: { ...data.attempt, status: 'Submitted', evaluationStatus: 'Evaluated' } }} api="/api" csrfToken="token" />);
  expect(screen.getByRole('heading', { name: 'Exam submitted' })).toBeTruthy();
  expect(screen.queryByRole('timer')).toBeNull();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByText('Submit examination')).toBeNull();
});
it('#47 failed submission retains the attempt and offers retry instead of claiming completion', async () => {
  axios.post.mockRejectedValue(new Error('offline'));
  render(<ExamAttempt data={data} api="/api" csrfToken="token" />);
  fireEvent.click(screen.getByText('Submit examination'));
  fireEvent.click(screen.getByText('Confirm submission'));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Exam submitted')).toBeNull();
  expect(screen.getByRole('timer')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('#47 stops countdown and polling after submission, ignoring an in-flight active response', async () => {
  vi.useFakeTimers();
  let resolveRead;
  axios.get.mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
  axios.post.mockResolvedValue({ data: { attempt: { status: 'Submitted', evaluationStatus: 'Evaluated' } } });
  render(<ExamAttempt data={data} api="/api" csrfToken="token" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(axios.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Submit examination'));
  await act(async () => { fireEvent.click(screen.getByText('Confirm submission')); });
  expect(screen.getByText('Exam submitted')).toBeTruthy();
  await act(async () => { resolveRead({ data }); await vi.advanceTimersByTimeAsync(30000); });
  expect(screen.queryByRole('timer')).toBeNull();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(axios.get).toHaveBeenCalledTimes(1);
});
