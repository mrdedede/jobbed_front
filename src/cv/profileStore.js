/**
 * The user's own CV details, kept in this browser only: text in localStorage,
 * the photo in IndexedDB (localStorage is ~5 MB and strings only). Every access
 * is guarded: storage can be blocked, in which case values live in memory until
 * the tab closes.
 */

const TEXT_KEY = 'joblister.cvProfile';
const DB_NAME = 'joblister';
const STORE = 'cvPhoto';
const PHOTO_KEY = 'photo';

/** @type {import('./model.js').Profile} */
const EMPTY = { name: '', contact: '', languages: [] };

const memory = { profile: EMPTY, photo: null };

/** @return {import('./model.js').Profile} */
export function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(TEXT_KEY));
    return stored ? { ...EMPTY, ...stored } : memory.profile;
  } catch {
    return memory.profile;
  }
}

/** @param {import('./model.js').Profile} profile */
export function saveProfile(profile) {
  memory.profile = profile;
  try {
    localStorage.setItem(TEXT_KEY, JSON.stringify(profile));
  } catch {
    // memory only
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** @return {Promise<?Blob>} */
export async function loadPhoto() {
  try {
    return (await withStore('readonly', (store) => store.get(PHOTO_KEY))) ?? null;
  } catch {
    return memory.photo;
  }
}

/** @param {?Blob} photo null removes it. */
export async function savePhoto(photo) {
  memory.photo = photo;
  try {
    await withStore('readwrite', (store) => (
      photo ? store.put(photo, PHOTO_KEY) : store.delete(PHOTO_KEY)));
  } catch {
    // memory only
  }
}

/**
 * Shrinks a picked image so a phone photo does not bloat the PDF.
 *
 * @param {File} file
 * @param {number=} maxSide Longest side, in pixels.
 * @return {Promise<Blob>} JPEG.
 */
export async function downscalePhoto(file, maxSide = 400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read the image'))),
      'image/jpeg', 0.85);
  });
}
