import { initTracing } from './tracing';
import { initMetrics } from './metricsInit';

// Hook for early startup.
export const initObservability = (): void => {
  initTracing();
  initMetrics();
};


