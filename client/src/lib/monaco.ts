import { loader, type BeforeMount } from '@monaco-editor/react';

export const MONACO_VERSION = '0.52.2';

loader.config({ paths: { vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs` } });

export const defineCodleTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('codle-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7489', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'a5d6a7' },
      { token: 'number', foreground: 'f5c16c' },
      { token: 'type', foreground: '82aaff' },
    ],
    colors: {
      'editor.background': '#12161f',
      'editor.lineHighlightBackground': '#1a2030',
      'editorLineNumber.foreground': '#3b4459',
      'editorLineNumber.activeForeground': '#8b93a7',
      'editorGutter.background': '#12161f',
      'editor.selectionBackground': '#2b3a55',
      'editorCursor.foreground': '#6fcf73',
      'editorIndentGuide.background1': '#1f2533',
    },
  });
  monaco.editor.defineTheme('codle-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a92a3', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8e3bbd' },
      { token: 'string', foreground: '2f7d32' },
      { token: 'number', foreground: 'b25f00' },
      { token: 'type', foreground: '2f5fb3' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#f3f5f9',
      'editorLineNumber.foreground': '#b3b9c6',
      'editorLineNumber.activeForeground': '#5b6375',
      'editorGutter.background': '#ffffff',
      'editor.selectionBackground': '#cfe0ff',
      'editorCursor.foreground': '#2f9e44',
      'editorIndentGuide.background1': '#e6e9ef',
    },
  });
};

export const MONACO_LANG = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  rust: 'rust',
  csharp: 'csharp',
  typescript: 'typescript',
} as const;
