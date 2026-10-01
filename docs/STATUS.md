# Project Status

Last updated: 2026-10-02

## Current milestone

M2 & M2.1 — Tenancy Core and Provider Plugin Framework completed. Multi-provider adapters implemented with strict tenant isolation. M3 authenticated API execution and M4 web console baseline in active advancement.

## Built

- Pinned Node.js 24 and pnpm 10.34.6 workspace foundation with frozen lockfile.
- TypeScript strict, ESLint, Vitest, and Turborepo monorepo configuration across `packages/*` (`parser`, `compiler`, `cli`, `tenant`, `api`, `api-types`).
- CI workflow for install, lint, typecheck, tests, and build.
- CLI binaries: both `colt` and `coltane` registered and executable (`check`, `fmt`, `plan`, `run`).
- Dual license established: Apache-2.0 for code ([`LICENSE`](../LICENSE)), Creative Commons Attribution 4.0 International for Colt spec ([`spec/LICENSE`](../spec/LICENSE)).
- M1 Language Core: Colt v0.1 spec, EBNF grammar, lexer, parser, semantic analyzer, parameterized Postgres planner, conformance suite, and parser fuzz testing.
- M2 Tenancy Core: `TenantGuard`, `TenantManager`, opaque ID generation (`tnt_...`), in-memory fake adapter, and `NeonAdapter` implementing `ct_<tid>` schema and `SET LOCAL ROLE` isolation.
- M2.1 Provider Plugin Framework: `ProviderRegistry`, family manifests (`postgres`, `sqlite`, `document`, `kv`, `object`), logical type maps, quota models, and strict D8 within-family spillover boundary enforcement.
- Multi-Provider Tenant Isolation Adapters:
  - `RedisStoreAdapter`: KV family with strict `t:{tid}:` key prefix isolation.
  - `TursoStoreAdapter`: SQLite family with injected `_tid` row isolation.
  - `SupabaseStoreAdapter`: Postgres family with strict `ct_<tid>` schema naming and hard guard against direct `public` schema access.
  - `MongoStoreAdapter`: Document family with mandatory `{ _tid }` document injection and query scoping.
  - `FirestoreStoreAdapter`: Document family with path-based isolation `tenants/{tid}/c/{collection}/d/{id}`.
- M3 API Layer: Hono-based API (`packages/api`) with API key generation/hashing (`colt_...`), project management, rate limiter, limits profiles, global kill-switch, and query executor passing queries through `TenantGuard`.
- Web IDE preview: Colt editor, syntax formatting, plan visualizer, interactive visual builder, table explorer, and "Show Colt" toggle.
- Clean credential posture: secrets live solely in `.env.local` (Git-ignored) and provider secret stores; `.env.example` remains placeholder-only; no provider credentials in tracked code or client bundles.

## Run and test

```sh
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Current test suite: **153 tests passing across 14 test files** (adapters, provider-plugin, compiler, parser, conformance, fuzz, lexer, tenant-guard, tenant-manager, tenant-context, api, cross-tenant-leak, m4-console, foundation).

## Not yet verified / blocked

- Real provider live connection tests for Turso, MongoDB Atlas, and Firestore require adapter contract test suites before enabling live writes.
- Upstash QStash-driven outbox and reconciliation jobs (M5) remain to be implemented.
- Provider capacity ledger (`docs/CAPACITY.md`) requires ongoing updates with dated capacity verifications.

## Decisions

- Product: ColtaneDB. Language and CLI: Colt / `colt` (with `coltane` binary alias). Extension: `.colt`. Diagnostics: `COLT####`.
- Dual license: Apache-2.0 for code, CC-BY-4.0 for language specification.
- Single reference parser in TypeScript (`packages/parser`, `packages/compiler`) used across CLI, server, and web IDE; Python SDK queries server endpoints for execution.
- Turso accepted into SQLite family for v1.0 (M6.1); BYOD accepted for v1.0 (M12.1).
- Supabase project verified as dedicated new project; SupabaseStoreAdapter enforces `ct_<tid>` isolation.
- Strict D8 family boundary: In-family spillover only (Neon ↔ Supabase for Postgres; Turso ↔ D1 for SQLite); cross-family spillover is forbidden automatically.

## Exact next step

Implement M5 Upstash QStash outbox sync and reconciliation, followed by M4 UI Stage 0 component architecture while maintaining strict isolation gates.
