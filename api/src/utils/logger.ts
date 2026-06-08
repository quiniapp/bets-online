import pino from 'pino';
import { config } from '../config';

const env = config.server.env;
const isProd = env === 'production';
const isTest = env === 'test';

/**
 * Structured logger (pino). In production it emits one JSON line per event to
 * stdout (captured by Railway). In dev/local it pretty-prints for readability.
 * In tests it is silent (and uses no transport worker, to avoid open handles).
 *
 * Level comes from config.logging.level (LOG_LEVEL env), so per-query debug logs
 * can be turned on in production without a code change.
 */
export const logger = pino({
  level: isTest ? 'silent' : config.logging.level,
  base: undefined, // drop pid/hostname noise
  ...(isProd || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname'
          }
        }
      })
});

export default logger;
