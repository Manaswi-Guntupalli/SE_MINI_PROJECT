import { Button, Input, Select, Panel, Feedback, Loading, AppShell, StatusBadge } from './ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ExamAttempt from './ExamAttempt';
import ResultsPanel from './ResultsPanel';
import { browserTimeZone, displayTime } from './dateTime';

export default function RoleDashboard({ user, logout, api, csrfToken }) {
  const [reload, setReload] = useState(0);
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listStatus, setListStatus] = useState('loading');
  const listRequest = useRef(0);
  const restoreRequest = useRef(0);
  const alive = useRef(true);
  const [restoringAttempt, setRestoringAttempt] = useState(() => user.role === 'Student' && !!sessionStorage.getItem(`oep-attempt-${user.id}`));
  const [restoreError, setRestoreError] = useState('');
  const [restoreReload, setRestoreReload] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [starting, setStarting] = useState(false);
  const [studentTab, setStudentTab] = useState('available-exams');
  const [adminTab, setAdminTab] = useState('accounts');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const restoredOnce = useRef(false);
  const isStudent = user.role === 'Student';
  const listTab = isStudent ? 'available-exams' : 'accounts';
  const activeTab = isStudent ? studentTab : adminTab;
  const attemptKey = `oep-attempt-${user.id}`;
  const [account, setAccount] = useState({ name: '', email: '', password: '', role: 'Student' });
  const endpoint = user.role === 'Admin' ? `${api}/admin/users` : `${api}/student/exams`;
  const config = { headers: { 'X-CSRF-Token': csrfToken } };

  useEffect(() => {
    alive.current = true;
    const requests = listRequest, restores = restoreRequest;
    return () => { alive.current = false; requests.current++; restores.current++; };
  }, []);

  const loadList = useCallback(async () => {
    const request = ++listRequest.current;
    try {
      const response = await axios.get(endpoint);
      if (!alive.current || request !== listRequest.current) return null;
      setItems(Array.isArray(response.data) ? response.data : []);
      setListStatus('success');
      return true;
    } catch {
      if (!alive.current || request !== listRequest.current) return null;
      setListStatus('error');
      return false;
    } finally { if (alive.current && request === listRequest.current) setLoading(false); }
  }, [endpoint]);

  function clearNotifications() { setSuccess(''); setError(''); }
  function navigate(tab) {
    clearNotifications();
    if (isStudent) setStudentTab(tab); else setAdminTab(tab);
  }
  function refreshDashboard() {
    clearNotifications(); setLoading(true); setListStatus('loading');
    setRestoreError(''); setRestoringAttempt(isStudent && !!sessionStorage.getItem(attemptKey));
    setReload(value => value + 1);
  }
  async function refreshAccountsAfterSave(message) {
    setLoading(true); setListStatus('loading');
    const loaded = await loadList();
    if (loaded === true) setSuccess(message);
    else if (loaded === false) {
      setError(`${message} The account list could not refresh. Refresh dashboard to see the saved change.`);
    }
  }

  useEffect(() => {
    let current = true;
    const requests = listRequest;
    async function loadDashboard() {
      const loaded = await loadList();
      if (current && loaded === false) setError('Could not load dashboard. Refresh to retry.');
    }
    void loadDashboard();
    return () => { current = false; requests.current++; };
  }, [loadList, reload]);

  useEffect(() => {
    const requests = restoreRequest;
    const request = ++requests.current;
    const id = isStudent && sessionStorage.getItem(attemptKey);
    if (!id) return;
    void axios.get(`${api}/student/attempts/${id}`).then(restored => {
      if (!alive.current || request !== restoreRequest.current) return;
      setRestoreError('');
      setAttempt(restored.data);
      if (!restoredOnce.current) { restoredOnce.current = true; setStudentTab('examination'); }
    }).catch(failure => {
      if (!alive.current || request !== restoreRequest.current) return;
      if ([403, 404].includes(failure.response?.status)) sessionStorage.removeItem(attemptKey);
      else setRestoreError('Could not restore your attempt. Retry while the original deadline continues.');
    }).finally(() => { if (alive.current && request === restoreRequest.current) setRestoringAttempt(false); });
    return () => { requests.current++; };
  }, [api, attemptKey, isStudent, reload, restoreReload]);

  async function start(id) {
    try {
      clearNotifications();
      setStarting(true);
      const response = await axios.post(`${api}/student/exams/${id}/start`, {}, config);
      if (!alive.current) return;
      restoreRequest.current++;
      setRestoringAttempt(false); setRestoreError('');
      setAttempt(response.data);
      restoredOnce.current = true;
      setStudentTab('examination');
      setItems(current => current.map(item => item._id === id ? { ...item, attemptStatus: 'Active', canStart: false, canResume: true } : item));
      if (response.data.attempt._id) sessionStorage.setItem(attemptKey, response.data.attempt._id);
    } catch (failure) { setError(failure.response?.data?.message || 'Could not start exam'); }
    finally { setStarting(false); }
  }
  async function createAccount(event) {
    event.preventDefault();
    if (creatingAccount) return;
    setCreatingAccount(true);
    try {
      clearNotifications();
      await axios.post(endpoint, account, config);
      if (!alive.current) return;
      setAccount({ name: '', email: '', password: '', role: 'Student' });
      setAdminTab('accounts');
      await refreshAccountsAfterSave('Account created successfully');
    } catch (failure) { setError(failure.response?.data?.message || 'Could not create account'); }
    finally { setCreatingAccount(false); }
  }
  async function updateAccount(id, change) {
    try {
      clearNotifications();
      await axios.patch(`${endpoint}/${id}`, change, config);
      if (!alive.current) return;
      await refreshAccountsAfterSave('Account updated successfully');
    } catch (failure) { setError(failure.response?.data?.message || 'Could not update account'); }
  }
  return <AppShell user={user} logout={logout} activeTab={activeTab} onNavigate={navigate}>
    <Feedback onDismiss={() => setSuccess('')}>{success}</Feedback>
    <Feedback error onDismiss={() => setError('')}>{error}</Feedback>
    <Panel id={listTab} hidden={activeTab !== listTab}
      role="tabpanel" aria-labelledby={`workspace-tab-${listTab}`} tabIndex={0}>
      <div className="section-heading"><h2>{user.role === 'Admin' ? 'Accounts' : 'Available exams'}</h2><Button disabled={loading || starting} onClick={refreshDashboard}>Refresh dashboard</Button></div>
      {loading && <Loading />}
      {(error || listStatus === 'error') && <Button onClick={refreshDashboard}>Retry dashboard</Button>}
      {listStatus === 'error' && <p>The list is unavailable. Retry loading it.</p>}
      {listStatus === 'success' && items.length === 0 && <p>{user.role === 'Admin' ? 'No accounts found.' : 'No exams available yet.'}</p>}
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
          <Button disabled={starting || (['Submitted', 'Expired'].includes(item.attemptStatus) || (item.canStart === false && !item.canResume))} onClick={() => start(item._id)}>
            {(item.canResume || item.attemptStatus === 'Active') ? 'Resume' : item.attemptStatus === 'Submitted' ? 'Submitted' : item.attemptStatus === 'Expired' ? 'Expired' : 'Start'} {item.title}
          </Button>
        </>}
      </div>)}
    </Panel>
    {user.role === 'Admin' && <Panel id="create-account" role="tabpanel" aria-labelledby="workspace-tab-create-account" tabIndex={0} hidden={adminTab !== 'create-account'}><h2>Create account</h2>
      <form onSubmit={createAccount} autoComplete="off">
        {['name', 'email', 'password'].map(field => <label key={field} htmlFor={`new-account-${field}`}>{field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Password'}
          <Input required id={`new-account-${field}`} name={`new-account-${field}`} aria-label={`Account ${field}`} type={field === 'name' ? 'text' : field}
            autoComplete={field === 'password' ? 'new-password' : 'off'}
            minLength={field === 'password' ? 12 : undefined} maxLength={field === 'password' ? 72 : undefined}
            value={account[field]} onChange={event => setAccount({ ...account, [field]: event.target.value })} />
        </label>)}
        <label htmlFor="new-account-role">Role</label>
        <Select id="new-account-role" name="new-account-role" aria-label="Account role" value={account.role} onChange={event => setAccount({ ...account, role: event.target.value })}>
          {['Student', 'Instructor', 'Admin'].map(role => <option key={role}>{role}</option>)}
        </Select>
        <Button type="submit" disabled={creatingAccount}>{creatingAccount ? 'Creating account...' : 'Create account'}</Button>
      </form>
    </Panel>}
    {isStudent && <>
      <div id="examination" role="tabpanel" aria-labelledby="workspace-tab-examination" tabIndex={0} hidden={studentTab !== 'examination'}>
        {restoringAttempt && <Loading>Restoring your attempt...</Loading>}
        {restoreError && <><Feedback error>{restoreError}</Feedback><Button onClick={() => { setRestoreError(''); setRestoringAttempt(true); setRestoreReload(value => value + 1); }}>Retry attempt restoration</Button></>}
        {attempt ? <ExamAttempt key={attempt.attempt._id} data={attempt} api={api} csrfToken={csrfToken}
          panelId="current-attempt-content" visible={studentTab === 'examination'}
          onSubmitted={() => { restoreRequest.current++; setRestoringAttempt(false); setRestoreError(''); sessionStorage.removeItem(attemptKey); setReload(value => value + 1); }}
          onClose={destination => { setAttempt(null); setStudentTab(destination); }} />
          : !restoringAttempt && !restoreError && <Panel><h2>Current attempt</h2><p>No exam is open. Start or resume an exam from the Exams tab.</p>
            <Button onClick={() => setStudentTab('available-exams')}>Browse exams</Button></Panel>}
      </div>
      <div id="results" role="tabpanel" aria-labelledby="workspace-tab-results" tabIndex={0} hidden={studentTab !== 'results'}>
        {studentTab === 'results' && <ResultsPanel panelId="student-results-content" endpoint={`${api}/student/results`} pendingEndpoint={`${api}/student/pending-results`} refreshKey={reload} />}
      </div>
    </>}
  </AppShell>;
}
