/**
 * @file Client-side credential validation. Mirrors joblister_back/api/schemas.py.
 * Each validator returns an error message, or null when the value is valid.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export function validateEmail(value) {
  const email = value.trim();
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return 'Enter a valid email';
  return null;
}

export function validatePassword(value) {
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`;
  }
  // bcrypt only reads 72 bytes, and the backend enforces it.
  if (new TextEncoder().encode(value).length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} bytes (fewer accented/emoji characters)`;
  }
  return null;
}
