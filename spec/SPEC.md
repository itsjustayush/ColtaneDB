# Colt Language Specification v0.1

Status: normative for the implemented M1 Tier-1 subset. Product: ColtaneDB. Language: Colt. Source extension: `.colt`. License: CC-BY-4.0. This specification does not describe support that the current implementation does not prove.


## 1. Design

Colt describes collections and data intent independently of storage syntax. A catalog supplies collection, field, type, policy, placement, and capability facts. The compiler parses source and produces diagnostics or a backend-neutral plan; it never connects to a provider, executes a plan, or embeds user values in query text.

## 2. Lexical rules

Keywords are case-insensitive and are tokenized in uppercase. Identifiers are ASCII and case-sensitive. Whitespace separates tokens. `--` begins a line comment; `/* ... */` begins a non-nesting block comment. Strings use double quotes and support `\\`, `\"`, `\n`, `\r`, `\t`, and `\uXXXX`. Unknown escapes and unterminated strings/comments produce diagnostics.

Equality and inequality are `==` and `!=`. Parameters use `$name`. Integers and decimal/exponent floats are decimal. Durations are a non-negative integer followed by `s`, `m`, `h`, or `d`. Time literals are ISO-8601 timestamps with a timezone. Identifiers may contain ASCII letters, digits after the first character, and `_`.

The lexer reserves keywords used by later milestones. Reserved forms include `LIVE`, `FETCH`, `NEAREST`, `SINCE`, `WINDOW`, `RELATE`, and edge-path arrows. They are not M1 AST constructs; the compiler reports `COLT2003` with the planned milestone.

## 3. Types and values

Primitive types are `uuid`, `text`, `int`, `float`, `bool`, `time`, `duration`, and `doc`. Parameterized types are `list<T>`, `link<Collection>`, and `vector(N)`. `T?` marks a field optional; fields are required otherwise. Missing optional values and explicit null have the same read behavior. There is no implicit type coercion.

Supported literal values are strings, integers, floats, booleans, null, parameters, durations, times, object literals, and list literals. Expressions support field/document paths, record references, function calls, unary negation/NOT, arithmetic, comparisons, and boolean operations. Precedence from lowest to highest is `OR`, `AND`, comparisons/`IN`, addition/subtraction, multiplication/division/remainder, unary, then primary/path access. Binary operators associate left-to-right.

Comparisons are two-valued: `null == null` is true, `null == x` for non-null `x` is false, and ordered comparisons with null are false. Number/string comparisons are false. Document paths use `a.b.c` and `a.b[0]`; a missing segment or indexing a non-object yields null. Applying a document path to a non-`doc` field is a semantic error. Null sorts last for both ascending and descending order.

## 4. Schema statements

`DEFINE COLLECTION name [STRICT|FLEXIBLE] annotations { fields }` defines a collection; omitted mode means STRICT. A field is `name: type? annotations`. `DEFINE EDGE` and `DEFINE POLICY` are reserved for later milestones and must not be represented as M1 AST nodes.

Annotations use `@name` or `@name(arguments)`. M1 recognizes the brief's schema annotations: `@key`, `@unique`, `@default(expr)`, `@index(kind, options)`, `@ttl(duration)`, `@storage(kind)`, `@timeseries(field)`, `@backend(name)`, and `@readonly`. The catalog/type checker validates argument count, value, and combinations.

`@default(expr)` applies only when the field is absent. It is evaluated exactly once per statement using the UTC server clock with microsecond precision and supplied to the adapter as a bound value. `@readonly` is assigned at creation, preserved by PUT, and cannot be changed by later writes.

## 5. Queries

M1 supports `FIND collection SELECT projection [WHERE expr] [ORDER BY field [ASC|DESC]] [LIMIT integer] [OFFSET integer]`. Projection entries are fields or document paths. `WHERE` is a boolean expression. Parameters remain separate from generated statements. Pagination values are non-negative integer literals in M1.

`FETCH`, `LIVE FIND`, `NEAREST`, `SINCE`, `WINDOW`, graph paths, aggregates, and cross-backend lookup are reserved and not implemented in M1. Use of a reserved construct reports `COLT2003`, not an unhandled parser exception.

## 6. Mutations

`PUT collection:key { field: expr, ... }` creates or replaces the entire record identified by an explicit key. It is idempotent and preserves fields annotated `@readonly`. `CREATE collection[:key] { ... }` is insert-only and reports a conflict if the key exists. If omitted, the key is generated only when the key field is UUID-typed. Both return the stored record with defaults applied and a `created` boolean.

`DELETE collection:key` deletes one record. `DELETE collection WHERE expr` deletes matching records. Bare `DELETE collection` and a WHERE expression that constant-folds to true are rejected. A missing record is idempotent and returns `{ deleted: 0 }`; otherwise the result is `{ deleted: n }`.

`SET`, `GET`, and `RELATE` are reserved until their implementation milestone. `ATOMIC { statements }` is parsed in M1. Its plan is allowed only when all enclosed supported statements resolve to one Postgres primary; cross-primary and unimplemented statements are coded errors. Execution is not performed by the M1 compiler.

## 7. Diagnostics and security

Every diagnostic has a stable code, message, source span, and actionable hint where appropriate. `COLT1xxx` denotes lexical/syntax errors, `COLT2xxx` semantic/capability errors, `COLT3xxx` policy/tenant errors, and `COLT4xxx` runtime/limit errors. Relevant reserved-code is `COLT2003`.

Collection and field identifiers are catalog-validated and safely quoted by code generation. Values are always bound parameters. The parser/compiler have no network, filesystem, environment, or provider access. Execution requires a separate runtime and tenant context.

## 8. Python interoperability

The normative parser/compiler is implemented once in TypeScript. The planned PyPI distribution is a Python SDK/client that submits Colt source through the authenticated ColtaneDB API, not a second independent parser or a direct database connection. Its API contract, packaging name, and publishing configuration are finalized with M3; no credentials or provider clients belong in `.colt` source.