# Project Status

Last updated: 2026-10-01

## Current milestone

M1 — Language core in progress. Colt v0.1 spec, EBNF, lexer, parser, semantic checks, parameterized PostgreSQL planner, CLI, conformance tests, and parser fuzz tests are present. The owner's merged web studio is retained as a local plan-only preview with import/export, sample-data table view, visual builder, docs, and light/dark theme. M2 TenantGuard, M3 authenticated API execution, and M4 full acceptance remain incomplete.

## Built

- Pinned Node.js 24 and pnpm 10.34.6 workspace foundation with frozen lockfile.
- TypeScript, ESLint, Vitest, and Turborepo task configuration; initial shared API-types package shell.
- Project governance, architecture, UI baseline, provider ledger, Supabase runbook gate, and ADR-0001 through ADR-0004.
- CI workflow for install, lint, typecheck, tests, and build.
- M1 compiler and CLI packages are implemented; Python client/builder/module CLI are present locally. PyPI publication has not occurred.
- Frontend and API are plan-only: no provider data reads/writes, authentication, TenantGuard, or real table explorer connections.
- Vercel deploy config uses the documented root `server.ts` entrypoint and bundles only `index.html` and `examples/library.colt` as server-read assets; `.vercelignore` excludes docs, Python, tests, repository metadata, and local secrets.
- GitHub CI now runs TypeScript checks plus the Python SDK unit suite.
- Owner-provided web IDE commit retained; responsive view switching, local sample-data labels, provider metadata privacy, and language/Python claims were corrected.
- Linked the Neon production branch and applied the private bucket/function policy. Existing `coltbucket` is private; `api` deployment 1 is active on Node 24.
- Neon env pull was disabled throughout; no Neon database/storage credentials were written to the workspace.
- Owner-provided local credentials are stored in Git-ignored `.env.local`; `.env.example` remains placeholder-only. Supabase and Firestore values remain placeholders because none were provided.
- The attached Firebase Admin service-account JSON is present locally and Git-ignored; it has not been read into application code or used for provider access.
- Apache-2.0 license was present before M0 and is preserved.

## Run and test

```sh
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

The root build currently runs TypeScript validation directly; package-level Turbo tasks are configured for when implementation packages are added.

Neon Function URL: https://br-red-morning-az62ssg7-api.compute.c-3.ap-southeast-1.aws.neon.tech/

## Not yet verified / blocked

- Latest local verification passed: frozen install, lint, strict typecheck, build, 122 TypeScript tests, and 4 Python unit tests.
- Python wheel build succeeded locally; it was not uploaded to PyPI.
- VS Code diagnostics reported no errors.
- Browser checks passed for all six routes, `.colt` import/export, theme toggle, and widths 390, 594, 768, 1024, and 1440px without horizontal document overflow.
- GitHub Actions has not rerun on the repaired tree. The supplied failure at `f97f55b` was caused by that commit deleting `.nvmrc`; `setup-node` failed before dependency installation. `.nvmrc`, `pnpm-workspace.yaml`, and the frozen lockfile are restored locally, and Node 24-compatible action majors plus Python tests are configured. These repairs remain uncommitted until the next push.
- Neon Function HTTP smoke test returned 200 with the expected greeting; no provider data operation was performed.
- Provider capability and capacity claims other than Vercel Node 24 runtime support are unverified.
- Supabase M6 is blocked until the owner reports a full backup, scratch restore, and row-count verification documented in `docs/RUNBOOK.md`.
- No execution endpoint, authentication, TenantGuard, provider adapters, integration tests, or cross-tenant leak suite is implemented. The current studio is intentionally read/plan-only.
- No real user data may be accepted.

## Decisions

- Product: ColtaneDB. Language and CLI: Colt / `colt`. Extension: `.colt`. Diagnostics: `COLT####`.
- Owner authorized continuing work through M4 and separately committed the early studio; this does not bypass M2/M3 authentication and TenantGuard gates before real database writes.
- M1 implements only normative Tier-1 syntax. See [ADR-0004](adr/0004-language-and-project-decisions.md).
- Supabase access is blocked pending owner-confirmed backup/restore evidence.
- Owner-approved Neon deployment is limited to `coltbucket` and the minimal `api` function; it does not change the v1 provider/adapter contract. See [ADR-0005](adr/0005-neon-project-bootstrap.md).

## Exact next step

Commit and push the local `.nvmrc`/workspace/workflow repairs, then rerun GitHub Actions. Continue M1 acceptance and implement M2 TenantGuard before enabling any database execution; keep the Supabase M6 backup/restore gate blocked.