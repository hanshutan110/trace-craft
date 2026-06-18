export function toIso(value: unknown): string {
  return value ? new Date(value as string | Date).toISOString() : new Date().toISOString();
}
