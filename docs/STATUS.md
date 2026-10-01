# Project Status

Last updated: 2026-10-02

## Current milestone

M2 & M3 — Tenancy Core and API Layer in active validation. `TenantGuard`, `TenantManager`, in-memory and Neon adapters, API key authentication, project-scoped execution, rate limits, kill switch, and automated cross-tenant leak tests are implemented. The web studio operates as a plan and preview console. M6 (Supabase adapter) remains blocked pending backup/restore documentation in `docs/RUNBOOK.md`.

## Built

- Pinned Node.js 24 and pnpm 10.34.6 workspace foundation with frozen lockfile.
- TypeScript strict, ESLint, Vitest, and Turborepo monorepo configuration across `packages/*` (`parser`, `compiler`, `cli`, `tenant`, `api`, `api-types`).
- CI workflow for install, lint, typecheck, tests, and build.
- M1 Language Core: Colt v0.1 spec, EBNF grammar, lexer, parser, semantic analyzer, parameterized Postgres planner, CLI `colt` (`check`, `fmt`, `plan`, `run`), and extensive conformance test suite.
- M2 Tenancy Core: `TenantGuard`, `TenantManager`, opaque ID generation (`tnt_...`), in-memory fake adapter, and `NeonAdapter` implementing `ct_<tid>` schema and `SET LOCAL ROLE` isolation.
- M3 API Layer: Hono-based API (`packages/api`) with API key generation/hashing (`colt_...`), project management, rate limiter, limits profiles, global kill-switch, and query executor passing queries through `TenantGuard`.
- Cross-tenant leak test suite (`tests/cross-tenant-leak.test.ts`) verifying query isolation and security invariants.
- Web IDE preview: Colt editor, syntax formatting, plan visualizer, interactive visual builder, table explorer, and "Show Colt" toggle.
- Neon production branch link with private `coltbucket` and minimal `api` function deployed.
- Clean credential posture: secrets live solely in `.env.local` (Git-ignored) and provider secret stores; `.env.example` remains placeholder-only; no provider credentials in tracked code or client bundles.

## Run and test

```sh
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Current test suite: **144 tests passing across 12 test files** (compiler, parser, conformance, fuzz, lexer, tenant-guard, tenant-manager, tenant-context, api, cross-tenant-leak, m4-console, foundation).

## Not yet verified / blocked

- Supabase M6 access remains blocked until the owner records a full `pg_dump`, scratch restore, and row-count verification in `docs/RUNBOOK.md`.
- Real provider live connection tests for Turso, MongoDB Atlas, and Firestore require adapter contract test suites before enabling live writes.
- Upstash Redis adapter and QStash-driven outbox (M5) remain to be implemented.
- Provider plugin framework (M2.1) and capacity ledger (`docs/CAPACITY.md`) require updating with dated capacity verifications.

## Decisions

- Product: ColtaneDB. Language and CLI: Colt / `colt`. Extension: `.colt`. Diagnostics: `COLT####`.
- Single reference parser in TypeScript (`packages/parser`, `packages/compiler`) used across CLI, server, and web IDE; Python SDK queries server endpoints for execution.
- Turso accepted into SQLite family for v1.0 (M6.1); BYOD accepted for v1.0 (M12.1).
- Supabase access blocked pending owner-confirmed backup/restore evidence in `docs/RUNBOOK.md`.
- In-family spillover only (Neon ↔ Supabase for Postgres; Turso ↔ D1 for SQLite); cross-family spillover is forbidden automatically.

## Exact next step

Complete Part E responses for the owner, confirm open questions from Part D, formalize M2.1 provider plugin interfaces, and proceed with M4 UI Stage 0 component architecture while maintaining strict isolation gates.