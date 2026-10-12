export function todayUAE() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatTime(time) {
  if (!time) return '';

  const [hour, minute] = time
    .slice(0, 5)
    .split(':')
    .map(Number);

  const hour12 = hour % 12 || 12;
  const period = hour >= 12 ? 'م' : 'ص';

  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatDate(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('ar-AE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatWeekday(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('ar-AE-u-nu-latn', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDayMonth(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('ar-AE-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}