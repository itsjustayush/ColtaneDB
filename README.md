# ColtaneDB

ColtaneDB is an open-source, web-first backend platform built around Colt, a custom language for working across supported data models while routing execution to existing storage systems. It is a compiler, control plane, and query router, not a new storage engine.

The product name is **ColtaneDB**. The language and CLI are **Colt** / `colt`; source files use **`.colt`**. The repository is a pnpm workspace and is being built milestone by milestone. See [the project brief](docs/PROJECT_BRIEF.md), [architecture](docs/ARCHITECTURE.md), and [status](docs/STATUS.md).

The current web studio provides the Colt parser, semantic checks, PostgreSQL plan preview, a local sample-data table explorer, visual schema builder, documentation, and `.colt` import/export. It does not execute plans or connect to tenant databases. Authentication, TenantGuard, and the API execution path remain required before real writes. The Python client and builder are available locally but are not published to PyPI.

## Requirements

- Node.js 24 LTS
- Corepack and pnpm 10.34.6

## Development

```sh
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Use the ignored `.env.local` only for owner-managed local credentials; `.env.example` contains placeholders. Never commit credentials. To use the local Python package from the repository root, run `python -m pip install -e ./python` with Python 3.8 or later.

## License

- Code: Apache-2.0. See [LICENSE](LICENSE).
- Specification: Creative Commons Attribution 4.0 International (CC-BY-4.0). See [spec/LICENSE](spec/LICENSE).