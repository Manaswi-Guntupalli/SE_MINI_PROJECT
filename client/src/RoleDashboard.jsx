import { useEffect, useState } from 'react';
import axios from 'axios';
import { browserTimeZone, displayTime } from './dateTime';

export default function RoleDashboard({ user, logout, api, csrfToken }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [resultMessage, setResultMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState({ name: '', email: '', password: '', role: 'Student' });
  const endpoint = user.role === 'Admin' ? `${api}/admin/users` : `${api}/student/exams`;
  const config = { headers: { 'X-CSRF-Token': csrfToken } };

  async function loadResults() {
    try {
      const response = await axios.get(`${api}/student/results`);
      setResults(response.data);
      setResultMessage('');
    } catch (failure) { setResultMessage(failure.response?.data?.message || 'Could not load results. Refresh to retry.'); }
  }

  useEffect(() => {
    let current = true;
    axios.get(endpoint).then(response => { if (current) setItems(response.data); })
      .catch(() => { if (current) setError('Could not load dashboard. Refresh to retry.'); })
      .finally(() => { if (current) setLoading(false); });
    if (user.role === 'Student') loadResults();
    return () => { current = false; };
  }, [endpoint, user.role]);

  async function start(id) {
    try {
      setError('');
      const response = await axios.post(`${api}/student/exams/${id}/start`, {}, config);
      setAttempt(response.data);
      setAnswers(Object.fromEntries((response.data.responses || []).map(r => [String(r.questionId), String(r.selectedOptionId)])));
    } catch (failure) { setError(failure.response?.data?.message || 'Could not start exam'); }
  }

  async function saveAnswer(questionId, selectedOptionId) {
    setAnswers(previous => ({ ...previous, [questionId]: selectedOptionId }));
    try {
      await axios.post(`${api}/student/attempts/${attempt.attempt._id}/responses`, { questionId, selectedOptionId }, config);
      setError('');
    } catch (failure) { setError(failure.response?.data?.message || 'Could not save answer. Please retry.'); }
  }

  async function submitAttempt() {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const response = await axios.post(`${api}/student/attempts/${attempt.attempt._id}/submit`, {}, config);
      setResultMessage(`Evaluation complete: ${response.data.result.score} / ${response.data.result.maximum}`);
      setAttempt(null);
      await loadResults();
    } catch (failure) { setError(failure.response?.data?.message || 'Could not submit exam. Your saved answers are retained; retry submission.'); }
    finally { setSubmitting(false); }
  }

  useEffect(() => {
    if (!attempt?.attempt?.deadline || attempt.attempt.status !== 'Active') return undefined;
    const delay = new Date(attempt.attempt.deadline).getTime() - Date.now();
    if (delay <= 0) { submitAttempt(); return undefined; }
    const timer = setTimeout(() => submitAttempt(), delay + 100);
    return () => clearTimeout(timer);
  }, [attempt?.attempt?._id, attempt?.attempt?.deadline, submitting]);

  async function createAccount(event) {
    event.preventDefault();
    try {
      setError('');
      await axios.post(endpoint, account, config);
      setAccount({ name: '', email: '', password: '', role: 'Student' });
      setItems((await axios.get(endpoint)).data);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not create account'); }
  }
  async function updateAccount(id, change) {
    try {
      setError('');
      await axios.patch(`${endpoint}/${id}`, change, config);
      setItems((await axios.get(endpoint)).data);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not update account'); }
  }

  return <div className="container">
    <h1>Online Exam Portal</h1>
    <p>Welcome, {user.name}. Signed in as {user.role}.</p>
    <button onClick={logout}>Logout</button>
    <section>
      <h2>{user.role === 'Admin' ? 'Accounts' : 'Available exams'}</h2>
      {loading && <p>Loading...</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {!loading && !error && items.length === 0 && <p>{user.role === 'Admin' ? 'No accounts found.' : 'No exams available yet.'}</p>}
      {items.map(item => <div className="exam-card" key={item.id || item._id}>
        {user.role === 'Admin' ? <>
          <p>{item.name} ({item.email}) — {item.active ? 'Active' : 'Inactive'}</p>
          <select aria-label={`Role for ${item.email}`} value={item.role} disabled={item.id === user.id}
            onChange={event => updateAccount(item.id, { role: event.target.value })}>
            {['Student', 'Instructor', 'Admin'].map(role => <option key={role}>{role}</option>)}
          </select>
          <button disabled={item.id === user.id} onClick={() => updateAccount(item.id, { active: !item.active })}>{item.active ? 'Deactivate' : 'Activate'} {item.email}</button>
        </> : <>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          <p>Duration: {item.duration} minutes. Start: {displayTime(item.startTime)} ({browserTimeZone})</p>
          <button onClick={() => start(item._id)}>Start or resume {item.title}</button>
        </>}
      </div>)}
    </section>
    {user.role === 'Student' && <section>
      <h2>My examination results</h2>
      {resultMessage && <p role="status">{resultMessage}</p>}
      {results.length === 0 ? <p>No evaluated results yet. Submitted results will appear here.</p> : results.map(result =>
        <div className="exam-card" key={result._id}>
          <strong>{result.examTitle}</strong>
          <p>Score: {result.score} / {result.maximum}</p>
          <p>Status: {result.status}</p>
        </div>)}
    </section>}
    {user.role === 'Admin' && <section><h2>Create account</h2>
      <form onSubmit={createAccount}>
        {['name', 'email', 'password'].map(field => <label key={field}>{field}
          <input required aria-label={`Account ${field}`} type={field === 'name' ? 'text' : field}
            minLength={field === 'password' ? 12 : undefined} maxLength={field === 'password' ? 72 : undefined}
            value={account[field]} onChange={event => setAccount({ ...account, [field]: event.target.value })} />
        </label>)}
        <select aria-label="Account role" value={account.role} onChange={event => setAccount({ ...account, role: event.target.value })}>
          {['Student', 'Instructor', 'Admin'].map(role => <option key={role}>{role}</option>)}
        </select>
        <button>Create account</button>
      </form>
    </section>}
    {attempt && <section>
      <h2>Examination in progress</h2>
      <p>Deadline: {displayTime(attempt.attempt.deadline)} ({browserTimeZone})</p>
      {attempt.questions.map((question, index) => <div className="exam-card" key={question._id}>
        <h3>{index + 1}. {question.questionText}</h3>
        {question.options.map(option => <label key={option._id} style={{ display: 'block', margin: '8px 0' }}>
          <input type="radio" name={question._id} checked={answers[String(question._id)] === String(option._id)}
            onChange={() => saveAnswer(String(question._id), String(option._id))} />
          {option.text}
        </label>)}
      </div>)}
      <button onClick={submitAttempt} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit examination'}</button>
    </section>}
  </div>;
}
