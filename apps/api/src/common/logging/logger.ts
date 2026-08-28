import { randomUUID } from 'node:crypto';

import pino, { type Logger, type LoggerOptions } from 'pino';

import type { Env } from '../../config/env';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["project-access-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  '*.identityToken',
];

export function buildLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    // Structured JSON in production so the platform's log search works.
    // Pretty output is deliberately not wired in: it needs an extra dependency
    // and a dev-only transport, and `npm run dev` output stays readable enough.
    redact: { paths: REDACTED_PATHS, remove: true },
    base: { service: 'aura-api', env: env.NODE_ENV },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
}

export function createLogger(env: Env): Logger {
  return pino(buildLoggerOptions(env));
}

/**
 * Request ids come from the caller when present so a single user action can be
 * traced across the app, the API, and the worker.
 */
export function generateRequestId(header?: string | string[]): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  return candidate && candidate.length <= 200 ? candidate : randomUUID();
}
