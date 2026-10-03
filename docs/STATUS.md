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
  - `MultiBackendStoreAdapter`: Dynamic query routing across target database engines per collection `@backend` placement.
  - `RedisStoreAdapter`: KV family with strict `t:{tid}:` key prefix isolation, supporting `UpstashRestRedisClient` for native REST execution.
  - `TursoStoreAdapter`: SQLite family with injected `_tid` row isolation.
  - `SupabaseStoreAdapter`: Postgres family with strict `ct_<tid>` schema naming and hard guard against direct `public` schema access.
  - `MongoStoreAdapter`: Document family with mandatory `{ _tid }` document injection and query scoping.
  - `FirestoreStoreAdapter`: Document family with path-based isolation `tenants/{tid}/c/{collection}/d/{id}` powered by `firebase-admin` (v14.5) with discrete, JSON, base64, and file-path credential loading.
  - `FirebaseAdminAuthClient`: Direct integration with `firebase-admin/auth` verifying Google OAuth and Firebase ID tokens (`/api/v1/auth/firebase` and `Bearer` token verification).
- M3 API Layer: Hono-based API (`packages/api`) with API key generation/hashing (`colt_...`), Firebase Auth integration, project management, rate limiter, limits profiles, global kill-switch, and query executor passing queries through `TenantGuard` and `MultiBackendStoreAdapter`.
- Official Python SDK (`coltanedb`): Scaffolded at `packages/python/coltanedb` with `pyproject.toml` (setuptools build backend, SPDX `Apache-2.0`), bundled `LICENSE`, comprehensive `README.md`, `ColtaneClient` supporting HTTP query execution (`execute`, `plan`, `parse`, `status`), fluent query and schema builders, and unittest suite passing in CI. Built distributions `coltanedb-0.1.0-py3-none-any.whl` and `coltanedb-0.1.0.tar.gz` verified with `twine check` (PASSED). Added automated PyPI publishing workflow [`.github/workflows/publish-pypi.yml`](../.github/workflows/publish-pypi.yml) with PyPI Trusted Publishing (OIDC), root npm scripts (`python:test`, `python:build`, `python:check`), and complete step-by-step developer guide [`packages/python/coltanedb/PUBLISHING.md`](../packages/python/coltanedb/PUBLISHING.md).
- Production & Vercel Multi-Service Readiness: Configured `vercel.json` with multi-service architecture (`app` with `server.ts` entrypoint and internal service binding to `python` worker). Added `pnpm.overrides` for `"jwks-rsa>jose": "4.15.9"` in `package.json` and `pnpm-lock.yaml` resolving `ERR_REQUIRE_ESM` when `firebase-admin` loads `jwks-rsa` in Vercel Serverless Function runtime; `.vercelignore` isolates secret boundaries.
- Production Launch & HydraDB-Inspired Design System: Implemented complete 20-item launch checklist upgrade in `index.html` and `server.ts`:
  - Visual Aesthetics: Dark obsidian aesthetic inspired by HydraDB with interactive 3D kinetic constellation canvas (`<canvas id="kinetic-canvas">`), custom official vector logos for the Colt language (`colt-logo.svg`) and ColtaneDB platform (`coltanedb-logo.svg`), and mouse-tracking spotlight Bento grid architecture.
  - SEO & Discoverability: Dynamic unique page titles (<60 chars), meta descriptions (120-155 chars), full Open Graph and Twitter Card tags (`og-image.png`), complete favicon suite (`favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `site.webmanifest`), `robots.txt`, and `sitemap.xml`.
  - Legal & Privacy: Comprehensive Privacy Policy and Terms of Service views with explicit lawyer review callouts, alongside an interactive glassmorphic cookie & telemetry consent banner.
  - Mobile Responsiveness (390px Viewport): Input font sizes set to 16px to prevent iOS auto-zoom, all tap targets enlarged to >= 44px, zero horizontal overflow, and a persistent sticky mobile bottom CTA bar (`position: fixed; bottom: 0`).
  - Polish & Firebase Auth: Custom 404 router returning HTTP 404 status codes, thank-you confirmation card with one-click Tenant ID and API key copying, and Firebase Authentication dialog supporting Google OAuth, Email/Password sign-in, and alpha invite codes for project `coltanedb`.
- Dedicated Standalone Pages & Repository Policies:
  - `login.html`: Dedicated standalone Sign In / Sign Up page served at `/login`, `/signin`, and `/signup` with Google OAuth, Email/Password auth, and alpha invite token redemption.
  - `app.html`: Dedicated standalone Coltane Console & Studio application served at `/app`, `/dashboard`, `/studio`, `/table`, `/builder`, featuring visual metrics, Colt query editor with JIT execution, schema designer, and live data table explorer.
  - `docs.html`: Dedicated standalone documentation page served at `/docs` covering language specification, directives, mutations, and Python SDK integration.
  - `privacy.html`: Dedicated standalone Privacy Policy page served at `/privacy` with matching obsidian aesthetics, comprehensive legal clauses, and lawyer review notes.
  - `404.html`: Dedicated standalone 404 Error page served at `/404` and on any unrecognized route with diagnostic terminal simulator and quick recovery navigation routes.
  - `PRIVACY.md`: Full markdown Privacy Policy committed to repository root outlining data models, TenantGuard isolation, cloud subprocessors, and user data rights.
  - `README.md`: User-focused presentation highlighting capabilities, engine architecture, developer guide for writing `.colt` syntax, client SDK examples, dual licensing, and creator attribution to Ayush Bhattacharya (`info.cometlabs@gmail.com`).
- Production Execution & Workflow Features:
  - Working Import & Export: Complete client-side and server-supported import/export workflows for `.colt` query/schema declarations and `.json` data tables.
  - Secured Landing Experience: Landing page navbar streamlined with clean section navigation and direct console access; public tenant ID leakage completely eliminated.
  - Live Multi-Model Querying: `/api/v1/query` endpoint for direct raw Colt queries under TenantGuard isolation and multi-backend storage routing.
- Firebase Backend, Authentication & Firestore Integration:
  - Full modular Web SDK (`firebase` ^12.19.0) client helper (`firebase.ts` & `src/firebase.ts`) configured for project `coltanedb` and app ID `1:573404384111:web:9add23b082210d273b769a`.
  - Configured `firebase.json` for Email/Password and Google Sign-In identity providers, alongside `.firebaserc`.
  - Authored production-grade `firestore.rules` enforcing physical TenantGuard partition isolation (`tenants/{tenantId}/c/{collection}/d/{docId}`) and private user profile security (`users/{userId}`) adhering strictly to `firestore-rules-creation` directives and devil's advocate security testing.
  - Integrated `onAuthStateChanged` into both `login.html` and `app.html` to monitor session persistence and sync verified tokens with `/api/v1/auth/firebase`.
  - Added dedicated Firestore document template (`@backend(firestore)`) in the Colt Studio editor and live Firestore collection explorer in `app.html`.
- CI Workflow: Corrected `.nvmrc` Node.js version target from `2424` typo to `24`, unblocking GitHub Actions verification runs; added automated Python test step for `packages/python/coltanedb`.
- Clean credential posture: secrets live solely in `.env.local` (Git-ignored) and provider secret stores; `.env.example` updated with Supabase and Firebase placeholders; no provider credentials in tracked code or client bundles.

## Run and test

```sh
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Current test suite: **157 tests passing across 15 test files** (adapters, provider-plugin, compiler, parser, conformance, fuzz, lexer, tenant-guard, tenant-manager, tenant-context, api, firebase, cross-tenant-leak, m4-console, foundation).

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
