import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request timing accumulator. Lets us attribute total request latency to
 * its sources: time spent in the database vs. time spent calling the external
 * game integrator (21viral) vs. our own code.
 */
export interface RequestTiming {
  dbMs: number;
  dbCount: number;
  providerMs: number;
  providerCount: number;
}

export const timingStore = new AsyncLocalStorage<RequestTiming>();

/** Adds a DB query duration to the current request's accumulator (no-op outside a request). */
export function addDbTiming(ms: number): void {
  const store = timingStore.getStore();
  if (store) {
    store.dbMs += ms;
    store.dbCount += 1;
  }
}

/** Adds an external provider (21viral) call duration to the current request's accumulator. */
export function addProviderTiming(ms: number): void {
  const store = timingStore.getStore();
  if (store) {
    store.providerMs += ms;
    store.providerCount += 1;
  }
}
