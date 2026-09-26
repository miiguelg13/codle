export const VALUE_TYPES = [
  'int',
  'long',
  'double',
  'bool',
  'string',
  'int[]',
  'long[]',
  'double[]',
  'bool[]',
  'string[]',
  'int[][]',
  'string[][]',
] as const;

export type ValueType = (typeof VALUE_TYPES)[number];

export const LANGUAGES = ['python', 'javascript', 'java', 'cpp'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Param {
  name: string;
  type: ValueType;
}

export interface Signature {
  functionName: string;
  params: Param[];
  returnType: ValueType;
}

export type CompareMode = 'exact' | 'unordered' | 'unordered-deep';

export interface TestCase {
  input: unknown[]; // un valor por parámetro, en orden
  output: unknown;
}

export function isValueType(t: string): t is ValueType {
  return (VALUE_TYPES as readonly string[]).includes(t);
}

export function elementType(t: ValueType): ValueType | null {
  return t.endsWith('[]') ? (t.slice(0, -2) as ValueType) : null;
}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

export function validateValue(value: unknown, type: ValueType, path = 'value'): string | null {
  const el = elementType(type);
  if (el) {
    if (!Array.isArray(value)) return `${path}: se esperaba un array (${type})`;
    for (let i = 0; i < value.length; i++) {
      const err = validateValue(value[i], el, `${path}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  switch (type) {
    case 'int':
      if (!Number.isInteger(value) || (value as number) < INT_MIN || (value as number) > INT_MAX)
        return `${path}: se esperaba int de 32 bits`;
      return null;
    case 'long':
      if (!Number.isSafeInteger(value)) return `${path}: se esperaba un entero (long) seguro`;
      return null;
    case 'double':
      if (typeof value !== 'number' || !Number.isFinite(value)) return `${path}: se esperaba un número`;
      return null;
    case 'bool':
      if (typeof value !== 'boolean') return `${path}: se esperaba boolean`;
      return null;
    case 'string':
      if (typeof value !== 'string') return `${path}: se esperaba string`;
      return null;
    default:
      return `${path}: tipo desconocido ${type}`;
  }
}

export function validateSignature(sig: Signature): string | null {
  const ident = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!ident.test(sig.functionName)) return 'functionName no es un identificador válido';
  const seen = new Set<string>();
  for (const p of sig.params) {
    if (!ident.test(p.name)) return `Parámetro inválido: ${p.name}`;
    if (seen.has(p.name)) return `Parámetro repetido: ${p.name}`;
    seen.add(p.name);
    if (!isValueType(p.type)) return `Tipo inválido: ${p.type}`;
  }
  if (!isValueType(sig.returnType)) return `Tipo de retorno inválido: ${sig.returnType}`;
  return null;
}

export function validateTestCase(sig: Signature, tc: TestCase, label: string): string | null {
  if (!Array.isArray(tc.input) || tc.input.length !== sig.params.length)
    return `${label}: input debe tener ${sig.params.length} valores`;
  for (let i = 0; i < sig.params.length; i++) {
    const err = validateValue(tc.input[i], sig.params[i].type, `${label}.${sig.params[i].name}`);
    if (err) return err;
  }
  return validateValue(tc.output, sig.returnType, `${label}.output`);
}
