export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidTimeHHMM(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export function isValidDateYMD(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function required(value: string): boolean {
  return value.trim().length > 0;
}