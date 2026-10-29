import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import App from './App'

vi.mock('axios', () => ({
  default: {
    defaults: {
      withCredentials: false,
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const instructor = {
  id: 'instructor-1',
  name: 'Test Instructor',
  email: 'instructor@test.com',
  role: 'Instructor',
  active: true,
}

const exam = (overrides = {}) => ({
  _id: 'exam-1',
  title: 'Algorithms Quiz',
  description: 'Practice',
  instructorId: 'instructor-1',
  status: 'Draft',
  duration: 30,
  startTime: '2026-10-24T12:00:00.000Z',
  questions: [],
  ...overrides,
})

const question = () => ({
  _id: 'question-1',
  questionText: '2 + 2?',
  marks: 1,
  options: [
    {
      _id: 'option-1',
      text: '4',
      isCorrect: true,
    },
    {
      _id: 'option-2',
      text: '5',
      isCorrect: false,
    },
  ],
})

function mockAuthenticatedInstructor(examList = []) {
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/auth/me')) {
      return Promise.resolve({
        data: {
          user: instructor,
        },
      })
    }

    if (url.endsWith('/auth/csrf-token')) {
      return Promise.resolve({
        data: {
          csrfToken: 'test-csrf-token',
        },
      })
    }

    if (url.endsWith('/exams/mine')) {
      return Promise.resolve({
        data: examList,
      })
    }

    return Promise.reject(
      new Error(`Unexpected GET request: ${url}`)
    )
  })
}

async function renderInstructor(examList = []) {
  mockAuthenticatedInstructor(examList)

  render(<App />)

  await screen.findByText('Test Instructor')
}

async function openExam(value = exam()) {
  mockAuthenticatedInstructor([value])

  axios.get.mockImplementation((url) => {
    if (url.endsWith('/auth/me')) {
      return Promise.resolve({
        data: {
          user: instructor,
        },
      })
    }

    if (url.endsWith('/auth/csrf-token')) {
      return Promise.resolve({
        data: {
          csrfToken: 'test-csrf-token',
        },
      })
    }

    if (url.endsWith('/exams/mine')) {
      return Promise.resolve({
        data: [value],
      })
    }

    if (url.endsWith(`/exams/${value._id}`)) {
      return Promise.resolve({
        data: value,
      })
    }

    return Promise.reject(
      new Error(`Unexpected GET request: ${url}`)
    )
  })

  render(<App />)

  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Open',
    })
  )

  await screen.findByRole('heading', {
    name: 'Manage Exam',
  })
}

