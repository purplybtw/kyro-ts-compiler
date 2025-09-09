
import * as monaco from 'monaco-editor';

export function registerJavonLanguage() {
  monaco.languages.register({ id: 'javon' });

  monaco.languages.setMonarchTokensProvider('javon', {
    tokenizer: {
      root: [
        [/\b(if|elif|else|for|while|return|break|continue|try|catch|throw|finally|switch|case|default)\b/, 'keyword.control'],
        [/\b(int|float|char|bool|void)\b/, 'keyword.type'],
        [/\b(class|type|new|async|await|match|check|func|implements|extends|const|null|as|infer|undefined)\b/, 'keyword'],
        [/\b(true|false)\b/, 'constant.language.boolean'],
        [/\b\d+\.?\d*\b/, 'constant.numeric'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[;,.]/, 'delimiter'],
        [/[=!<>]=?/, 'operator.comparison'],
        [/[+\-*\/]/, 'operator.arithmetic'],
        [/&&|\|\|/, 'operator.logical'],
        [/\+\+|--/, 'operator.increment'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ]
    }
  });

  monaco.languages.setLanguageConfiguration('javon', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  });
}
