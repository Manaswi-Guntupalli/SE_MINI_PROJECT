import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AppShell, ConfirmDialog, Feedback } from './ui';
afterEach(cleanup);
it.each(['Student', 'Instructor', 'Admin'])('#65 %s shell exposes only relevant navigation with a main landmark', role => {
  render(<AppShell user={{ name: 'Test user', role }} logout={vi.fn()}><p>Workspace</p></AppShell>);
  expect(screen.getByRole('navigation', { name: `${role} navigation` })).toBeTruthy();
  expect(screen.getByRole('main').id).toBe('main-content');
  expect(screen.queryByRole('link', { name: 'Create account' }) !== null).toBe(role === 'Admin');
  expect(screen.queryByRole('link', { name: 'My exams' }) !== null).toBe(role === 'Instructor');
  expect(screen.queryByRole('link', { name: 'Results' }) !== null).toBe(role === 'Student');
});
it('#65 dialog traps keyboard focus, supports Escape and restores focus', () => {
  const cancel = vi.fn();
  const { unmount } = render(<ConfirmDialog title="Confirm action" onCancel={cancel} onConfirm={vi.fn()} />);
  const first = screen.getByRole('button', { name: 'Cancel submission' });
  const last = screen.getByRole('button', { name: 'Confirm' });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: 'Escape' });
  expect(cancel).toHaveBeenCalledOnce();
  unmount();
});
it('#65 feedback distinguishes errors and status announcements', () => {
  render(<><Feedback error>Could not save</Feedback><Feedback>Saved</Feedback></>);
  expect(screen.getByRole('alert').textContent).toBe('Could not save');
  expect(screen.getByRole('status').textContent).toBe('Saved');
});