beforeEach(() => {
  vi.resetAllMocks()

  vi.spyOn(window, 'alert').mockImplementation(
    () => {}
  )

  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('OEP-41 instructor result states', () => {
  it('shows loading, pending identities, persisted scores, empty state and API errors', async () => {
    await openExam(exam({ status: 'Published' }));
    let finish;
    axios.get.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Load student results' }));
    expect(screen.getByText('Loading results...')).toBeTruthy();
    finish({ data: { results: [{ _id: 'r', studentId: { name: 'Alice', email: 'alice@test.invalid' }, score: 2, maximum: 3, status: 'Evaluated' }],
      pending: [{ _id: 'a', studentId: { name: 'Bob', email: 'bob@test.invalid' }, submittedAt: new Date().toISOString() }] } });
    await screen.findByText('Alice');
    expect(screen.getByText('alice@test.invalid')).toBeTruthy();
    expect(screen.getByText('Score: 2 / 3')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Evaluation pending')).toBeTruthy();
    axios.get.mockResolvedValue({ data: { results: [], pending: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Load student results' }));
    await screen.findByText('No evaluated results yet.');
    expect(screen.getByText('No pending evaluations.')).toBeTruthy();
    axios.get.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Load student results' }));
    await screen.findByText('Could not load results');
    expect(screen.queryByText('Alice')).toBeNull();
  });

  it('clears old exam results on switching and ignores a late result response', async () => {
    const first = exam({ status: 'Published' }), second = exam({ _id: 'exam-2', title: 'Second quiz', status: 'Published', questions: [{ ...question(), questionText: 'Second exam question' }] });
    mockAuthenticatedInstructor([first, second]);
    const baseGet = axios.get.getMockImplementation();
    let finish;
    axios.get.mockImplementation(url => {
      if (url.endsWith('/results')) return new Promise(resolve => { finish = resolve; });
      if (url.endsWith('/exams/exam-1')) return Promise.resolve({ data: first });
      if (url.endsWith('/exams/exam-2')) return Promise.resolve({ data: second });
      return baseGet(url);
    });
    render(<App />);
    await screen.findByText('Test Instructor');
    fireEvent.click((await screen.findAllByRole('button', { name: 'Open' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Load student results' }));
    const stale = { data: { results: [{ _id: 'old', studentId: { name: 'Old student' }, score: 1, maximum: 3 }], pending: [] } };
    finish(stale);
    await screen.findByText('Old student');
    fireEvent.click(screen.getByRole('button', { name: 'Load student results' }));
    const lateResponse = finish;
    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[1]);
    await screen.findByText('1. Second exam question');
    lateResponse(stale);
    await waitFor(() => expect(screen.queryByText('Loading results...')).toBeNull());
    expect(screen.queryByText('Old student')).toBeNull();
  });
});

describe(
  'Authenticated Instructor exam management',
  () => {
    it('UI-AC35: removes the correct option without silently choosing another and supports adding replacements', async () => {
      await openExam(exam({ questions: [question()] }))
      fireEvent.click(screen.getByRole('button', { name: 'Edit Question' }))
      fireEvent.click(screen.getByRole('button', { name: 'Remove option 1' }))
      expect(screen.getAllByRole('radio').every(radio => !radio.checked)).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
      fireEvent.change(screen.getByPlaceholderText('Option 2'), { target: { value: 'Replacement' } })
      fireEvent.click(screen.getByRole('radio', { name: 'Correct option 2' }))
      axios.put.mockResolvedValue({ data: exam() })
      fireEvent.submit(screen.getByRole('button', { name: 'Save Question Changes' }).closest('form'))
      await waitFor(() => expect(axios.put).toHaveBeenCalled())
      expect(axios.put.mock.calls[0][1].options).toEqual([
        { text: '5', isCorrect: false }, { text: 'Replacement', isCorrect: true },
      ])
    })

    it('UI-AC33: editing the local start preserves the instant and explicitly identifies the timezone', async () => {
      await openExam()
      const input = document.querySelector('#edit-start')
      const instant = new Date(exam().startTime)
      expect(input.value).toContain(`${String(instant.getHours()).padStart(2, '0')}:${String(instant.getMinutes()).padStart(2, '0')}`)
      expect(screen.getByLabelText(/Start time.*optional.*—/, { selector: '#edit-start' })).toBe(input)
      axios.put.mockResolvedValue({ data: exam() })
      fireEvent.change(input, { target: { value: '2026-10-25T10:00' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save Exam Changes' }))
      await waitFor(() => expect(axios.put).toHaveBeenCalled())
      expect(axios.put.mock.calls[0][1].startTime).toBe(new Date('2026-10-25T10:00').toISOString())
    })

    it('UI-AC23: shows rejected login and completes a successful login/logout', async () => {
      axios.get.mockRejectedValue(new Error('No session'))
      render(<App />)
      fireEvent.change(await screen.findByPlaceholderText('Email'), { target: { value: instructor.email } })
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
      axios.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid email or password' } } })
      fireEvent.click(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByText('Invalid email or password')).toBeTruthy()
      mockAuthenticatedInstructor([])
      axios.post.mockResolvedValue({ data: { user: instructor } })
      fireEvent.click(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByText('Test Instructor')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
      expect(await screen.findByRole('button', { name: 'Login' })).toBeTruthy()
    })

    it('UI-EXAM-01: renders the empty list after loading', async () => {
      await renderInstructor([])

      expect(
        await screen.findByText(
          'No exams created yet.'
        )
      ).toBeTruthy()
    })

    it('UI-EXAM-02: displays a fetched exam and its status', async () => {
      await renderInstructor([exam()])

      expect(
        await screen.findByText('Algorithms Quiz')
      ).toBeTruthy()

      expect(
        screen.getByText('Draft')
      ).toBeTruthy()
    })

    it('UI-EXAM-03: submits exam form data with CSRF protection', async () => {
      await renderInstructor([])

      axios.post.mockResolvedValue({
        data: exam(),
      })

      fireEvent.change(
        screen.getByPlaceholderText('Exam title'),
        {
          target: {
            value: 'Algorithms Quiz',
          },
        }
      )

      const startTimeInput =
        document.querySelector(
          'input[type="datetime-local"]'
        )

      fireEvent.change(startTimeInput, {
        target: {
          value: '2026-10-24T12:00',
        },
      })

      fireEvent.submit(
        screen
          .getByRole('button', {
            name: 'Create Exam',
          })
          .closest('form')
      )

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/exams$/),
          expect.objectContaining({
            title: 'Algorithms Quiz',
            startTime: new Date('2026-10-24T12:00').toISOString(),
            duration: 30,
          }),
          {
            headers: {
              'X-CSRF-Token':
                'test-csrf-token',
            },
          }
        )
      )
    })

    it('UI-EXAM-04: displays the server validation error on a rejected create', async () => {
      await renderInstructor([])

      axios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Title is required',
          },
        },
      })

      fireEvent.submit(
        screen
          .getByRole('button', {
            name: 'Create Exam',
          })
          .closest('form')
      )

      expect(
        await screen.findByText(
          'Title is required'
        )
      ).toBeTruthy()
    })

    it('UI-EXAM-05: reports a failed exam list request', async () => {
      axios.get.mockImplementation((url) => {
        if (url.endsWith('/auth/me')) {
          return Promise.resolve({
            data: {
              user: instructor,
            },
          })
        }

        if (
          url.endsWith('/auth/csrf-token')
        ) {
          return Promise.resolve({
            data: {
              csrfToken: 'test-csrf-token',
            },
          })
        }

        if (url.endsWith('/exams/mine')) {
          return Promise.reject(
            new Error('Network unavailable')
          )
        }

        return Promise.reject(
          new Error(
            `Unexpected GET request: ${url}`
          )
        )
      })

      render(<App />)

      expect(
        await screen.findByText(
          'Could not load exams'
        )
      ).toBeTruthy()
    })

    it('UI-EXAM-06: cancels deletion without sending a destructive request', async () => {
      window.confirm.mockReturnValue(false)

      await renderInstructor([exam()])

      fireEvent.click(
        await screen.findByRole('button', {
          name: 'Delete',
        })
      )

      expect(
        window.confirm
      ).toHaveBeenCalledOnce()

      expect(
        axios.delete
      ).not.toHaveBeenCalled()
    })

    it('UI-EXAM-07: sends confirmed deletion with CSRF protection', async () => {
      await renderInstructor([exam()])

      axios.delete.mockResolvedValue({
        data: {},
      })

      fireEvent.click(
        await screen.findByRole('button', {
          name: 'Delete',
        })
      )

      await waitFor(() =>
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringMatching(
            /\/exam-1$/
          ),
          {
            headers: {
              'X-CSRF-Token':
                'test-csrf-token',
            },
          }
        )
      )
    })

    it('UI-MCQ-01: submits question text and options with one selected answer', async () => {
      await openExam()

      axios.post.mockResolvedValue({
        data: exam({
          questions: [question()],
        }),
      })

      fireEvent.change(
        screen.getByPlaceholderText('Question'),
        {
          target: {
            value: '2 + 2?',
          },
        }
      )

      for (
        let index = 1;
        index <= 4;
        index++
      ) {
        fireEvent.change(
          screen.getByPlaceholderText(
            `Option ${index}`
          ),
          {
            target: {
              value: String(index + 3),
            },
          }
        )
      }

      fireEvent.submit(
        screen
          .getByRole('button', {
            name: 'Add Question',
          })
          .closest('form')
      )

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalled()
      )

      const questionCall =
        axios.post.mock.calls.find(
          ([url]) =>
            url.endsWith(
              '/exam-1/questions'
            )
        )

      expect(questionCall).toBeDefined()

      const [, payload, config] =
        questionCall

      expect(payload.questionText).toBe(
        '2 + 2?'
      )

      expect(
        payload.options.filter(
          (option) => option.isCorrect
        )
      ).toHaveLength(1)

      expect(config).toEqual({
        headers: {
          'X-CSRF-Token':
            'test-csrf-token',
        },
      })
    })

    it('UI-MCQ-02: editing an existing question uses its own API identifier', async () => {
      await openExam(
        exam({
          questions: [question()],
        })
      )

      axios.put.mockResolvedValue({
        data: exam({
          questions: [
            {
              ...question(),
              questionText: '3 + 1?',
            },
          ],
        }),
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Edit Question',
        })
      )

      fireEvent.change(
        screen.getByPlaceholderText('Question'),
        {
          target: {
            value: '3 + 1?',
          },
        }
      )

      fireEvent.submit(
        screen
          .getByRole('button', {
            name: 'Save Question Changes',
          })
          .closest('form')
      )

      await waitFor(() =>
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringMatching(
            /\/exam-1\/questions\/question-1$/
          ),
          expect.objectContaining({
            questionText: '3 + 1?',
          }),
          {
            headers: {
              'X-CSRF-Token':
                'test-csrf-token',
            },
          }
        )
      )
    })

    it('UI-PUBLISH-01: confirmed publication updates the displayed status', async () => {
      await openExam(
        exam({
          questions: [question()],
        })
      )

      const published = exam({
        status: 'Published',
        questions: [question()],
      })

      axios.post.mockResolvedValue({
        data: published,
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Publish Exam',
        })
      )

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringMatching(
            /\/exam-1\/publish$/
          ),
          {},
          {
            headers: {
              'X-CSRF-Token':
                'test-csrf-token',
            },
          }
        )
      )

      await waitFor(() =>
        expect(
          screen.queryByRole('button', {
            name: 'Publish Exam',
          })
        ).toBeNull()
      )

      expect(
        screen.queryByRole('button', {
          name: 'Edit Question',
        })
      ).toBeNull()
    })

    it('UI-PUBLISH-02: published content has no edit or delete management actions', async () => {
      await openExam(
        exam({
          status: 'Published',
          questions: [question()],
        })
      )

      for (const name of [
        'Delete',
        'Delete Question',
        'Edit Question',
        'Save Exam Changes',
        'Publish Exam',
      ]) {
        expect(
          screen.queryByRole('button', {
            name,
          })
        ).toBeNull()
      }

      expect(
        screen.getByText('1. 2 + 2?')
      ).toBeTruthy()
    })
  }
)
