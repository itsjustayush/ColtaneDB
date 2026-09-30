import type { Capabilities } from './types.js';

export const postgresCapabilities: Readonly<Capabilities> = Object.freeze({
  joins: true,
  transactions: true,
  docPaths: true,
  vector: true,
  graph: true,
  timeSeries: true,
  fullText: true,
  ttl: false,
});