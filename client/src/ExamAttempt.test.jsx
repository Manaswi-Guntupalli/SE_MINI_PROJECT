import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ExamAttempt from './ExamAttempt';
vi.mock('axios', () => ({ default: { put: vi.fn(), post: vi.fn(), get: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
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
