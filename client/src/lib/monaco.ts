import { loader, type BeforeMount } from '@monaco-editor/react';

export const MONACO_VERSION = '0.52.2';

loader.config({ paths: { vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs` } });

export const defineCodleTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('codle-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7f9587', fontStyle: 'italic' },
      { token: 'keyword', foreground: '9db7ff' },
      { token: 'string', foreground: '7fd39b' },
      { token: 'number', foreground: 'e8b95e' },
      { token: 'type', foreground: 'd9a2e6' },
      { token: 'delimiter', foreground: 'b4c4b8' },
    ],
    colors: {
      'editor.background': '#152019',
      'editor.foreground': '#e4ede5',
      'editor.lineHighlightBackground': '#1b2920',
      'editor.lineHighlightBorder': '#1b2920',
      'editorLineNumber.foreground': '#4a6353',
      'editorLineNumber.activeForeground': '#b4c4b8',
      'editorGutter.background': '#152019',
      'editor.selectionBackground': '#2c3f63',
      'editor.inactiveSelectionBackground': '#24344f',
      'editorCursor.foreground': '#9db7ff',
      'editorIndentGuide.background1': '#223329',
      'editorIndentGuide.activeBackground1': '#3a5746',
      'editorWidget.background': '#152019',
      'editorSuggestWidget.background': '#152019',
      'editorSuggestWidget.border': '#4c7a5c',
      'scrollbarSlider.background': '#2b453566',
      'scrollbarSlider.hoverBackground': '#4c7a5c88',
    },
  });
  monaco.editor.defineTheme('codle-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5f7466', fontStyle: 'italic' },
      { token: 'keyword', foreground: '2446a8' },
      { token: 'string', foreground: '1b6b33' },
      { token: 'number', foreground: '8c5709' },
      { token: 'type', foreground: '7d2f8c' },
      { token: 'delimiter', foreground: '384a3e' },
    ],
    colors: {
      'editor.background': '#edf4e7',
      'editor.foreground': '#17221b',
      'editor.lineHighlightBackground': '#e1ecd8',
      'editor.lineHighlightBorder': '#e1ecd8',
      'editorLineNumber.foreground': '#8fa895',
      'editorLineNumber.activeForeground': '#384a3e',
      'editorGutter.background': '#edf4e7',
      'editor.selectionBackground': '#c5d3f2',
      'editor.inactiveSelectionBackground': '#d6dff2',
      'editorCursor.foreground': '#2446a8',
      'editorIndentGuide.background1': '#d3e2c9',
      'editorIndentGuide.activeBackground1': '#a9c7ad',
      'editorWidget.background': '#edf4e7',
      'editorSuggestWidget.background': '#edf4e7',
      'editorSuggestWidget.border': '#4f8a5e',
      'scrollbarSlider.background': '#a9c7ad66',
      'scrollbarSlider.hoverBackground': '#4f8a5e88',
    },
  });
  monaco.editor.defineTheme('classic-dark', {
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
  monaco.editor.defineTheme('classic-light', {
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
