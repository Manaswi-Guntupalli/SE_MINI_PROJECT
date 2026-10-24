import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import App from './App'

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const exam = (overrides = {}) => ({
  _id: 'exam-1', title: 'Algorithms Quiz', description: 'Practice',
  instructorId: 'instructor-a', status: 'Draft', duration: 30,
  startTime: '2026-10-24T12:00:00.000Z', questions: [], ...overrides,
})
const question = () => ({
  _id: 'question-1', questionText: '2 + 2?', marks: 1,
  options: [{ _id: 'option-1', text: '4', isCorrect: true }, { _id: 'option-2', text: '5', isCorrect: false }],
})
async function openExam(value = exam()) {
  axios.get.mockResolvedValueOnce({ data: [value] }).mockResolvedValueOnce({ data: value })
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Open' }))
  await screen.findByRole('heading', { name: 'Manage Exam' })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'alert').mockImplementation(() => {})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  axios.get.mockResolvedValue({ data: [] })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Instructor prototype component (HTTP calls mocked)', () => {
  it('UI-EXAM-01: renders the empty list after loading', async () => {
    render(<App />)
    await waitFor(() => expect(axios.get).toHaveBeenCalledOnce())
    expect(screen.getByText('No exams created yet.')).toBeTruthy()
  })

  it('UI-EXAM-02: displays a fetched exam and its status', async () => {
    axios.get.mockResolvedValue({ data: [exam()] })
    render(<App />)
    expect(await screen.findByText('Algorithms Quiz')).toBeTruthy()
    expect(screen.getByText('Draft')).toBeTruthy()
  })

  it('UI-EXAM-03: submits exam form data and refreshes the list', async () => {
    axios.post.mockResolvedValue({ data: exam() })
    render(<App />)
    await waitFor(() => expect(axios.get).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByPlaceholderText('Exam title'), { target: { value: 'Algorithms Quiz' } })
    fireEvent.change(document.querySelector('input[type="datetime-local"]'), { target: { value: '2026-10-24T12:00' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Create Exam' }).closest('form'))
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/exams$/),
      expect.objectContaining({ title: 'Algorithms Quiz', startTime: '2026-10-24T12:00', duration: 30 }),
    ))
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2))
  })

  it('UI-EXAM-04: displays the server validation error on a rejected create', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'Title is required' } } })
    render(<App />)
    await waitFor(() => expect(axios.get).toHaveBeenCalledOnce())
    fireEvent.submit(screen.getByRole('button', { name: 'Create Exam' }).closest('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Title is required'))
  })

  it('UI-EXAM-05: reports a failed list request', async () => {
    axios.get.mockRejectedValue(new Error('Network unavailable'))
    render(<App />)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Could not load exams'))
  })

  it('UI-EXAM-06: cancels deletion without sending a destructive request', async () => {
    window.confirm.mockReturnValue(false)
    axios.get.mockResolvedValue({ data: [exam()] })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalledOnce()
    expect(axios.delete).not.toHaveBeenCalled()
  })

  it('UI-EXAM-07: sends confirmed deletion and refreshes the list', async () => {
    axios.get.mockResolvedValueOnce({ data: [exam()] }).mockResolvedValueOnce({ data: [] })
    axios.delete.mockResolvedValue({ data: {} })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringMatching(/\/exam-1$/)))
    await screen.findByText('No exams created yet.')
  })

  it('UI-MCQ-01: submits question text/options with exactly one selected answer', async () => {
    await openExam()
    axios.post.mockResolvedValue({ data: exam({ questions: [question()] }) })
    fireEvent.change(screen.getByPlaceholderText('Question'), { target: { value: '2 + 2?' } })
    for (let index = 1; index <= 4; index++) {
      fireEvent.change(screen.getByPlaceholderText(`Option ${index}`), { target: { value: String(index + 3) } })
    }
    fireEvent.submit(screen.getByRole('button', { name: 'Add Question' }).closest('form'))
    await waitFor(() => expect(axios.post).toHaveBeenCalledOnce())
    const [url, payload] = axios.post.mock.calls[0]
    expect(url).toMatch(/\/exam-1\/questions$/)
    expect(payload.questionText).toBe('2 + 2?')
    expect(payload.options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(await screen.findByText('1. 2 + 2?')).toBeTruthy()
  })

  it('UI-MCQ-02: editing an existing question uses its own API identifier', async () => {
    await openExam(exam({ questions: [question()] }))
    axios.put.mockResolvedValue({ data: exam({ questions: [{ ...question(), questionText: '3 + 1?' }] }) })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Question' }))
    fireEvent.change(screen.getByPlaceholderText('Question'), { target: { value: '3 + 1?' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Save Question Changes' }).closest('form'))
    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      expect.stringMatching(/\/exam-1\/questions\/question-1$/),
      expect.objectContaining({ questionText: '3 + 1?' }),
    ))
  })

  it('UI-PUBLISH-01: confirmed publication updates the displayed status', async () => {
    await openExam(exam({ questions: [question()] }))
    const published = exam({ status: 'Published', questions: [question()] })
    axios.post.mockResolvedValue({ data: published })
    axios.get.mockResolvedValue({ data: [published] })
    fireEvent.click(screen.getByRole('button', { name: 'Publish Exam' }))
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/exam-1\/publish$/)))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Publish Exam' })).toBeNull())
    expect(screen.queryByRole('button', { name: 'Edit Question' })).toBeNull()
  })

  it('UI-PUBLISH-02: published content has no edit/delete management actions', async () => {
    await openExam(exam({ status: 'Published', questions: [question()] }))
    for (const name of ['Delete', 'Delete Question', 'Edit Question', 'Save Exam Changes', 'Publish Exam']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
    expect(screen.getByText('1. 2 + 2?')).toBeTruthy()
  })
})
