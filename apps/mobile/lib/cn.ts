type ClassValue = string | false | null | undefined;

/**
 * Joins class strings. Deliberately not `tailwind-merge`: every variant map in
 * `components/ui` is authored so its classes do not collide, and the conflict
 * resolver costs more than it saves at this size.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
