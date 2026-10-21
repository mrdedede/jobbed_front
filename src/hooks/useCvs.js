import { useState } from 'react';
import { useFetch } from './useFetch.js';
import { activateCv, createCv, listCvs, removeCv, updateCv } from '../api/endpoints/cvs.js';

export const MAX_CVS = 10;
export const CV_MAX_LENGTH = 100_000;

let tempCounter = 0;

/** Wraps an API failure so callers can show `error.message` inline. */
function toError(caught) {
  const message = caught.status === 409
    ? `CV limit reached (${MAX_CVS})`
    : (caught.detail ?? caught.message);
  return Object.assign(new Error(message), { status: caught.status });
}

/**
 * The user's CVs with optimistic create / update / activate / remove.
 * Every action rolls back on failure and then throws an Error whose message
 * is fit to display; the caller decides where to show it.
 *
 * @return {{cvs: Array<{id: string, content_md: string, is_active: boolean,
 *     pending?: boolean}>, loaded: boolean, loading: boolean, error: ?ApiError,
 *     refetch: function(): void, create: function(string, boolean): Promise<void>,
 *     update: function(string, string): Promise<void>,
 *     activate: function(string): Promise<void>,
 *     remove: function(string): Promise<void>}}
 */
export function useCvs() {
  const { data, loading, error, refetch } = useFetch((signal) => listCvs({ signal }));
  // `local` holds optimistic edits; null means "show what the server sent".
  // A new server response (a refetch) replaces them.
  const [local, setLocal] = useState(null);
  const [localFor, setLocalFor] = useState(data);
  if (localFor !== data) {
    setLocalFor(data);
    setLocal(null);
  }
  const cvs = local ?? data ?? [];
  const change = (fn) => setLocal((previous) => fn(previous ?? data ?? []));

  const resync = () => {
    setLocal(null);
    refetch();
  };

  const validate = (markdown) => {
    const text = markdown.trim();
    if (!text) throw new Error('A CV cannot be empty');
    if (text.length > CV_MAX_LENGTH) throw new Error(`At most ${CV_MAX_LENGTH} characters`);
    return text;
  };

  const create = async (markdown, makeActive) => {
    const text = validate(markdown);
    if (cvs.length >= MAX_CVS) throw new Error(`CV limit reached (${MAX_CVS})`);

    const tempId = `tmp-${++tempCounter}`;
    const previousActiveId = cvs.find((cv) => cv.is_active)?.id;
    change((previous) => [
      ...(makeActive ? previous.map((cv) => ({ ...cv, is_active: false })) : previous),
      { id: tempId, content_md: text, is_active: makeActive, pending: true },
    ]);
    try {
      const created = await createCv(text, makeActive);
      change((previous) => previous.map((cv) => (cv.id === tempId ? created : cv)));
    } catch (caught) {
      change((previous) => previous
        .filter((cv) => cv.id !== tempId)
        .map((cv) => (makeActive ? { ...cv, is_active: cv.id === previousActiveId } : cv)));
      throw toError(caught);
    }
  };

  const update = async (id, markdown) => {
    const text = validate(markdown);
    const original = cvs.find((cv) => cv.id === id);
    change((previous) => previous.map((cv) => (
      cv.id === id ? { ...cv, content_md: text, pending: true } : cv)));
    try {
      const updated = await updateCv(id, text);
      change((previous) => previous.map((cv) => (cv.id === id ? updated : cv)));
    } catch (caught) {
      if (caught.status === 404) resync();
      else change((previous) => previous.map((cv) => (cv.id === id ? original : cv)));
      throw toError(caught);
    }
  };

  const activate = async (id) => {
    const previousActiveId = cvs.find((cv) => cv.is_active)?.id;
    change((previous) => previous.map((cv) => ({ ...cv, is_active: cv.id === id })));
    try {
      await activateCv(id);
    } catch (caught) {
      if (caught.status === 404) resync();
      else {
        change((previous) => previous.map((cv) => ({ ...cv, is_active: cv.id === previousActiveId })));
      }
      throw toError(caught);
    }
  };

  const remove = async (id) => {
    const index = cvs.findIndex((cv) => cv.id === id);
    const original = cvs[index];
    change((previous) => previous.filter((cv) => cv.id !== id));
    try {
      await removeCv(id);
    } catch (caught) {
      if (caught.status === 404) return; // already gone
      change((previous) => {
        const restored = [...previous];
        restored.splice(Math.min(index, restored.length), 0, original);
        return restored;
      });
      throw toError(caught);
    }
  };

  return { cvs, loaded: data !== null, loading, error, refetch, create, update, activate, remove };
}
