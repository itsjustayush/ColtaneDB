import type {
  AtomicStatement,
  DefineCollectionStatement,
  Expression,
  FieldDefinition,
  FieldPath,
  RecordId,
  Statement,
  TypeDefinition,
} from '@coltanedb/parser';
import { parse } from '@coltanedb/parser';
import { generateStatement, backendFor } from './postgres.js';
import type { Catalog, CompileResult, CompilerDiagnostic, CollectionModel, ExecutionPlan } from './types.js';

const knownAnnotations = new Set([
  'key', 'unique', 'default', 'index', 'ttl', 'storage', 'timeseries', 'backend', 'readonly',
]);

function diagnostic(
  diagnostics: CompilerDiagnostic[],
  code: string,
  message: string,
  span: import('@coltanedb/parser').SourceSpan,
  hint?: string,
): void {
  diagnostics.push({ code, message, span, hint });
}

function fieldFor(model: CollectionModel, name: string): FieldDefinition | undefined {
  return model.statement.fields.find((field) => field.name === name);
}

function validateAnnotations(model: CollectionModel, diagnostics: CompilerDiagnostic[]): void {
  const names = new Set<string>();
  for (const annotation of model.statement.annotations) {
    if (!knownAnnotations.has(annotation.name)) {
      diagnostic(diagnostics, 'COLT2008', `Unknown annotation @${annotation.name}.`, annotation.span);
    }
  }
  for (const field of model.statement.fields) {
    if (names.has(field.name)) {
      diagnostic(diagnostics, 'COLT2007', `Duplicate field ${field.name}.`, field.span);
    }
    names.add(field.name);
    const annotationNames = new Set<string>();
    for (const annotation of field.annotations) {
      if (!knownAnnotations.has(annotation.name)) {
        diagnostic(diagnostics, 'COLT2008', `Unknown annotation @${annotation.name}.`, annotation.span);
      }
      if (annotationNames.has(annotation.name)) {
        diagnostic(diagnostics, 'COLT2009', `Duplicate annotation @${annotation.name}.`, annotation.span);
      }
      annotationNames.add(annotation.name);
    }
    if (field.valueType.kind === 'vector' && (!field.valueType.dimension || field.valueType.dimension < 1)) {
      diagnostic(diagnostics, 'COLT2010', 'Vector dimensions must be a positive integer.', field.valueType.span);
    }
  }

  const keyFields = model.statement.fields.filter((field) => field.annotations.some((item) => item.name === 'key'));
  if (keyFields.length !== 1) {
    diagnostic(diagnostics, 'COLT2011', 'A collection must declare exactly one @key field.', model.statement.span);
  }
}

function validatePath(path: FieldPath, model: CollectionModel, diagnostics: CompilerDiagnostic[]): FieldDefinition | undefined {
  const field = fieldFor(model, path.root);
  if (!field) {
    diagnostic(diagnostics, 'COLT2004', `Unknown field ${path.root} on collection ${model.name}.`, path.span);
    return undefined;
  }
  if (path.segments.length > 0 && !(field.valueType.kind === 'primitive' && field.valueType.name === 'doc')) {
    diagnostic(diagnostics, 'COLT2012', `Document path ${path.root} is only valid on a doc field.`, path.span);
  }
  return field;
}

function validateExpression(
  expression: Expression,
  model: CollectionModel,
  catalog: Catalog,
  diagnostics: CompilerDiagnostic[],
): void {
  switch (expression.type) {
    case 'FieldPath':
      validatePath(expression, model, diagnostics);
      return;
    case 'RecordReference':
      if (!catalog.has(expression.id.collection)) {
        diagnostic(diagnostics, 'COLT2002', `Unknown collection ${expression.id.collection}.`, expression.span);
      }
      return;
    case 'Unary':
      validateExpression(expression.operand, model, catalog, diagnostics);
      return;
    case 'Binary':
      validateExpression(expression.left, model, catalog, diagnostics);
      validateExpression(expression.right, model, catalog, diagnostics);
      return;
    case 'Call':
      if (expression.name.toLowerCase() !== 'now' || expression.args.length !== 0) {
        diagnostic(diagnostics, 'COLT2013', `Function ${expression.name} is not available in the M1 subset.`, expression.span);
      }
      for (const argument of expression.args) validateExpression(argument, model, catalog, diagnostics);
      return;
    case 'ObjectLiteral':
      for (const item of expression.fields) validateExpression(item.value, model, catalog, diagnostics);
      return;
    case 'ListLiteral':
      for (const item of expression.items) validateExpression(item, model, catalog, diagnostics);
      return;
    case 'NamedArgument':
      validateExpression(expression.value, model, catalog, diagnostics);
      return;
    case 'Literal':
    case 'NumberLiteral':
    case 'DurationLiteral':
    case 'TimeLiteral':
    case 'Parameter':
      return;
  }
}

