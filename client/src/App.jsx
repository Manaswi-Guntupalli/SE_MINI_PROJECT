import { Button, Input, Textarea, Panel, Feedback, Loading, AppShell, ConfirmDialog, StatusBadge } from './ui';
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";
import { browserTimeZone, toLocalInput, toUtc, displayTime } from './dateTime';
import RoleDashboard from './RoleDashboard';
import ResultsPanel from './ResultsPanel';

const BASE_API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
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
  const sessionGeneration = useRef(0);
  const examListRequest = useRef(0);
  const currentSession = useCallback(generation => generation === sessionGeneration.current, []);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [notice, setNotice] = useState('');
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
  const [workspaceTab, setWorkspaceTab] = useState('my-exams');
  const [creatingExam, setCreatingExam] = useState(false);
  const [examTab, setExamTab] = useState('details');
  const [openingExam, setOpeningExam] = useState(false);
  const examHeading = useRef(null);
  const listHeading = useRef(null);
  const wasExamOpen = useRef(false);
  const selectedExamId = selectedExam?._id;
  useEffect(() => {
    const heading = selectedExamId ? examHeading.current : wasExamOpen.current ? listHeading.current : null;
    heading?.focus();
    heading?.scrollIntoView?.({ block: 'start' });
    wasExamOpen.current = !!selectedExamId;
  }, [selectedExamId]);
  function backToExams() {
    setWorkspaceTab('my-exams');
    setSelectedExam(null);
    setExamError('');
    setNotice('');
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
    setExamTab('details');
  }
  function navigateTabs(event) {
    const tabs = ['details', 'questions', 'results'];
    const position = tabs.indexOf(examTab);
    const next = event.key === 'ArrowRight' ? (position + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (position + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setNotice(''); setExamError('');
    setExamTab(tabs[next]);
    document.getElementById(`exam-tab-${tabs[next]}`)?.focus();
  }
  const [examsLoading, setExamsLoading] = useState(false);
  const [examListNeedsRefresh, setExamListNeedsRefresh] = useState(false);
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

  function resetWorkspace() {
    sessionGeneration.current++;
    examListRequest.current++;
    setNotice('');
    setExamError('');
    setLoginError('');
    setConfirmation(null);
    setConfirmBusy(false);
    setExams([]);
    setSelectedExam(null);
    setWorkspaceTab('my-exams');
    setExamTab('details');
    setCreatingExam(false);
    setOpeningExam(false);
    setExamsLoading(false);
    setExamListNeedsRefresh(false);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
    setExamForm({ title: '', description: '', startTime: '', duration: 30 });
    wasExamOpen.current = false;
    // Anchors belong to the previous workspace, not the next signed-in account.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const csrfHeaders = {
    "X-CSRF-Token": csrfToken,
  };

  const loadCsrfToken = useCallback(async (generation = sessionGeneration.current) => {
    const response = await axios.get(
      `${AUTH_API}/csrf-token`
    );

    if (!currentSession(generation)) return;
    setCsrfToken(response.data.csrfToken);

    return response.data.csrfToken;
  }, [currentSession]);

  const loadExams = useCallback(async (generation = sessionGeneration.current) => {
    if (!currentSession(generation)) return;
    const request = ++examListRequest.current;
    const current = () => currentSession(generation) && request === examListRequest.current;
    try {
      setExamsLoading(true);
      setExamListNeedsRefresh(false);
      setExamError("");
      setNotice('');

      const response = await axios.get(
        `${EXAM_API}/mine`
      );

      if (!current()) return;
      setExams(response.data);
      return true;
    } catch (error) {
      if (!current()) return;
      setExamListNeedsRefresh(true);
      setExamError(
        error.response?.data?.message ||
          "Could not load exams"
      );
      return false;
    } finally {
      if (current()) setExamsLoading(false);
    }
  }, [currentSession]);

  async function refreshExamsAfterSave(message, generation) {
    const loaded = await loadExams(generation);
    if (!currentSession(generation)) return;
    if (loaded === true) setNotice(message);
    else if (loaded === false) setExamError(`${message} The exam list could not refresh. Refresh exams to see the saved change.`);
  }

  useEffect(() => {
    const restoreSession = async () => {
      const generation = sessionGeneration.current;
      try {
        const response = await axios.get(
          `${AUTH_API}/me`
        );

        if (!currentSession(generation)) return;
        const currentUser = response.data.user;

        setUser(currentUser);

        await loadCsrfToken(generation);
        if (!currentSession(generation)) return;

        if (currentUser.role === "Instructor") {
          await loadExams(generation);
        }
      } catch {
        if (!currentSession(generation)) return;
        setUser(null);
        setCsrfToken("");
      } finally {
        if (currentSession(generation)) setAuthLoading(false);
      }
    };

    restoreSession();
    const sessions = sessionGeneration, requests = examListRequest;
    return () => { sessions.current++; requests.current++; };
  }, [currentSession, loadCsrfToken, loadExams]);

  const login = async (event) => {
    event.preventDefault();
    resetWorkspace();
    const generation = sessionGeneration.current;
    setAuthLoading(true);

    try {
      setLoginError("");

      const response = await axios.post(
        `${AUTH_API}/login`,
        loginForm
      );

      if (!currentSession(generation)) return;
      const loggedInUser = response.data.user;

      setUser(loggedInUser);

      await loadCsrfToken(generation);
      if (!currentSession(generation)) return;

      if (loggedInUser.role === "Instructor") {
        await loadExams(generation);
      }

      if (!currentSession(generation)) return;
      setLoginForm({
        email: "",
        password: "",
      });
    } catch (error) {
      if (!currentSession(generation)) return;
      setUser(null);
      setCsrfToken('');
      setLoginError(
        error.response?.data?.message ||
          "Login failed"
      );
    } finally {
      if (currentSession(generation)) setAuthLoading(false);
    }
  };

  const logout = async () => {
    // Invalidate callbacks immediately, even while the logout request is pending.
    const generation = ++sessionGeneration.current;
    examListRequest.current++;
    try {
      await axios.post(`${AUTH_API}/logout`, {}, { headers: csrfHeaders });
    } catch (error) {
      if (currentSession(generation)) {
        setOpeningExam(false); setCreatingExam(false); setConfirmBusy(false); setExamsLoading(false);
      }
      throw error;
    }
    if (!currentSession(generation)) return;
    setUser(null);
    setCsrfToken("");
    resetWorkspace();
  };

  const createExam = async (event) => {
    const generation = sessionGeneration.current;
    event.preventDefault();
    if (creatingExam) return;
    setCreatingExam(true);
    setNotice('');

    try {
      setExamError("");

      await axios.post(
        EXAM_API,
        {
          title: examForm.title,
          description: examForm.description,
          startTime: toUtc(examForm.startTime),
          duration: Number(examForm.duration),
        },
        {
          headers: csrfHeaders,
        }
      );
      if (!currentSession(generation)) return;
      setExamForm({
        title: "",
        description: "",
        startTime: "",
        duration: 30,
      });

      await refreshExamsAfterSave("Exam created successfully", generation);
      if (!currentSession(generation)) return;
      setWorkspaceTab('my-exams');
      requestAnimationFrame(() => { if (currentSession(generation)) listHeading.current?.focus(); });
    } catch (error) {
      if (!currentSession(generation)) return;
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not create exam";

      setExamError(message);
    } finally { if (currentSession(generation)) setCreatingExam(false); }
  };

  const selectExam = async (id) => {
    const generation = sessionGeneration.current;
    setOpeningExam(true);
    try {
      setExamError("");
      setNotice('');

      const response = await axios.get(
        `${EXAM_API}/${id}`
      );

      if (!currentSession(generation)) return;
      setSelectedExam(response.data);
      setExamTab('details');
      setEditingQuestionId(null);
      setQuestionForm(emptyQuestionForm);
    } catch (error) {
      if (!currentSession(generation)) return;
      setExamError(
        error.response?.data?.message ||
          "Could not open exam"
      );
    } finally { if (currentSession(generation)) setOpeningExam(false); }
  };

  const updateExam = async () => {
    const generation = sessionGeneration.current;
    setNotice('');
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

      if (!currentSession(generation)) return;
      setSelectedExam(response.data);
      await refreshExamsAfterSave("Draft updated successfully", generation);
    } catch (error) {
      if (!currentSession(generation)) return;
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not update exam";

      setExamError(message);
    }
  };

  const deleteExam = async (id) => {
    const generation = sessionGeneration.current;
    setNotice('');
    try {
      setExamError("");

      await axios.delete(
        `${EXAM_API}/${id}`,
        {
          headers: csrfHeaders,
        }
      );

      if (!currentSession(generation)) return;
      if (selectedExam?._id === id) {
        setSelectedExam(null);
      }

      await refreshExamsAfterSave("Exam deleted successfully", generation);
    } catch (error) {
      if (!currentSession(generation)) return;
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
          (questionForm.correctOption === null ? -1 : Number(questionForm.correctOption)),
      })
    );

    return {
      questionText: questionForm.questionText,
      options,
      marks: Number(questionForm.marks),
    };
  };

  const saveQuestion = async (event) => {
    const generation = sessionGeneration.current;
    event.preventDefault();
    setNotice('');

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

        if (!currentSession(generation)) return;
        setNotice("Question updated successfully");
      } else {
        response = await axios.post(
          `${EXAM_API}/${selectedExam._id}/questions`,
          getQuestionPayload(),
          {
            headers: csrfHeaders,
          }
        );

        if (!currentSession(generation)) return;
        setNotice("Question added successfully");
      }

      setSelectedExam(response.data);
      setQuestionForm(emptyQuestionForm);
      setEditingQuestionId(null);
    } catch (error) {
      if (!currentSession(generation)) return;
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
        correctIndex >= 0 ? correctIndex : null,
      marks: question.marks,
    });

    setEditingQuestionId(question._id);
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
  };

  const deleteQuestion = async (questionId) => {
    const generation = sessionGeneration.current;
    setNotice('');
    try {
      setExamError("");

      const response = await axios.delete(
        `${EXAM_API}/${selectedExam._id}/questions/${questionId}`,
        {
          headers: csrfHeaders,
        }
      );

      if (!currentSession(generation)) return;
      setSelectedExam(response.data);

      if (editingQuestionId === questionId) {
        cancelEditingQuestion();
      }

      setNotice("Question deleted successfully");
    } catch (error) {
      if (!currentSession(generation)) return;
      setExamError(
        error.response?.data?.message ||
          "Could not delete question"
      );
    }
  };

  const publishExam = async () => {
    const generation = sessionGeneration.current;
    setNotice('');
    try {
      setExamError("");

      const response = await axios.post(
        `${EXAM_API}/${selectedExam._id}/publish`,
        {},
        {
          headers: csrfHeaders,
        }
      );

      if (!currentSession(generation)) return;
      setSelectedExam(response.data);
      await refreshExamsAfterSave("Exam published successfully", generation);
    } catch (error) {
      if (!currentSession(generation)) return;
      const message =
        error.response?.data?.errors?.join("\n") ||
        error.response?.data?.message ||
        "Could not publish exam";

      setExamError(message);
    }
  };

  if (authLoading) {
    return (
      <AppShell><Loading /></AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Panel>
          <h2>Sign In</h2>

          <form onSubmit={login}>
            <label htmlFor="login-email">Email</label>
            <Input
              type="email"
              id="login-email" autoComplete="username"
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

            <label htmlFor="login-password">Password</label>
            <Input
              type="password"
              id="login-password" autoComplete="current-password"
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

            <Feedback error>{loginError}</Feedback>

            <Button type="submit">
              Login
            </Button>
          </form>
        </Panel>
      </AppShell>
    );
  }

  if (user.role !== "Instructor") {
    return <RoleDashboard key={user.id} user={user} logout={logout} api={BASE_API} csrfToken={csrfToken} />;
  }

  return (
    <AppShell user={user} logout={logout}
      navigationLinks={selectedExam ? [['my-exams', 'My exams']] : undefined}
      activeTab={selectedExam ? undefined : workspaceTab}
      onNavigate={selectedExam ? backToExams : tab => { setNotice(''); setExamError(''); setWorkspaceTab(tab); }}>
      <Feedback onDismiss={() => setNotice('')}>{notice}</Feedback>
      <Feedback error onDismiss={() => setExamError('')}>{examError}</Feedback>
      {examListNeedsRefresh && <Button onClick={() => loadExams()}>Refresh exams</Button>}
      {openingExam && <Loading>Opening examination...</Loading>}
      {confirmation && <ConfirmDialog title={confirmation.title} busy={confirmBusy} cancelLabel="Cancel" confirmLabel={confirmation.label || 'Delete'}
        onCancel={() => setConfirmation(null)} onConfirm={async () => {
          const generation = sessionGeneration.current;
          setConfirmBusy(true);
          try { await confirmation.action(); if (currentSession(generation)) setConfirmation(null); }
          finally { if (currentSession(generation)) setConfirmBusy(false); }
        }}>
        <p>{confirmation.message || 'This removes the selected draft content. Published examinations remain protected.'}</p>
      </ConfirmDialog>}
      {!selectedExam && <>
      <Panel id="create-exam" role="tabpanel" aria-labelledby="workspace-tab-create-exam" tabIndex={0} hidden={workspaceTab !== 'create-exam'}>
        <h2>Create Exam</h2>

        <form onSubmit={createExam}>
          <Input
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

          <Textarea
            placeholder="Description"
            value={examForm.description}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                description: e.target.value,
              })
            }
          />

          <label htmlFor="create-start">Start time (optional) — {browserTimeZone}</label>

          <Input
            type="datetime-local"
            id="create-start"
            value={examForm.startTime}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                startTime: e.target.value,
              })
            }
          />

          <label htmlFor="create-duration">Duration (minutes)</label>

          <Input
            required
            type="number"
            id="create-duration"
            min="0"
            step="any"
            value={examForm.duration}
            onChange={(e) =>
              setExamForm({
                ...examForm,
                duration: e.target.value,
              })
            }
          />

          <Button type="submit" disabled={creatingExam}>
            {creatingExam ? 'Creating exam...' : 'Create Exam'}
          </Button>
        </form>
      </Panel>

      <Panel id="my-exams" role="tabpanel" aria-labelledby="workspace-tab-my-exams" tabIndex={0} hidden={workspaceTab !== 'my-exams'}>
        <h2 ref={listHeading} tabIndex={-1}>My Exams</h2>

        {examsLoading && <Loading>Loading exams...</Loading>}

        {!examsLoading &&
          !examListNeedsRefresh &&
          !examError &&
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
              <StatusBadge>{exam.status}</StatusBadge>

              <p>
                Duration: {exam.duration} minutes
              </p>

              <p>
                Start:{" "}
                {displayTime(exam.startTime)} ({browserTimeZone})
              </p>
            </div>

            <div className="actions">
              <Button
                disabled={openingExam}
                onClick={() =>
                  selectExam(exam._id)
                }
              >
                Open
              </Button>

              {exam.status === "Draft" && (
                <Button
                  className="danger"
                  onClick={() =>
                    setConfirmation({ title: 'Delete draft exam?', action: () => deleteExam(exam._id) })
                  }
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </Panel>

      </>}

      {selectedExam && (
        <Panel aria-label="Manage examination">
          <Button className="secondary" onClick={backToExams}>Back to My Exams</Button>
          <div className="exam-view-heading">
            <div><h2 id="manage-exam" ref={examHeading} tabIndex={-1}>Manage Exam</h2><p>{selectedExam.title}</p></div>
            <StatusBadge>{selectedExam.status}</StatusBadge>
          </div>
          <div role="tablist" aria-label="Examination sections" className="exam-tabs">
            {['details', 'questions', 'results'].map(tab => <Button key={tab} id={`exam-tab-${tab}`}
              role="tab" aria-selected={examTab === tab} aria-controls={`exam-panel-${tab}`}
              tabIndex={examTab === tab ? 0 : -1} onClick={() => { setNotice(''); setExamError(''); setExamTab(tab); }} onKeyDown={navigateTabs}>
              {tab === 'details' ? 'Details' : tab === 'questions' ? 'Questions' : 'Results'}
            </Button>)}
          </div>
          <div role="tabpanel" tabIndex={0} id="exam-panel-details" aria-labelledby="exam-tab-details" hidden={examTab !== 'details'} className="exam-tab-panel">
            {selectedExam.status === 'Draft' ? <div className="exam-details-form">
              <Input
                aria-label="Edit exam title"
                value={selectedExam.title}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    title: e.target.value,
                  })
                }
              />

              <Textarea
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

              <label htmlFor="edit-start">Start time (optional) — {browserTimeZone}</label>

              <Input
                type="datetime-local"
                id="edit-start"
                value={toLocalInput(selectedExam.startTime)}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    startTime: toUtc(e.target.value),
                  })
                }
              />

              <label htmlFor="edit-duration">Duration (minutes)</label>

              <Input
                type="number"
                id="edit-duration"
                min="0"
                step="any"
                value={selectedExam.duration}
                onChange={(e) =>
                  setSelectedExam({
                    ...selectedExam,
                    duration: e.target.value,
                  })
                }
              />

              <Button onClick={updateExam}>
                Save Exam Changes
              </Button>

            </div> : <dl className="exam-details-summary">
              <dt>Title</dt><dd>{selectedExam.title}</dd>
              <dt>Description</dt><dd>{selectedExam.description || 'No description provided.'}</dd>
              <dt>Start time</dt><dd>{displayTime(selectedExam.startTime)} ({browserTimeZone})</dd>
              <dt>Duration</dt><dd>{selectedExam.duration} minutes</dd>
            </dl>}
          </div>
          <div role="tabpanel" tabIndex={0} id="exam-panel-questions" aria-labelledby="exam-tab-questions" hidden={examTab !== 'questions'} className="exam-tab-panel">
            {selectedExam.status === 'Draft' && <>
              <h3>
                {editingQuestionId
                  ? "Edit MCQ"
                  : "Add MCQ"}
              </h3>

              <form onSubmit={saveQuestion}>
                <Input
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
                      <Input
                        type="radio"
                        name="correctOption"
                        aria-label={`Correct option ${index + 1}`}
                        checked={
                          questionForm.correctOption !== null && Number(
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

                      <Input
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
                      <Button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => {
                        setQuestionForm(current => ({ ...current,
                          options: current.options.filter((_, position) => position !== index),
                          correctOption: current.correctOption === index ? null :
                            current.correctOption !== null && current.correctOption > index ? current.correctOption - 1 : current.correctOption,
                        }));
                      }}>Remove option</Button>
                    </div>
                  )
                )}

                <Button type="button" onClick={() => setQuestionForm(current => ({ ...current, options: [...current.options, ''] }))}>Add option</Button>
                <Button type="button" onClick={() => setQuestionForm(current => ({ ...current, correctOption: null }))}>Clear correct answer</Button>
                <p>Drafts may be incomplete. Publication requires at least two nonblank options and exactly one correct answer.</p>

                <label htmlFor="question-marks">Marks</label>

                <Input
                  type="number"
                  id="question-marks"
                  min="1"
                  step="any"
                  required
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      marks: e.target.value,
                    })
                  }
                />

                <Button type="submit">
                  {editingQuestionId
                    ? "Save Question Changes"
                    : "Add Question"}
                </Button>

                {editingQuestionId && (
                  <Button
                    type="button"
                    onClick={
                      cancelEditingQuestion
                    }
                  >
                    Cancel Edit
                  </Button>
                )}
              </form>
            </>}
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
                    <Button
                      onClick={() =>
                        startEditingQuestion(
                          question
                        )
                      }
                    >
                      Edit Question
                    </Button>

                    <Button
                      className="danger"
                      onClick={() =>
                        setConfirmation({ title: 'Delete question?', action: () => deleteQuestion(question._id) })
                      }
                    >
                      Delete Question
                    </Button>
                  </div>
                )}
              </div>
            )
          )}

          </div>
          <div role="tabpanel" tabIndex={0} id="exam-panel-results" aria-labelledby="exam-tab-results" hidden={examTab !== 'results'} className="exam-tab-panel">
            {examTab === 'results' && (selectedExam.status === 'Published'
              ? <ResultsPanel endpoint={`${EXAM_API}/${selectedExam._id}/results`} instructor />
              : <p className="empty-state">Results will be available after this examination is published and students submit their attempts.</p>)}
          </div>
          <div className="exam-view-actions">
          {selectedExam.status ===
            "Draft" && (
            <Button
              className="publish"
              onClick={() => setConfirmation({ title: 'Publish examination?', label: 'Confirm publication', message: 'Published questions and answer keys cannot be changed. Students will be able to start when eligible.', action: publishExam })}
            >
              Publish Exam
            </Button>
          )}
          </div>
        </Panel>
      )}
    </AppShell>
  );
}

export default App;
