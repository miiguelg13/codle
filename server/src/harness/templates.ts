import { elementType, LANGUAGES, type Language, type Signature, type ValueType } from './types.js';

export function pythonType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `List[${pythonType(el)}]`;
  return { int: 'int', long: 'int', double: 'float', bool: 'bool', string: 'str' }[t as 'int'];
}

export function jsDocType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `${jsDocType(el)}[]`;
  return { int: 'number', long: 'number', double: 'number', bool: 'boolean', string: 'string' }[t as 'int'];
}

export function javaType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `${javaType(el)}[]`;
  return { int: 'int', long: 'long', double: 'double', bool: 'boolean', string: 'String' }[t as 'int'];
}

export function cppType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `vector<${cppType(el)}>`;
  return { int: 'int', long: 'long long', double: 'double', bool: 'bool', string: 'string' }[t as 'int'];
}

export function goType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `[]${goType(el)}`;
  return { int: 'int', long: 'int', double: 'float64', bool: 'bool', string: 'string' }[t as 'int'];
}

export function rustType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `Vec<${rustType(el)}>`;
  return { int: 'i32', long: 'i64', double: 'f64', bool: 'bool', string: 'String' }[t as 'int'];
}

export function csharpType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `${csharpType(el)}[]`;
  return { int: 'int', long: 'long', double: 'double', bool: 'bool', string: 'string' }[t as 'int'];
}

export function tsType(t: ValueType): string {
  const el = elementType(t);
  if (el) return `${tsType(el)}[]`;
  return { int: 'number', long: 'number', double: 'number', bool: 'boolean', string: 'string' }[t as 'int'];
}

/** twoSum -> two_sum (convención de Rust) */
export function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** twoSum -> TwoSum (convención de C#) */
export function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function cppParam(t: ValueType, name: string): string {
  return elementType(t) ? `${cppType(t)}& ${name}` : `${cppType(t)} ${name}`;
}

export function starterCode(sig: Signature, lang: Language): string {
  const { functionName: fn, params, returnType: ret } = sig;
  switch (lang) {
    case 'python':
      return [
        'from typing import List',
        '',
        '',
        'class Solution:',
        `    def ${fn}(self${params.map((p) => `, ${p.name}: ${pythonType(p.type)}`).join('')}) -> ${pythonType(ret)}:`,
        '        pass',
        '',
      ].join('\n');
    case 'javascript':
      return [
        '/**',
        ...params.map((p) => ` * @param {${jsDocType(p.type)}} ${p.name}`),
        ` * @return {${jsDocType(ret)}}`,
        ' */',
        `function ${fn}(${params.map((p) => p.name).join(', ')}) {`,
        '    ',
        '}',
        '',
      ].join('\n');
    case 'java':
      return [
        'class Solution {',
        `    public ${javaType(ret)} ${fn}(${params.map((p) => `${javaType(p.type)} ${p.name}`).join(', ')}) {`,
        '        ',
        '    }',
        '}',
        '',
      ].join('\n');
    case 'cpp':
      return [
        'class Solution {',
        'public:',
        `    ${cppType(ret)} ${fn}(${params.map((p) => cppParam(p.type, p.name)).join(', ')}) {`,
        '        ',
        '    }',
        '};',
        '',
      ].join('\n');
    case 'go':
      return [
        `func ${fn}(${params.map((p) => `${p.name} ${goType(p.type)}`).join(', ')}) ${goType(ret)} {`,
        '    ',
        '}',
        '',
      ].join('\n');
    case 'rust':
      return [
        'impl Solution {',
        `    pub fn ${snakeCase(fn)}(${params.map((p) => `${snakeCase(p.name)}: ${rustType(p.type)}`).join(', ')}) -> ${rustType(ret)} {`,
        '        ',
        '    }',
        '}',
        '',
      ].join('\n');
    case 'csharp':
      return [
        'public class Solution {',
        `    public ${csharpType(ret)} ${pascalCase(fn)}(${params.map((p) => `${csharpType(p.type)} ${p.name}`).join(', ')}) {`,
        '        ',
        '    }',
        '}',
        '',
      ].join('\n');
    case 'typescript':
      return [
        `function ${fn}(${params.map((p) => `${p.name}: ${tsType(p.type)}`).join(', ')}): ${tsType(ret)} {`,
        '    ',
        '}',
        '',
      ].join('\n');
  }
}

export function allStarterCode(sig: Signature): Record<Language, string> {
  return Object.fromEntries(LANGUAGES.map((l) => [l, starterCode(sig, l)])) as Record<Language, string>;
}
