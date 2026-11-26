/**
 * A random id for this browser: the key of the server's per-device limits
 * for the AI features (the trip explanation and the assistant). Created on
 * the first AI request, never on page load; the server stores only a salted
 * hash of it. Without storage (private mode) every request gets a new id,
 * and the per-network limit applies.
 *
 * The key predates the assistant: existing ids, and the limits counted
 * against them, carry over.
 */
export const DEVICE_ID_KEY = 'gsp_pet_trip_device';
const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;

function newDeviceId(): string {
  const random = globalThis.crypto;
  if (typeof random?.randomUUID === 'function') return random.randomUUID();
  const bytes = new Uint8Array(16);
  random.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY);
    if (saved && DEVICE_ID.test(saved)) return saved;
    const created = newDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return newDeviceId();
  }
}
