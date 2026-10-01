import type { Capabilities } from './types.ts';

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

export const sqliteCapabilities: Readonly<Capabilities> = Object.freeze({
  joins: true,
  transactions: true,
  docPaths: true,
  vector: false,
  graph: true,
  timeSeries: false,
  fullText: true,
  ttl: false,
});

export const documentCapabilities: Readonly<Capabilities> = Object.freeze({
  joins: false,
  transactions: true,
  docPaths: true,
  vector: true,
  graph: false,
  timeSeries: false,
  fullText: true,
  ttl: true,
});

export const kvCapabilities: Readonly<Capabilities> = Object.freeze({
  joins: false,
  transactions: false,
  docPaths: false,
  vector: false,
  graph: false,
  timeSeries: false,
  fullText: false,
  ttl: true,
});

