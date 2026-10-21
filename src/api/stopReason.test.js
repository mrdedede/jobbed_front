import { describe, expect, it } from 'vitest';
import { toStopReason } from './stopReason.js';

const labels = { doing: 'generating a CV', thing: 'CV generation' };
const kind = (status, detail, extra) => toStopReason({ status, detail, ...extra }, labels).kind;

describe('toStopReason', () => {
  // The exact strings jobbed_back/api/routers/user.py sends.
  it.each([
    [409, 'no active CV', 'no-cv'],
    [409, 'no analysis for job', 'no-analysis'],
    [409, 'analysis already running', 'busy'],
    [409, 'generation already running', 'busy'],
    [409, 'something new', 'error'],
    [429, 'daily limit of 2 CV generations reached', 'quota'],
    [502, 'the AI model call failed', 'all-failed'],
    [503, 'interrupted', 'interrupted'],
    [0, 'Network error', 'network'],
    [500, 'internal error', 'error'],
  ])('%i %s -> %s', (status, detail, expected) => {
    expect(kind(status, detail)).toBe(expected);
  });

  it('keeps Retry-After for quota errors', () => {
    expect(toStopReason({ status: 429, detail: 'x', retryAfter: 60 }, labels))
      .toMatchObject({ kind: 'quota', retryAfter: 60 });
  });
});