const literalTypeNames: Readonly<Record<string, string>> = {
  integer: 'int',
  float: 'float',
  string: 'text',
  bool: 'bool',
  null: 'null',
  uuid: 'uuid',
};

function literalTypeName(kind: string): string {
  return literalTypeNames[kind] ?? kind;
}

function expressionType(expression: Expression, model: CollectionModel): string | undefined {
  if (expression.type === 'Literal') return literalTypeName(expression.kind);
  if (expression.type === 'NumberLiteral') return literalTypeName(expression.kind);
  if (expression.type === 'DurationLiteral') return 'duration';
  if (expression.type === 'TimeLiteral') return 'time';
  if (expression.type === 'ObjectLiteral') return 'doc';
  if (expression.type === 'ListLiteral') return 'list';
  if (expression.type === 'RecordReference') return `link<${expression.id.collection}>`;
  if (expression.type === 'Parameter') return undefined;
  if (expression.type === 'FieldPath') {
    const field = fieldFor(model, expression.root);
    if (!field) return undefined;
    if (expression.segments.length > 0) return 'doc';
    return typeName(field.valueType);
  }
  if (expression.type === 'Call' && expression.name.toLowerCase() === 'now') return 'time';
  if (expression.type === 'Unary') return expression.operator === 'NOT' ? 'bool' : expressionType(expression.operand, model);
  if (expression.type === 'Binary') {
    return ['==', '!=', '<', '<=', '>', '>=', 'AND', 'OR', 'IN'].includes(expression.operator)
      ? 'bool'
      : expressionType(expression.left, model);
  }
  if (expression.type === 'NamedArgument') return expressionType(expression.value, model);
  return undefined;
}

function typeName(valueType: TypeDefinition): string {
  if (valueType.kind === 'primitive') return valueType.name ?? 'unknown';
  if (valueType.kind === 'list') return 'list';
  if (valueType.kind === 'link') return `link<${valueType.name}>`;
  return 'vector';
}

function validateAssignment(
  field: FieldDefinition,
  expression: Expression,
  model: CollectionModel,
  diagnostics: CompilerDiagnostic[],
): void {
  if (expression.type === 'Parameter') return;
  if (expression.type === 'Literal' && expression.value === null) {
    if (!field.optional) diagnostic(diagnostics, 'COLT2018', `Required field ${field.name} cannot be null.`, expression.span);
    return;
  }
  const expected = typeName(field.valueType);
  const actual = expressionType(expression, model);
  const compatible =
    actual === undefined ||
    actual === expected ||
    (field.valueType.kind === 'primitive' && field.valueType.name === 'doc' && actual === 'doc') ||
    (field.valueType.kind === 'list' && actual === 'list') ||
    (field.valueType.kind === 'vector' && actual === 'list');
  if (!compatible) {
    diagnostic(diagnostics, 'COLT2018', `Value for ${field.name} has type ${actual}; expected ${expected}.`, expression.span);
  }
  if (field.valueType.kind === 'vector' && expression.type === 'ListLiteral' && expression.items.length !== field.valueType.dimension) {
    diagnostic(diagnostics, 'COLT2019', `Vector field ${field.name} requires ${field.valueType.dimension} values.`, expression.span);
  }
}

