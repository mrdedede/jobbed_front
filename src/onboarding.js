/**
 * @file Whether the user finished or skipped the guided setup (/welcome).
 * Browser-only: a new device shows it again until the user has data.
 */

const KEY = 'jobbed.onboarding.done';

/** Fallback when localStorage throws (private window, blocked site data). */
let memoryDone = false;

/** @return {boolean} */
export function isOnboardingDone() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return memoryDone;
  }
}

/** Remembers that the guided setup should not open by itself again. */
export function markOnboardingDone() {
  memoryDone = true;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // memory only
  }
}
