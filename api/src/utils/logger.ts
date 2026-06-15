import pino from 'pino';
import pretty from 'pino-pretty';
import { config } from '../config';

// Defensive reads: unit tests mock '../config' partially (e.g. only
// config.viral) and the logger must still load.
const env = config.server?.env ?? process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';
const isTest = env === 'test';

// ANSI helpers for the pretty (dev) request line. pino-pretty colorizes the
// level/time prefix; the message body is ours to format.
const c = {
  dim: (s: string) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  statusColor: (code: number, s: string) => {
    const color = code >= 500 ? 31 : code >= 400 ? 33 : code >= 300 ? 36 : 32; // red/yellow/cyan/green
    return `\x1b[${color}m${s}\x1b[0m`;
  }
};

const pad = (s: string, n: number): string => (s.length >= n ? s : s + ' '.repeat(n - s.length));

/**
 * Compact one-line renderer for request-timing logs in dev. Turns the noisy
 * key/value dump into:
 *   GET  /api/users/me/tree              200  462ms │ db 458×4 · prov 0×0 · app 4
 * Non-request logs fall through to their normal message.
 */
const messageFormat = (log: Record<string, unknown>, messageKey: string): string => {
  const msg = log[messageKey] as string;
  if (msg !== 'request') return msg;

  const method = pad(String(log.method ?? ''), 4);
  const url = pad(String(log.url ?? ''), 32);
  const status = c.statusColor(Number(log.status), String(log.status));
  const total = c.bold(`${log.totalMs}ms`);
  const breakdown = c.dim(
    `db ${log.dbMs}×${log.dbCount} · prov ${log.providerMs}×${log.providerCount} · app ${log.appMs}`
  );
  return `${c.cyan(method)} ${url} ${status}  ${total} ${c.dim('│')} ${breakdown}`;
};

/**
 * Structured logger (pino). In production it emits one JSON line per event to
 * stdout (captured by Railway). In dev/local it pretty-prints for readability.
 * In tests it is silent (and uses no transport worker, to avoid open handles).
 *
 * Level comes from config.logging.level (LOG_LEVEL env), so per-query debug logs
 * can be turned on in production without a code change.
 */
const level = isTest ? 'silent' : (config.logging?.level ?? 'info');

// In dev, attach pino-pretty as a direct stream (not a transport worker) so the
// `messageFormat` function survives — transport options are JSON-serialized
// across the worker boundary and would drop the function.
export const logger =
  isProd || isTest
    ? pino({ level, base: undefined })
    : pino(
        { level, base: undefined },
        pretty({
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          // Hide the raw request fields — messageFormat renders them compactly.
          ignore:
            'pid,hostname,reqId,method,url,status,totalMs,dbMs,dbCount,providerMs,providerCount,appMs',
          messageFormat
        })
      );

export default logger;
