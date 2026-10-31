import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import ResultsPanel from './ResultsPanel';
vi.mock('axios', () => ({ default: { get: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('#65 results recover from API failure and show an explicit empty state', async () => {
  axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
  render(<ResultsPanel endpoint="/api/student/results" />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByText('Refresh results'));
  expect(await screen.findByText('No evaluated results yet.')).toBeTruthy();
});
it('#65 uses real score fields and a captioned result table', async () => {
  axios.get.mockResolvedValue({ data: [{ _id: 'result', studentId: 'student', student: { name: 'Example Student', email: 'student@example.test' }, examId: 'exam', score: 1, maximum: 2, status: 'Evaluated' }] });
  render(<ResultsPanel endpoint="/api/exams/exam/results" instructor />);
  expect(await screen.findByRole('table', { name: 'Results for this owned examination' })).toBeTruthy();
  expect(screen.getByText('1 / 2')).toBeTruthy();
  expect(screen.getByText('Example Student')).toBeTruthy();
  expect(screen.getByText('student@example.test')).toBeTruthy();
  expect(screen.queryByText('student')).toBeNull();
});

it('shows a clear fallback for a missing student without exposing the raw identifier', async () => {
  axios.get.mockResolvedValue({ data: [{ _id: 'r', studentId: 'internal-user-id', student: null, score: 4, maximum: 5, status: 'Evaluated' }] });
  render(<ResultsPanel endpoint="/api/exams/exam/results" instructor />);
  expect(await screen.findByText('Student unavailable')).toBeTruthy();
  expect(screen.queryByText('internal-user-id')).toBeNull();
  expect(screen.getByText('4 / 5')).toBeTruthy();
});

it('OEP-41 preserves populated student identities, pending evaluation and safe API errors', async () => {
  axios.get.mockResolvedValueOnce({ data: {
    results: [{ _id: 'r', studentId: { name: 'Evaluated Student', email: 'evaluated@test.invalid' }, score: 1, maximum: 2, status: 'Evaluated' }],
    pending: [{ _id: 'p', studentId: { name: 'Pending Student', email: 'pending@test.invalid' } }],
  } });
  render(<ResultsPanel endpoint="/api/exams/exam/results" instructor />);
  expect(await screen.findByText('Evaluated Student')).toBeTruthy();
  expect(screen.getByText('pending@test.invalid')).toBeTruthy();
  expect(screen.getByText(/Your submitted answers are saved/)).toBeTruthy();
  axios.get.mockRejectedValueOnce({ response: { data: { message: 'Could not load examination results' } } });
  fireEvent.click(screen.getByText('Refresh results'));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not load examination results');
  expect(screen.queryByRole('table')).toBeNull();
});

it('OEP-41 ignores a stale in-flight result when changing examinations', async () => {
  let resolveOld;
  axios.get.mockImplementation(url => url.includes('/old/') ? new Promise(resolve => { resolveOld = resolve; })
    : Promise.resolve({ data: { results: [], pending: [] } }));
  const { rerender } = render(<ResultsPanel endpoint="/api/exams/old/results" instructor />);
  rerender(<ResultsPanel endpoint="/api/exams/new/results" instructor />);
  await screen.findByText('No evaluated results yet.');
  resolveOld({ data: { results: [{ _id: 'old', studentId: { name: 'Stale student' }, score: 9, maximum: 9 }], pending: [] } });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.queryByText('Stale student')).toBeNull();
});

it('OEP-40 preserves student titles and durable pending evaluations', async () => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('pending-results')
    ? [{ _id: 'p', examTitle: 'Pending examination' }]
    : [{ _id: 'r', examTitle: 'Scored examination', score: 1, maximum: 3, status: 'Evaluated' }] }));
  render(<ResultsPanel endpoint="/api/student/results" pendingEndpoint="/api/student/pending-results" />);
  expect(await screen.findByText('Scored examination')).toBeTruthy();
  expect(screen.getByText('Pending examination')).toBeTruthy();
  expect(screen.getByText('1 / 3')).toBeTruthy();
});
