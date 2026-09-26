import { elementType, type Language, type Signature, type ValueType } from './types.js';

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
  }
}

export function allStarterCode(sig: Signature): Record<Language, string> {
  return {
    python: starterCode(sig, 'python'),
    javascript: starterCode(sig, 'javascript'),
    java: starterCode(sig, 'java'),
    cpp: starterCode(sig, 'cpp'),
  };
}
