/**
 * A value of a required form control, read after `form.valid` was checked.
 * Throws instead of sending a hole to the API if that assumption ever breaks.
 */
export function requiredValue<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`Required form value "${name}" is missing`);
  return value;
}
