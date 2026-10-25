import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const BASE_API = "http://localhost:5000/api";
const EXAM_API = `${BASE_API}/exams`;
const AUTH_API = `${BASE_API}/auth`;

axios.defaults.withCredentials = true;

const emptyQuestionForm = {
  questionText: "",
  options: ["", "", "", ""],
  correctOption: 0,
  marks: 1,
};

function App() {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");

  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examError, setExamError] = useState("");

  const [examForm, setExamForm] = useState({
    title: "",
    description: "",
    startTime: "",
    duration: 30,
  });

  const [questionForm, setQuestionForm] =
    useState(emptyQuestionForm);

  const [editingQuestionId, setEditingQuestionId] =
    useState(null);

  const csrfHeaders = {
    "X-CSRF-Token": csrfToken,
  };

  const loadCsrfToken = async () => {
    const response = await axios.get(
      `${AUTH_API}/csrf-token`
    );

    setCsrfToken(response.data.csrfToken);

    return response.data.csrfToken;
  };

  const loadExams = async () => {
    try {
      setExamsLoading(true);
      setExamError("");

      const response = await axios.get(
        `${EXAM_API}/mine`
      );

      setExams(response.data);
    } catch (error) {
      setExamError(
        error.response?.data?.message ||
          "Could not load exams"
      );
    } finally {
      setExamsLoading(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await axios.get(
          `${AUTH_API}/me`
        );

        const currentUser = response.data.user;

        setUser(currentUser);

        await loadCsrfToken();

        if (currentUser.role === "Instructor") {
          await loadExams();
        }
      } catch {
        setUser(null);
        setCsrfToken("");
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (event) => {
    event.preventDefault();

    try {
      setLoginError("");

      const response = await axios.post(
        `${AUTH_API}/login`,
        loginForm
      );

      const loggedInUser = response.data.user;

      setUser(loggedInUser);

      await loadCsrfToken();

      if (loggedInUser.role === "Instructor") {
        await loadExams();
      }

      setLoginForm({
        email: "",
        password: "",
      });
    } catch (error) {
      setLoginError(
        error.response?.data?.message ||
          "Login failed"
      );
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${AUTH_API}/logout`,
        {},
        {
          headers: csrfHeaders,
        }
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Could not log out"
      );
      return;
    }

    setUser(null);
    setCsrfToken("");
    setExams([]);
    setSelectedExam(null);
  };

  const createExam = async (event) => {
    event.preventDefault();

    try {
      setExamError("");

      await axios.post(
        EXAM_API,
        {
          title: examForm.title,
          description: examForm.description,
          startTime: examForm.startTime || null,
          duration: Number(examForm.duration),
        },
        {
          headers: csrfHeaders,
        }
      );

      setExamForm({
        title: "",
        description: "",
        startTime: "",
        duration: 30,
      });

      await loadExams();

      alert("Exam created successfully");
    } catch (error) {
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not create exam";

      setExamError(message);
    }
  };

  const selectExam = async (id) => {
    try {
      setExamError("");

      const response = await axios.get(
        `${EXAM_API}/${id}`
      );

      setSelectedExam(response.data);
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestionForm);
    } catch (error) {
      setExamError(
        error.response?.data?.message ||
          "Could not open exam"
      );
    }
  };

  const updateExam = async () => {
    try {
      setExamError("");

      const response = await axios.put(
        `${EXAM_API}/${selectedExam._id}`,
        {
          title: selectedExam.title,
          description: selectedExam.description,
          startTime: selectedExam.startTime || null,
          duration: Number(selectedExam.duration),
        },
        {
          headers: csrfHeaders,
        }
      );

      setSelectedExam(response.data);
      await loadExams();

      alert("Draft updated successfully");
    } catch (error) {
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not update exam";

      setExamError(message);
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm("Delete this draft exam?")) {
      return;
    }

    try {
      setExamError("");

      await axios.delete(
        `${EXAM_API}/${id}`,
        {
          headers: csrfHeaders,
        }
      );

      if (selectedExam?._id === id) {
        setSelectedExam(null);
      }

      await loadExams();

      alert("Exam deleted successfully");
    } catch (error) {
      setExamError(
        error.response?.data?.message ||
          "Could not delete exam"
      );
    }
  };

  const getQuestionPayload = () => {
    const options = questionForm.options.map(
      (text, index) => ({
        text,
        isCorrect:
          index ===
          Number(questionForm.correctOption),
      })
    );

    return {
      questionText: questionForm.questionText,
      options,
      marks: Number(questionForm.marks),
    };
  };

  const saveQuestion = async (event) => {
    event.preventDefault();

    try {
      setExamError("");

      let response;

      if (editingQuestionId) {
        response = await axios.put(
          `${EXAM_API}/${selectedExam._id}/questions/${editingQuestionId}`,
          getQuestionPayload(),
          {
            headers: csrfHeaders,
          }
        );

        alert("Question updated successfully");
      } else {
        response = await axios.post(
          `${EXAM_API}/${selectedExam._id}/questions`,
          getQuestionPayload(),
          {
            headers: csrfHeaders,
          }
        );

        alert("Question added successfully");
      }

      setSelectedExam(response.data);
      setQuestionForm(emptyQuestionForm);
      setEditingQuestionId(null);
    } catch (error) {
      setExamError(
        error.response?.data?.message ||
          "Could not save question"
      );
    }
  };

  const startEditingQuestion = (question) => {
    const correctIndex = question.options.findIndex(
      (option) => option.isCorrect
    );

    setQuestionForm({
      questionText: question.questionText,
      options: question.options.map(
        (option) => option.text
      ),
      correctOption:
        correctIndex >= 0 ? correctIndex : 0,
      marks: question.marks,
    });

    setEditingQuestionId(question._id);
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
  };

  const deleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) {
      return;
    }

    try {
      setExamError("");

      const response = await axios.delete(
        `${EXAM_API}/${selectedExam._id}/questions/${questionId}`,
        {
          headers: csrfHeaders,
        }
      );

      setSelectedExam(response.data);

      if (editingQuestionId === questionId) {
        cancelEditingQuestion();
      }

      alert("Question deleted successfully");
    } catch (error) {
      setExamError(
        error.response?.data?.message ||
          "Could not delete question"
      );
    }
  };

  const publishExam = async () => {
    if (
      !window.confirm(
        "Publish this exam? It cannot be edited afterwards."
      )
    ) {
      return;
    }

    try {
      setExamError("");

      const response = await axios.post(
        `${EXAM_API}/${selectedExam._id}/publish`,
        {},
        {
          headers: csrfHeaders,
        }
      );

      setSelectedExam(response.data);
      await loadExams();

      alert("Exam published successfully");
    } catch (error) {
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not publish exam";

      setExamError(message);
      alert(message);
    }
  };

  if (authLoading) {
    return (
      <div className="container">
        <h1>Online Exam Portal</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Online Exam Portal</h1>
        <p className="subtitle">Login</p>

        <section>
          <h2>Sign In</h2>

          <form onSubmit={login}>
            <label>Email</label>
            <input
              type="email"
              required
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({
                  ...loginForm,
                  email: e.target.value,
                })
              }
            />

            <label>Password</label>
            <input
              type="password"
              required
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({
                  ...loginForm,
                  password: e.target.value,
                })
              }
            />

            {loginError && (
              <p className="error">
                {loginError}
              </p>
            )}

            <button type="submit">
              Login
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (user.role !== "Instructor") {
    return (
      <div className="container">
        <h1>Online Exam Portal</h1>

        <section>
          <h2>Welcome, {user.name}</h2>
          <p>
            Signed in as <strong>{user.role}</strong>.
          </p>
          <p>
            Instructor exam management is not
            available for this role.
          </p>

          <button onClick={logout}>
            Logout
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Online Exam Portal</h1>

      <p className="subtitle">
        Instructor - Exam & Question Management
      </p>

      <section>
        <p>
          Signed in as <strong>{user.name}</strong>{" "}
          ({user.email})
        </p>

        <button onClick={logout}>
          Logout
        </button>
      </section>

      <section>
        <h2>Create Exam</h2>

        <form onSubmit={createExam}>
          <input
            required
            placeholder="Exam title"
            value={examForm.title}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                title: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Description"
            value={examForm.description}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                description: e.target.value,
              })
            }
          />

          <label>Start time (optional)</label>

          <input
            type="datetime-local"
            value={examForm.startTime}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                startTime: e.target.value,
              })
            }
          />

          <label>Duration (minutes)</label>

          <input
            required
            type="number"
            min="1"
            value={examForm.duration}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                duration: e.target.value,
              })
            }
          />

          <button type="submit">
            Create Exam
          </button>
        </form>
      </section>

      <section>
        <h2>My Exams</h2>

        {examsLoading && <p>Loading exams...</p>}

        {examError && (
          <p className="error">
            {examError}
          </p>
        )}

        {!examsLoading &&
          exams.length === 0 && (
            <p>No exams created yet.</p>
          )}

        {exams.map((exam) => (
          <div
            className="exam-card"
            key={exam._id}
          >
            <div>
              <strong>{exam.title}</strong>{" "}
              <span className="status">
                {exam.status}
              </span>

              <p>
                Duration: {exam.duration} minutes
              </p>

              <p>
                Start:{" "}
                {exam.startTime
                  ? new Date(
                      exam.startTime
                    ).toLocaleString()
                  : "Not set"}
              </p>
            </div>

            <div className="actions">
              <button
                onClick={() =>
                  selectExam(exam._id)
                }
              >
                Open
              </button>

              {exam.status === "Draft" && (
                <button
                  className="danger"
                  onClick={() =>
                    deleteExam(exam._id)
                  }
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {selectedExam && (
        <section>
          <h2>Manage Exam</h2>

          <p>
            Status:{" "}
            <strong>
              {selectedExam.status}
            </strong>
          </p>
          {examError && (
            <p className="error">
              {examError}
            </p>
          )}

          {selectedExam.status === "Draft" && (
            <>
              <input
                value={selectedExam.title}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    title: e.target.value,
                  })
                }
              />

              <textarea
                value={
                  selectedExam.description || ""
                }
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    description: e.target.value,
                  })
                }
              />

              <label>Start time (optional)</label>

              <input
                type="datetime-local"
                value={
                  selectedExam.startTime
                    ? selectedExam.startTime.slice(
                        0,
                        16
                      )
                    : ""
                }
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    startTime: e.target.value,
                  })
                }
              />

              <label>Duration (minutes)</label>

              <input
                type="number"
                min="1"
                value={selectedExam.duration}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    duration: e.target.value,
                  })
                }
              />

              <button onClick={updateExam}>
                Save Exam Changes
              </button>

              <hr />

              <h3>
                {editingQuestionId
                  ? "Edit MCQ"
                  : "Add MCQ"}
              </h3>

              <form onSubmit={saveQuestion}>
                <input
                  placeholder="Question"
                  value={
                    questionForm.questionText
                  }
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      questionText:
                        e.target.value,
                    })
                  }
                />

                {questionForm.options.map(
                  (option, index) => (
                    <div
                      className="option-row"
                      key={index}
                    >
                      <input
                        type="radio"
                        name="correctOption"
                        checked={
                          Number(
                            questionForm.correctOption
                          ) === index
                        }
                        onChange={() =>
                          setQuestionForm({
                            ...questionForm,
                            correctOption: index,
                          })
                        }
                      />

                      <input
                        placeholder={`Option ${
                          index + 1
                        }`}
                        value={option}
                        onChange={(e) => {
                          const options = [
                            ...questionForm.options,
                          ];

                          options[index] =
                            e.target.value;

                          setQuestionForm({
                            ...questionForm,
                            options,
                          });
                        }}
                      />
                    </div>
                  )
                )}

                <label>Marks</label>

                <input
                  type="number"
                  min="1"
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      marks: e.target.value,
                    })
                  }
                />

                <button type="submit">
                  {editingQuestionId
                    ? "Save Question Changes"
                    : "Add Question"}
                </button>

                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={
                      cancelEditingQuestion
                    }
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </>
          )}

          <h3>Questions</h3>

          {selectedExam.questions.length ===
            0 && (
            <p>No questions added yet.</p>
          )}

          {selectedExam.questions.map(
            (question, index) => (
              <div
                className="question-card"
                key={question._id}
              >
                <strong>
                  {index + 1}.{" "}
                  {question.questionText ||
                    "(Incomplete question)"}
                </strong>

                <ul>
                  {question.options.map(
                    (option) => (
                      <li key={option._id}>
                        {option.text ||
                          "(Blank option)"}
                        {option.isCorrect
                          ? " ✓"
                          : ""}
                      </li>
                    )
                  )}
                </ul>

                <p>
                  Marks: {question.marks}
                </p>

                {selectedExam.status ===
                  "Draft" && (
                  <div className="actions">
                    <button
                      onClick={() =>
                        startEditingQuestion(
                          question
                        )
                      }
                    >
                      Edit Question
                    </button>

                    <button
                      className="danger"
                      onClick={() =>
                        deleteQuestion(
                          question._id
                        )
                      }
                    >
                      Delete Question
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {selectedExam.status ===
            "Draft" && (
            <button
              className="publish"
              onClick={publishExam}
            >
              Publish Exam
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default App;