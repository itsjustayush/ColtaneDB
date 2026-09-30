# ColtaneDB

ColtaneDB is an open-source, web-first backend platform built around Colt, a custom language for working across supported data models while routing execution to existing storage systems. It is a compiler, control plane, and query router, not a new storage engine.

The product name is **ColtaneDB**. The language and CLI are **Colt** / `colt`; source files use **`.colt`**. The repository is a pnpm workspace and is being built milestone by milestone. See [the project brief](docs/PROJECT_BRIEF.md), [architecture](docs/ARCHITECTURE.md), and [status](docs/STATUS.md).

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

M0 establishes repository foundations only. No provider credentials or services are needed. Never put real credentials in source control; `.env.example` contains placeholders, and `.env*` files are ignored except that template.

## License

Apache-2.0. See [LICENSE](LICENSE).