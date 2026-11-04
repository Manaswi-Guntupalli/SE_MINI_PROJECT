export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const toUtc = value => value ? new Date(value).toISOString() : null;
export const displayTime = value => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long', timeZone: browserTimeZone }).format(new Date(value))
  : 'Not set';