function constantValue(expression: Expression): unknown {
  switch (expression.type) {
    case 'Literal': return expression.value;
    case 'NumberLiteral': return Number(expression.raw);
    case 'DurationLiteral':
    case 'TimeLiteral':
    case 'Parameter':
    case 'FieldPath':
    case 'RecordReference':
    case 'Call':
    case 'ObjectLiteral':
    case 'ListLiteral':
    case 'NamedArgument':
      return undefined;
    case 'Unary': {
      const value = constantValue(expression.operand);
      if (expression.operator === 'NOT' && typeof value === 'boolean') return !value;
      if (expression.operator === '-' && typeof value === 'number') return -value;
      return undefined;
    }
    case 'Binary': {
      const left = constantValue(expression.left);
      const right = constantValue(expression.right);
      if (left === undefined || right === undefined) return undefined;
      switch (expression.operator) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': return left !== null && right !== null && (left as number) < (right as number);
        case '<=': return left !== null && right !== null && (left as number) <= (right as number);
        case '>': return left !== null && right !== null && (left as number) > (right as number);
        case '>=': return left !== null && right !== null && (left as number) >= (right as number);
        case 'AND': return left === true && right === true;
        case 'OR': return left === true || right === true;
        case '+': return typeof left === 'number' && typeof right === 'number' ? left + right : undefined;
        case '-': return typeof left === 'number' && typeof right === 'number' ? left - right : undefined;
        case '*': return typeof left === 'number' && typeof right === 'number' ? left * right : undefined;
        case '/': return typeof left === 'number' && typeof right === 'number' && right !== 0 ? left / right : undefined;
        case '%': return typeof left === 'number' && typeof right === 'number' && right !== 0 ? left % right : undefined;
        case 'IN': return Array.isArray(right) ? right.includes(left) : undefined;
      }
    }
  }
}

function validateRecordFields(
  fields: Array<{ name: string; value: Expression; span: import('@coltanedb/parser').SourceSpan }>,
  model: CollectionModel,
  catalog: Catalog,
  diagnostics: CompilerDiagnostic[],
  externallySupplied: ReadonlySet<string> = new Set(),
): void {
  const supplied = new Set<string>();
  for (const item of fields) {
    if (supplied.has(item.name)) {
      diagnostic(diagnostics, 'COLT2007', `Field ${item.name} is assigned more than once.`, item.span);
    }
    supplied.add(item.name);
    if (!fieldFor(model, item.name)) {
      diagnostic(diagnostics, 'COLT2004', `Unknown field ${item.name} on collection ${model.name}.`, item.span);
    }
    validateExpression(item.value, model, catalog, diagnostics);
  }
  for (const field of model.statement.fields) {
    const hasDefault = field.annotations.some((annotation) => annotation.name === 'default');
    if (!field.optional && !hasDefault && !supplied.has(field.name) && !externallySupplied.has(field.name)) {
      diagnostic(diagnostics, 'COLT2014', `Required field ${field.name} is missing.`, model.statement.span);
    }
  }
}

function validateWrite(
  statement: Extract<Statement, { type: 'Put' | 'Create' }>,
  model: CollectionModel,
  catalog: Catalog,
  diagnostics: CompilerDiagnostic[],
): void {
  const primary = model.statement.fields.find((field) => field.annotations.some((annotation) => annotation.name === 'key'));
  const generatedKey = statement.type === 'Create' && !statement.id && primary?.valueType.kind === 'primitive' && primary.valueType.name === 'uuid';
  const externalKey = statement.type === 'Put' || statement.id || generatedKey ? new Set(primary ? [primary.name] : []) : new Set<string>();
  validateRecordFields(statement.fields, model, catalog, diagnostics, externalKey);
  for (const item of statement.fields) {
    const field = fieldFor(model, item.name);
    if (field) validateAssignment(field, item.value, model, diagnostics);
  }
  if (statement.type === 'Put') validateRecordId(statement.id, model, diagnostics);
  if (statement.type === 'Create') {
    if (statement.id) validateRecordId(statement.id, model, diagnostics);
    else if (!generatedKey) {
      diagnostic(diagnostics, 'COLT2017', 'CREATE without a record id requires a UUID key field.', statement.span);
    }
  }
}

function validateOperation(
  statement: Exclude<Statement, { type: 'DefineCollection' | 'Atomic' }>,
  model: CollectionModel,
  catalog: Catalog,
  diagnostics: CompilerDiagnostic[],
): void {
  if (statement.type === 'Find') {
    for (const path of statement.projection) validatePath(path, model, diagnostics);
    if (statement.orderBy) validatePath(statement.orderBy.field, model, diagnostics);
    if (statement.where) validateExpression(statement.where, model, catalog, diagnostics);
    return;
  }
  if (statement.type === 'Put' || statement.type === 'Create') {
    validateWrite(statement, model, catalog, diagnostics);
    return;
  }
  if (statement.target.kind === 'record') {
    validateRecordId(statement.target.id, model, diagnostics);
  } else {
    validateExpression(statement.target.expression, model, catalog, diagnostics);
    if (constantValue(statement.target.expression) === true) {
      diagnostic(diagnostics, 'COLT2005', 'DELETE WHERE cannot be a constant expression that evaluates to true.', statement.target.expression.span);
    }
  }
}

