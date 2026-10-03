# ColtaneDB

<div align="center">

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Spec: CC-BY-4.0](https://img.shields.io/badge/Spec-CC--BY--4.0-emerald.svg)](spec/LICENSE)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://coltanedb.vercel.app)
[![Tests: Vitest 157/157](https://img.shields.io/badge/Tests-157%20Passed-brightgreen.svg)](tests/)

**The open-source, web-first multi-model database engine & query router powered by Colt.**

[Explore Live Web Studio](https://coltanedb.vercel.app) • [Read the Spec](docs/ARCHITECTURE.md) • [Privacy Policy](PRIVACY.md) • [Documentation](https://coltanedb.vercel.app/docs)

</div>

---

## ⚡ What is ColtaneDB?

**ColtaneDB** is a high-performance multi-model database engine, compiler, and intelligent query router built around **Colt**, a concise query language designed for unified access across data models.

Instead of forcing you to context-switch between disparate query languages, connection pools, and database management systems, ColtaneDB lets you write clean, unified `.colt` statements that transparently compile and route to specialized storage backends:
- **Key-Value Store**: Sub-millisecond reads/writes routed to **Upstash Redis**.
- **Relational & Document Tables**: ACID-compliant transactions and schema enforcement routed to **PostgreSQL / Supabase**.
- **Vector & Embeddings**: High-performance semantic indexes for AI workloads.

All executed under **TenantGuard**—our provable cryptographic multi-tenant isolation engine.

---

## 🚀 Key Capabilities

- **Unified Multi-Model Syntax**: Define, insert, and query relational tables, key-value caches, and documents in one elegant language.
- **Sub-Millisecond Caching Tier**: Built-in intelligent routing automatically utilizes high-speed Redis memory stores for instant response times.
- **Provable TenantGuard Isolation**: Strict AST-level verification guarantees complete data isolation between tenants, with zero cross-tenant query leakage.
- **Interactive Web Studio IDE**: Test queries, inspect compilation execution plans, examine abstract syntax trees (ASTs), and view execution diagnostics in real time at [coltanedb.vercel.app](https://coltanedb.vercel.app).
- **Visual Schema Designer & Table Explorer**: Visually architect schemas, generate `.colt` migration definitions, and inspect live tenant data.
- **Production Firebase Authentication**: Out-of-the-box Google Sign-In and Email/Password authentication that immediately provisions isolated tenant workspaces and API keys.
- **Multi-Language Client SDKs**: First-class support for Python (`coltanedb`), TypeScript/Node.js, and HTTP REST APIs.

---

## 🧠 How ColtaneDB Works

ColtaneDB acts as a query compiler, control plane, and routing layer:

```
                  ┌────────────────────────────────────────┐
                  │          Colt Query (.colt)            │
                  │  FIND users SELECT name WHERE id == 1  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Lexer, Parser & AST Builder      │
                  │   Validates syntax & semantic types    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       TenantGuard & Query Planner      │
                  │ Injects tenant boundaries & builds plan │
                  └───────────────────┬────────────────────┘
                                      │
                  ┌───────────────────┴────────────────────┐
                  │                                        │
                  ▼                                        ▼
    ┌───────────────────────────┐            ┌───────────────────────────┐
    │     Key-Value Cache       │            │     Relational Store      │
    │     (Upstash Redis)       │            │  (PostgreSQL / Supabase)  │
    └───────────────────────────┘            └───────────────────────────┘
```

1. **Parse & Validate**: Your `.colt` code is parsed into a strongly-typed AST, catching syntax errors and type mismatches ahead of time.
2. **Plan & Guard**: The query planner optimizes execution steps and applies **TenantGuard**, ensuring every read and write is cryptographically bound to your specific `tenantId`.
3. **Dispatch**: The query execution dispatcher routes queries to the optimal backend engine, delivering ultra-fast response times.

---

## 💻 Developer Guide: Writing in Colt

### 1. Defining a Collection
Colt schemas are clear, strongly typed, and support backend directives:

```colt
DEFINE COLLECTION users STRICT @backend(neon) {
  id: text @key,
  email: text @unique,
  name: text,
  tier: text @default("free"),
  created_at: timestamp @default(now)
}
```

### 2. Inserting Records (`PUT`)
Insert records with type validation:

```colt
PUT users:usr_101 {
  email: "developer@example.com",
  name: "Jane Doe",
  tier: "pro"
}
```

### 3. Querying Records (`FIND`)
Filter, project, order, and limit your data cleanly:

```colt
FIND users SELECT id, email, name
WHERE tier == "pro"
ORDER BY name ASC
LIMIT 25
```

---

## 🔌 SDK Integration

### Using Python (`coltanedb`)
Install the client package and run queries in seconds:

```bash
pip install coltanedb
```

```python
from coltanedb import ColtaneClient

# Initialize client with your Tenant API Key
client = ColtaneClient(
    api_key="clt_live_your_key_here",
    base_url="https://coltanedb.vercel.app"
)

# Execute query
response = client.query("""
    FIND users SELECT id, email, name
    WHERE tier == "pro"
""")

for user in response.data:
    print(f"User: {user['name']} ({user['email']})")
```

### Using HTTP REST API
Send raw `.colt` queries directly via standard HTTP requests:

```bash
curl -X POST https://coltanedb.vercel.app/api/v1/query \
  -H "Authorization: Bearer clt_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "FIND users SELECT id, email LIMIT 10"
  }'
```

---

## 🛠️ Local Development & Contributing

### Requirements
- **Node.js**: 24 LTS
- **Corepack & pnpm**: 10.34.6+
- **Python**: 3.8+ (for Python SDK development)

### Quickstart
Clone the repository and install dependencies:

```bash
git clone https://github.com/itsjustayush/ColtaneDB.git
cd ColtaneDB

# Install dependencies
corepack pnpm install

# Run the complete test suite (157 unit, fuzz, & integration tests)
corepack pnpm test

# Run code linter and typechecker
corepack pnpm lint
corepack pnpm typecheck

# Start local server with Web Studio
corepack pnpm start
```

Visit `http://localhost:3000` to launch the local Colt Studio.

---

## 📄 Documentation & Links

- **Live Application**: [https://coltanedb.vercel.app](https://coltanedb.vercel.app)
- **Privacy Policy**: [PRIVACY.md](PRIVACY.md) • [Web Version](https://coltanedb.vercel.app/privacy)
- **404 Route**: [coltanedb.vercel.app/404](https://coltanedb.vercel.app/404)
- **Project Brief**: [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Status & Milestones**: [docs/STATUS.md](docs/STATUS.md)

---

## ⚖️ License

- **Code & Engine**: [Apache-2.0 License](LICENSE).
- **Colt Language Specification**: [Creative Commons Attribution 4.0 International (CC-BY-4.0)](spec/LICENSE).

---

## 👤 Creator & Maintainer

Created and developed by:

**Ayush Bhattacharya**  
Email: [info.cometlabs@gmail.com](mailto:info.cometlabs@gmail.com)  
GitHub: [@itsjustayush](https://github.com/itsjustayush)