import { useEffect, useRef, useState } from 'react';

export function Button({ className = '', type = 'button', ...props }) {
  return <button type={type} className={`button ${className}`} {...props} />;
}
export function Input(props) {
  return <input {...props} aria-label={props['aria-label'] || props.placeholder || undefined} />;
}
export function Textarea(props) {
  return <textarea {...props} aria-label={props['aria-label'] || props.placeholder || 'Description'} />;
}
export function Select(props) { return <select {...props} />; }
export function Panel({ className = '', ...props }) { return <section className={`panel ${className}`} {...props} />; }
export function Feedback({ children, error = false, onDismiss }) {
  if (!children) return null;
  const className = `feedback ${error ? 'error' : 'success'}`;
  if (!onDismiss) return <p className={className} role={error ? 'alert' : 'status'}>{children}</p>;
  return <div className={`${className} dismissible`} role={error ? 'alert' : 'status'}>
    <span>{children}</span><Button className="notification-dismiss" aria-label="Dismiss notification" onClick={onDismiss}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
    </Button>
  </div>;
}
export function Loading({ children = 'Loading...' }) { return <p className="feedback loading" role="status">{children}</p>; }
export function StatusBadge({ children }) { return <span className="status">{children}</span>; }
export function AppShell({ user, logout, children, navigationLinks, onNavigate, activeTab }) {
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  async function signOut() {
    setLoggingOut(true); setLogoutError('');
    try { await logout(); }
    catch (error) { setLogoutError(error.response?.data?.message || 'Could not log out. Retry when connected.'); }
    finally { setLoggingOut(false); }
  }
  const links = navigationLinks || (user?.role === 'Admin' ? [['accounts', 'Accounts'], ['create-account', 'Create account']]
    : user?.role === 'Instructor' ? [['create-exam', 'Create exam'], ['my-exams', 'My exams']]
    : user?.role === 'Student' ? [['available-exams', 'Exams'], ['examination', 'Current attempt'], ['results', 'Results']] : []);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><div className="brand">
      <div><h1>Online Exam Portal</h1><p>{user ? `${user.role} workspace` : 'Examinations and results'}</p></div></div>
      {user && <div className="account-summary"><span><strong>{user.name}</strong><small>{user.email}</small></span><Button disabled={loggingOut} onClick={signOut}>Logout</Button></div>}
    </header>
    {user && <nav className="app-nav" aria-label={`${user.role} navigation`}>
      {activeTab ? <div role="tablist" aria-label={`${user.role} workspace`} className="workspace-tabs">
        {links.map(([id, label], index) => <Button key={id} role="tab" id={`workspace-tab-${id}`}
          aria-controls={id} aria-selected={activeTab === id} tabIndex={activeTab === id ? 0 : -1}
          onClick={() => onNavigate(id)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % links.length
              : event.key === 'ArrowLeft' ? (index + links.length - 1) % links.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : null;
            if (next === null) return;
            event.preventDefault(); onNavigate(links[next][0]);
            document.getElementById(`workspace-tab-${links[next][0]}`)?.focus();
          }}>{label}</Button>)}
      </div> : links.map(([id, label]) => <a key={id} href={`#${id}`} onClick={onNavigate ? event => { event.preventDefault(); onNavigate(id); } : undefined}>{label}</a>)}
    </nav>}
    <main id="main-content" className={`container ${user ? '' : 'auth-layout'}`} tabIndex={-1}><Feedback error>{logoutError}</Feedback>{children}</main>
    <footer className="app-footer">Online Exam Portal <span>Release 1</span></footer>
  </>;
}
export function ConfirmDialog({ title, children, onCancel, onConfirm, busy = false, confirmLabel = 'Confirm', cancelLabel = 'Cancel submission' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog.showModal) { dialog.removeAttribute('open'); dialog.showModal(); }
    dialog.querySelector('button')?.focus();
    return () => { dialog.close?.(); previous?.focus(); };
  }, []);
  function handleKeys(event) {
    if (event.key === 'Escape') { event.preventDefault(); if (!busy) onCancel(); }
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled)')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog ref={ref} open aria-modal="true" aria-labelledby="confirmation-heading" onKeyDown={handleKeys}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h3 id="confirmation-heading">{title}</h3>{children}
    <div className="actions"><Button disabled={busy} onClick={onCancel}>{cancelLabel}</Button><Button className="primary" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
  </dialog>;
}
