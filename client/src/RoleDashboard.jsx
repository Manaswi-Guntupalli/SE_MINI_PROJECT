import { Button, Input, Select, Panel, Feedback, Loading, AppShell, StatusBadge } from './ui';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ExamAttempt from './ExamAttempt';
import ResultsPanel from './ResultsPanel';
import { browserTimeZone, displayTime } from './dateTime';

export default function RoleDashboard({ user, logout, api, csrfToken }) {
  const [reload, setReload] = useState(0);
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [starting, setStarting] = useState(false);
  const attemptKey = `oep-attempt-${user.id}`;
  const [account, setAccount] = useState({ name: '', email: '', password: '', role: 'Student' });
  const endpoint = user.role === 'Admin' ? `${api}/admin/users` : `${api}/student/exams`;
  const config = { headers: { 'X-CSRF-Token': csrfToken } };

  useEffect(() => {
    let current = true;
    axios.get(endpoint).then(async response => {
      if (current) setItems(response.data);
      const id = user.role === 'Student' && sessionStorage.getItem(attemptKey);
      if (id) {
        const restored = await axios.get(`${api}/student/attempts/${id}`);
        if (current) setAttempt(restored.data);
      }
    })
      .catch(() => { if (current) setError('Could not load dashboard. Refresh to retry.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [endpoint, api, attemptKey, user.role, reload]);

  async function start(id) {
    try {
      setError('');
      setStarting(true);
      const response = await axios.post(`${api}/student/exams/${id}/start`, {}, config);
      setAttempt(response.data);
      if (response.data.attempt._id) sessionStorage.setItem(attemptKey, response.data.attempt._id);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not start exam'); }
    finally { setStarting(false); }
  }
  async function createAccount(event) {
    event.preventDefault();
    try {
      setError('');
      await axios.post(endpoint, account, config);
      setAccount({ name: '', email: '', password: '', role: 'Student' });
      setSuccess('Account created successfully');
      setItems((await axios.get(endpoint)).data);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not create account'); }
  }
  async function updateAccount(id, change) {
    try {
      setError('');
      await axios.patch(`${endpoint}/${id}`, change, config);
      setSuccess('Account updated successfully');
      setItems((await axios.get(endpoint)).data);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not update account'); }
  }
  return <AppShell user={user} logout={logout}>
    <Feedback>{success}</Feedback>
    <Panel id={user.role === 'Admin' ? 'accounts' : 'available-exams'}>
      <div className="section-heading"><h2>{user.role === 'Admin' ? 'Accounts' : 'Available exams'}</h2><Button disabled={loading || starting} onClick={() => { setLoading(true); setError(''); setReload(value => value + 1); }}>Refresh dashboard</Button></div>
      {loading && <Loading />}
      {error && <><Feedback error>{error}</Feedback><Button onClick={() => { setLoading(true); setError(''); setReload(value => value + 1); }}>Retry dashboard</Button></>}
      {!loading && !error && items.length === 0 && <p>{user.role === 'Admin' ? 'No accounts found.' : 'No exams available yet.'}</p>}
      {items.map(item => <div className="exam-card" key={item.id || item._id}>
        {user.role === 'Admin' ? <>
          <p>{item.name} ({item.email}) — {item.active ? 'Active' : 'Inactive'}</p>
          <Select aria-label={`Role for ${item.email}`} value={item.role} disabled={item.id === user.id}
            onChange={event => updateAccount(item.id, { role: event.target.value })}>
            {['Student', 'Instructor', 'Admin'].map(role => <option key={role}>{role}</option>)}
          </Select>
          <Button disabled={item.id === user.id} onClick={() => updateAccount(item.id, { active: !item.active })}>{item.active ? 'Deactivate' : 'Activate'} {item.email}</Button>
        </> : <>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          <p>Duration: {item.duration} minutes. Start: {displayTime(item.startTime)} ({browserTimeZone})</p>
          <p>Status: <StatusBadge>{item.attemptStatus || 'Not started'}</StatusBadge></p>
          <Button disabled={starting || (item.canStart === false && !item.canResume)} onClick={() => start(item._id)}>
            {item.canResume ? 'Resume' : item.attemptStatus === 'Submitted' ? 'Submitted' : item.attemptStatus === 'Expired' ? 'Expired' : 'Start'} {item.title}
          </Button>
        </>}
      </div>)}
    </Panel>
    {user.role === 'Admin' && <Panel id="create-account"><h2>Create account</h2>
      <form onSubmit={createAccount}>
        {['name', 'email', 'password'].map(field => <label key={field}>{field}
          <Input required aria-label={`Account ${field}`} type={field === 'name' ? 'text' : field}
            minLength={field === 'password' ? 12 : undefined} maxLength={field === 'password' ? 72 : undefined}
            value={account[field]} onChange={event => setAccount({ ...account, [field]: event.target.value })} />
        </label>)}
        <Select aria-label="Account role" value={account.role} onChange={event => setAccount({ ...account, role: event.target.value })}>
          {['Student', 'Instructor', 'Admin'].map(role => <option key={role}>{role}</option>)}
        </Select>
        <Button type="submit">Create account</Button>
      </form>
    </Panel>}
    {user.role === 'Student' && <ResultsPanel endpoint={`${api}/student/results`} refreshKey={reload} />}
    {attempt && <ExamAttempt key={attempt.attempt._id} data={attempt} api={api} csrfToken={csrfToken} onSubmitted={() => { sessionStorage.removeItem(attemptKey); setReload(value => value + 1); }} onClose={destination => { setAttempt(null); requestAnimationFrame(() => document.getElementById(destination)?.scrollIntoView?.({ block: 'start' })); }} />}
  </AppShell>;
}
