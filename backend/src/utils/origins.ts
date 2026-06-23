const DEFAULT_ORIGINS = 'http://localhost:3016,http://localhost:3018';

function normalizeOrigin(origin: string): string[] {
  const value = origin.trim().replace(/\/$/, '');
  if (!value) return [];
  if (/^https?:\/\//i.test(value)) return [value];
  return [`https://${value}`];
}

export function parseAllowedOrigins(rawOrigins = process.env.TRACECRAFT_CORS_ORIGINS || DEFAULT_ORIGINS): string[] {
  return rawOrigins
    .split(',')
    .flatMap(normalizeOrigin)
    .filter(Boolean);
}
