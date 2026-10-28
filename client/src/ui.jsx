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
export function Feedback({ children, error = false }) {
  return children ? <p className={`feedback ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{children}</p> : null;
}
export function Loading({ children = 'Loading...' }) { return <p className="feedback loading" role="status">{children}</p>; }
export function StatusBadge({ children }) { return <span className="status">{children}</span>; }
export function AppShell({ user, logout, children, navigationLinks, onNavigate }) {
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
    {user && <nav className="app-nav" aria-label={`${user.role} navigation`}>{links.map(([id, label]) => <a key={id} href={`#${id}`} onClick={onNavigate ? event => { event.preventDefault(); onNavigate(id); } : undefined}>{label}</a>)}</nav>}
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
