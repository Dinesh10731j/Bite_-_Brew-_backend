import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const getMetrics = async (): Promise<string> => registry.metrics();
export const metricsContentType = registry.contentType;
