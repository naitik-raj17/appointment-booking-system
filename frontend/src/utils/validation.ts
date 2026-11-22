export type Errors<T> = Partial<Record<keyof T, string>>;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function passwordError(v: string): string | undefined {
  if (v.length < 8) return 'At least 8 characters';
  if (!/[A-Za-z]/.test(v)) return 'Must contain a letter';
  if (!/\d/.test(v)) return 'Must contain a number';
  return undefined;
}

export function phoneError(v: string): string | undefined {
  if (v && !/^[+\d\s()-]{6,30}$/.test(v)) return 'Enter a valid phone number';
  return undefined;
}

/** Returns true when the error map has no messages. */
export const isValid = <T,>(errors: Errors<T>) => Object.values(errors).every((e) => !e);
