# ColtaneDB Python SDK (`coltanedb`)

Official Python client and query SDK for **ColtaneDB** — the multi-model database engine and the **Colt** (`.colt`) declarative query language.

---

## Installation

Install the package via pip:

```bash
pip install coltanedb
```

---

## Quickstart

### 1. Initialize the Client

```python
from coltanedb import ColtaneClient

# Connect to ColtaneDB server or local dev instance
client = ColtaneClient(
    base_url="http://localhost:3000",
    api_key="clt_live_your_api_key",
    tenant_id="tnt_your_project_id",
)
```

### 2. Execute a Colt Query

```python
result = client.execute("""
    FIND books SELECT title, author, views
    WHERE views > 10
    ORDER BY views DESC
    LIMIT 20
""")

print("Query success:", result.success)
print("Returned rows:", result.rows)
```

### 3. Parameterized Execution

Pass named parameters safely:

```python
result = client.execute(
    source="FIND users SELECT id, email WHERE email == $target_email",
    parameters={"target_email": "alice@example.com"}
)
```

### 4. Compile & Plan Queries

Inspect the multi-engine execution plan produced by the Colt compiler:

```python
plan = client.plan("""
    DEFINE COLLECTION articles STRICT @backend(neon) {
        id: uuid @key,
        title: text,
        published: time @default(now)
    }
""")

for step in plan.steps:
    print(f"Backend: {step.backend}")
    print(f"Operation: {step.operation}")
    print(f"Statement: {step.parameterized_statement}")
```

### 5. Parse Colt Source (AST)

```python
ast_result = client.parse("FIND products SELECT id, price")
print("AST Program:", ast_result.ast)
```

---

## License

Apache-2.0 © ColtaneDB Team