function collectionFor(statement: Statement): string | undefined {
  if (statement.type === 'Find') return statement.collection;
  if (statement.type === 'Put') return statement.id.collection;
  if (statement.type === 'Create') return statement.collection;
  if (statement.type === 'Delete') return statement.target.kind === 'record'
    ? statement.target.id.collection
    : statement.target.collection;
  return undefined;
}

function validateRecordId(id: RecordId, model: CollectionModel, diagnostics: CompilerDiagnostic[]): void {
  const key = model.statement.fields.find((field) => field.annotations.some((annotation) => annotation.name === 'key'));
  if (!key) return;
  if (key.valueType.kind === 'primitive' && key.valueType.name === 'uuid' && !/^[0-9a-f-]{36}$/i.test(id.key)) {
    diagnostic(diagnostics, 'COLT2015', `Record key for ${id.collection} must be a UUID.`, id.span);
  }
}

function validateAtomic(statement: AtomicStatement, catalog: Catalog, diagnostics: CompilerDiagnostic[]): CollectionModel | undefined {
  const models = statement.statements.map((child) => {
    const name = collectionFor(child);
    return name ? catalog.get(name) : undefined;
  });
  if (models.some((model) => model === undefined)) {
    for (const child of statement.statements) {
      const name = collectionFor(child);
      if (name && !catalog.has(name)) {
        diagnostic(diagnostics, 'COLT2002', `Unknown collection ${name}.`, child.span);
      }
    }
    return undefined;
  }
  const resolved = models as CollectionModel[];
  const first = resolved[0];
  if (resolved.some((model) => model.backend !== first.backend)) {
    diagnostic(diagnostics, 'COLT2016', 'ATOMIC cannot span multiple primary backends.', statement.span);
    return undefined;
  }
  if (first.backend !== 'neon' && first.backend !== 'supabase') {
    diagnostic(diagnostics, 'COLT2001', `ATOMIC transactions are not supported on ${first.backend}.`, statement.span);
    return undefined;
  }
  for (const child of statement.statements) {
    const childModel = catalog.get(collectionFor(child)!);
    validateOperation(child, childModel!, catalog, diagnostics);
  }
  return first;
}

function compileAtomic(statement: AtomicStatement, catalog: Catalog, model: CollectionModel) {
  const substeps = statement.statements.map((child) => {
    const childModel = catalog.get(collectionFor(child)!);
    return generateStatement(child, childModel!);
  });
  return { backend: model.backend, operation: 'transaction' as const, collection: model.name, substeps, span: statement.span };
}

export function compile(source: string, initialCatalog: ReadonlyMap<string, CollectionModel> = new Map()): CompileResult {
  const parsed = parse(source);
  const diagnostics: CompilerDiagnostic[] = parsed.diagnostics.map(({ code, message, span }) => ({ code, message, span }));
  const catalog: Catalog = new Map(initialCatalog);
  const steps: ExecutionPlan['steps'] = [];

  for (const statement of parsed.program.statements) {
    if (statement.type === 'DefineCollection') {
      const backendAnnotation = statement.annotations.find((annotation) => annotation.name === 'backend');
      const backend = backendFor(statement);
      if (backendAnnotation && !backend) {
        diagnostic(diagnostics, 'COLT2001', 'M1 Postgres code generation supports only @backend(neon) and @backend(supabase).', backendAnnotation.span);
        continue;
      }
      if (catalog.has(statement.name)) {
        diagnostic(diagnostics, 'COLT2006', `Collection ${statement.name} is already defined.`, statement.span);
        continue;
      }
      const model: CollectionModel = { name: statement.name, backend: backend ?? 'neon', statement };
      const diagnosticCount = diagnostics.length;
      validateAnnotations(model, diagnostics);
      if (diagnostics.length !== diagnosticCount) continue;
      catalog.set(model.name, model);
      steps.push(generateStatement(statement, model));
      continue;
    }

    if (statement.type === 'Atomic') {
      const model = validateAtomic(statement, catalog, diagnostics);
      if (model) steps.push(compileAtomic(statement, catalog, model));
      continue;
    }

    const name = collectionFor(statement);
    const model = name ? catalog.get(name) : undefined;
    if (!name || !model) {
      diagnostic(diagnostics, 'COLT2002', `Unknown collection ${name ?? ''}.`.trim(), statement.span);
      continue;
    }

    validateOperation(statement, model, catalog, diagnostics);

    steps.push(generateStatement(statement, model));
  }

  if (diagnostics.length > 0) return { diagnostics };
  return { plan: { steps }, diagnostics };
}
