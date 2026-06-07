import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { timingStore, RequestTiming } from '../utils/request-context';
import { logger } from '../utils/logger';

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Opens a per-request timing context and logs a single structured line when the
 * response finishes, broken down into:
 *   - totalMs:    wall-clock time the request spent in our backend
 *   - dbMs/dbCount:           time + number of DB queries
 *   - providerMs/providerCount: time + number of 21viral calls
 *   - appMs:      remainder (our own compute) = total - db - provider
 *
 * This is the signal for "is the bottleneck the DB, 21viral, or our code?".
 * Note: totalMs does NOT include the Vercel→Railway proxy hop or network egress.
 */
export const requestTiming = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();
  const timing: RequestTiming = { dbMs: 0, dbCount: 0, providerMs: 0, providerCount: 0 };
  const reqId = randomUUID();
  res.setHeader('x-request-id', reqId);

  res.on('finish', () => {
    const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
    const appMs = Math.max(0, totalMs - timing.dbMs - timing.providerMs);
    logger.info(
      {
        reqId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        totalMs: round(totalMs),
        dbMs: round(timing.dbMs),
        dbCount: timing.dbCount,
        providerMs: round(timing.providerMs),
        providerCount: timing.providerCount,
        appMs: round(appMs)
      },
      'request'
    );
  });

  // Run the rest of the request inside the ALS context so DB/provider timings
  // accumulate into `timing` (same object the finish handler reads via closure).
  timingStore.run(timing, () => next());
};
