import type { SourceSpan } from '@coltanedb/parser';

export type PostgresBackend = 'neon' | 'supabase';

export interface ParameterBinding {
  kind: 'constant' | 'parameter' | 'default' | 'path';
  value?: unknown;
  name?: string;
  expression?: string;
  transform?: 'json';
}

export interface PlanStep {
  backend: PostgresBackend;
  operation: 'schema.create' | 'query' | 'record.put' | 'record.create' | 'record.delete' | 'transaction';
  collection: string;
  parameterizedStatement?: string;
  params?: ParameterBinding[];
  substeps?: PlanStep[];
  span: SourceSpan;
}

export interface ExecutionPlan {
  steps: PlanStep[];
}

export interface CompilerDiagnostic {
  code: string;
  message: string;
  hint?: string;
  span: SourceSpan;
}

export interface CompileResult {
  plan?: ExecutionPlan;
  diagnostics: CompilerDiagnostic[];
}

export interface Capabilities {
  joins: boolean;
  transactions: boolean;
  docPaths: boolean;
  vector: boolean;
  graph: boolean;
  timeSeries: boolean;
  fullText: boolean;
  ttl: boolean;
}

export interface CollectionModel {
  name: string;
  backend: PostgresBackend;
  statement: import('@coltanedb/parser').DefineCollectionStatement;
}

export type Catalog = Map<string, CollectionModel>;