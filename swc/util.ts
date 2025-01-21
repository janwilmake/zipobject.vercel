/**
 * Removes empty values (null or undefined) from your arrays in a type-safe way
 */
export function notEmpty<TValue extends unknown>(
  value: TValue | null | undefined,
): value is TValue {
  return value !== null && value !== undefined;
}
