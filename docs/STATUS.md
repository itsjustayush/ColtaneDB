# Project Status

Last updated: 2026-09-30

## Current milestone

M0 — Foundations. Web Studio & Official Web IDE complete: Supabase-inspired dashboard and landing page, dark/light mode toggle, in-browser Colt compiler/planner with line gutter, No-Code Visual Schema & Query Builder, Table Explorer, Colt Language Documentation (/docs), .colt file import & export, Python pip package architecture (`coltane` with client, builder, CLI), Neon function proxy, and vercel.json deployment configuration. All 118 unit and conformance tests passing. Fixed client-side script lifecycle reference so line numbers and view switcher resolve safely upon initial hash load. Owner-approved Neon bootstrap is complete.

## Built

- Pinned Node.js 24 and pnpm 10.34.6 workspace foundation with frozen lockfile.
- TypeScript, ESLint, Vitest, and Turborepo task configuration; initial shared API-types package shell.
- Project governance, architecture, UI baseline, provider ledger, Supabase runbook gate, and ADR-0001 through ADR-0004.
- CI workflow for install, lint, typecheck, tests, and build.
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

- Local verification passed: frozen install, lint, typecheck, test (1 test), and build.
- VS Code diagnostics reported no errors.
- GitHub Actions has not run; CI is configured but awaits the first push/PR.
- Neon Function HTTP smoke test returned 200 with the expected greeting; no provider data operation was performed.
- Provider capability and capacity claims other than Vercel Node 24 runtime support are unverified.
- Supabase M6 is blocked until the owner reports a full backup, scratch restore, and row-count verification documented in `docs/RUNBOOK.md`.
- No compiler, API behavior, adapters, UI, integration tests, or leak tests are implemented yet.
- No real user data may be accepted.

## Decisions

- Product: ColtaneDB. Language and CLI: Colt / `colt`. Extension: `.colt`. Diagnostics: `COLT####`.
- M0–M3 are API/CLI only; UI Stage 0 begins at M4.
- Owner confirmed to preserve milestone order; no UI Stage 0 before M1–M3. Owner also confirmed authentication and TenantGuard gates remain required before real database writes.
- M1 implements only normative Tier-1 syntax. See [ADR-0004](adr/0004-language-and-project-decisions.md).
- Supabase access is blocked pending owner-confirmed backup/restore evidence.
- Owner-approved Neon deployment is limited to `coltbucket` and the minimal `api` function; it does not change the v1 provider/adapter contract. See [ADR-0005](adr/0005-neon-project-bootstrap.md).

## Exact next step

Run the configured workflow on the first push/PR and resolve any CI-only failure. Once CI is green, request approval before beginning M1.