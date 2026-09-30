import { describe, expect, it } from 'vitest';
import { compile } from '../packages/compiler/src/index.js';

const users = `DEFINE COLLECTION users STRICT @backend(neon) {
  id: uuid @key,
  email: text,
  nickname: text?,
  created: time @default(now)
}`;

describe('Colt compiler', () => {
  it('keeps query values out of PostgreSQL text and exposes parameter bindings', () => {
    const result = compile(`${users}
      FIND users SELECT email WHERE email == $email`);

    expect(result.diagnostics).toEqual([]);
    const query = result.plan?.steps[1];
    expect(query?.parameterizedStatement).not.toContain('secret@example.com');
    expect(query?.parameterizedStatement).toContain('IS NOT DISTINCT FROM $1');
    expect(query?.params).toEqual([{ kind: 'parameter', name: 'email' }]);
  });

  it('plans PUT as whole-record replacement and preserves readonly update exclusions', () => {
    const result = compile(`${users}
      PUT users:00000000-0000-4000-8000-000000000001 { email: "a@example.com" }`);

    expect(result.diagnostics).toEqual([]);
    const step = result.plan?.steps[1];
    expect(step?.parameterizedStatement).toContain('"nickname"');
    expect(step?.params).toContainEqual({ kind: 'constant', value: null });
    expect(step?.parameterizedStatement).toContain('ON CONFLICT');
  });

  it('rejects a constant-true collection delete', () => {
    const result = compile(`${users} DELETE users WHERE true`);

    expect(result.plan).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toContain('COLT2005');
  });

  it('rejects an ATOMIC block spanning primary backends', () => {
    const source = `${users}
      DEFINE COLLECTION events STRICT @backend(supabase) { id: uuid @key }
      ATOMIC {
        PUT users:00000000-0000-4000-8000-000000000001 { email: "a@example.com" }
        PUT events:00000000-0000-4000-8000-000000000002 {}
      }`;
    const result = compile(source);

    expect(result.plan).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toContain('COLT2016');
  });

  it('rejects unknown fields and missing required values', () => {
    const unknown = compile(`${users} FIND users SELECT emali`);
    const missing = compile(`${users} CREATE users {}`);

    expect(unknown.diagnostics.map(({ code }) => code)).toContain('COLT2004');
    expect(missing.diagnostics.map(({ code }) => code)).toContain('COLT2014');
  });

  it('binds statement-time defaults instead of embedding server clock expressions', () => {
    const result = compile(`${users} CREATE users { email: "a@example.com" }`);
    const create = result.plan?.steps[1];

    expect(result.diagnostics).toEqual([]);
    expect(create?.parameterizedStatement).not.toContain('now()');
    expect(create?.params).toContainEqual({ kind: 'default', expression: 'now' });
  });

  it('emulates two-valued ordered comparisons and heterogeneous comparisons', () => {
    const nullComparison = compile(`${users} FIND users SELECT email WHERE email > null`);
    const mismatched = compile(`DEFINE COLLECTION metrics { id: uuid @key, count: int }
      FIND metrics SELECT count WHERE count == "two"`);

    expect(nullComparison.plan?.steps[1].parameterizedStatement).toContain('COALESCE(');
    expect(mismatched.plan?.steps[1].parameterizedStatement).toContain('WHERE FALSE');
  });
});