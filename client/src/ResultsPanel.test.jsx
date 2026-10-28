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
  axios.get.mockResolvedValue({ data: [{ _id: 'result', studentId: 'student', examId: 'exam', score: 1, maximum: 2, status: 'Evaluated' }] });
  render(<ResultsPanel endpoint="/api/exams/exam/results" instructor />);
  expect(await screen.findByRole('table', { name: 'Results for this owned examination' })).toBeTruthy();
  expect(screen.getByText('1 / 2')).toBeTruthy();
  expect(screen.getByText('student')).toBeTruthy();
});
