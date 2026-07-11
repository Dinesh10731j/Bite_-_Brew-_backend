import { AsyncLocalStorage } from 'node:async_hooks';
import { PerformanceTracker } from './performanceTracker';

export type PerfContext = {
  tracker: PerformanceTracker;
};

export const perfAsyncLocal = new AsyncLocalStorage<PerfContext>();

export const runWithPerfContext = <T>(ctx: PerfContext, fn: () => Promise<T>): Promise<T> => {
  return perfAsyncLocal.run(ctx, fn);
};

export const getPerfTracker = (): PerformanceTracker | undefined => {
  return perfAsyncLocal.getStore()?.tracker;
};

