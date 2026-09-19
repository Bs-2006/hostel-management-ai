// Formats 'YYYY-MM-DD' (or ISO string) into a readable 'DD Mon YYYY' string.
export function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Formats 'HH:MM' as given by the API (kept as-is).
export function formatTime(value: string): string {
  return value || '';
}

// Returns today's date in local time, formatted as 'YYYY-MM-DD'.
export function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}