/**
 * Language Detection Utility Tests
 *
 * Tests for file extension to Monaco language mapping.
 */

import { describe, it, expect } from 'vitest';
import { getLanguageFromExtension, getExtension } from './language-detection';

describe('getLanguageFromExtension', () => {
  it('should return typescript for .ts files', () => {
    expect(getLanguageFromExtension('.ts')).toBe('typescript');
  });

  it('should return typescript for .tsx files', () => {
    expect(getLanguageFromExtension('.tsx')).toBe('typescript');
  });

  it('should return javascript for .js files', () => {
    expect(getLanguageFromExtension('.js')).toBe('javascript');
  });

  it('should return javascript for .jsx files', () => {
    expect(getLanguageFromExtension('.jsx')).toBe('javascript');
  });

  it('should return python for .py files', () => {
    expect(getLanguageFromExtension('.py')).toBe('python');
  });

  it('should return go for .go files', () => {
    expect(getLanguageFromExtension('.go')).toBe('go');
  });

  it('should return rust for .rs files', () => {
    expect(getLanguageFromExtension('.rs')).toBe('rust');
  });

  it('should return markdown for .md files', () => {
    expect(getLanguageFromExtension('.md')).toBe('markdown');
  });

  it('should return json for .json files', () => {
    expect(getLanguageFromExtension('.json')).toBe('json');
  });

  it('should return html for .html files', () => {
    expect(getLanguageFromExtension('.html')).toBe('html');
  });

  it('should return css for .css files', () => {
    expect(getLanguageFromExtension('.css')).toBe('css');
  });

  it('should return scss for .scss files', () => {
    expect(getLanguageFromExtension('.scss')).toBe('scss');
  });

  it('should return yaml for .yaml files', () => {
    expect(getLanguageFromExtension('.yaml')).toBe('yaml');
  });

  it('should return yaml for .yml files', () => {
    expect(getLanguageFromExtension('.yml')).toBe('yaml');
  });

  it('should return sql for .sql files', () => {
    expect(getLanguageFromExtension('.sql')).toBe('sql');
  });

  it('should return shell for .sh files', () => {
    expect(getLanguageFromExtension('.sh')).toBe('shell');
  });

  it('should return dockerfile for Dockerfile', () => {
    expect(getLanguageFromExtension('.dockerfile')).toBe('dockerfile');
  });

  it('should return xml for .xml files', () => {
    expect(getLanguageFromExtension('.xml')).toBe('xml');
  });

  it('should return c for .c files', () => {
    expect(getLanguageFromExtension('.c')).toBe('c');
  });

  it('should return cpp for .cpp files', () => {
    expect(getLanguageFromExtension('.cpp')).toBe('cpp');
  });

  it('should return java for .java files', () => {
    expect(getLanguageFromExtension('.java')).toBe('java');
  });

  it('should return plaintext for unknown extensions', () => {
    expect(getLanguageFromExtension('.xyz')).toBe('plaintext');
  });

  it('should handle uppercase extensions', () => {
    expect(getLanguageFromExtension('.TS')).toBe('typescript');
  });

  it('should handle extensions without leading dot', () => {
    expect(getLanguageFromExtension('ts')).toBe('typescript');
  });

  it('should handle empty string', () => {
    expect(getLanguageFromExtension('')).toBe('plaintext');
  });
});

describe('getExtension', () => {
  it('should extract extension from filename', () => {
    expect(getExtension('file.ts')).toBe('.ts');
  });

  it('should handle dotfiles', () => {
    expect(getExtension('.gitignore')).toBe('.gitignore');
  });

  it('should handle multiple dots', () => {
    expect(getExtension('file.test.ts')).toBe('.ts');
  });

  it('should return empty for no extension', () => {
    expect(getExtension('Makefile')).toBe('');
  });

  it('should handle path with directory', () => {
    expect(getExtension('/path/to/file.tsx')).toBe('.tsx');
  });

  it('should handle relative path', () => {
    expect(getExtension('./src/app.js')).toBe('.js');
  });

  it('should handle empty string', () => {
    expect(getExtension('')).toBe('');
  });

  it('should handle file ending with dot', () => {
    expect(getExtension('file.')).toBe('');
  });

  it('should preserve extension case', () => {
    expect(getExtension('FILE.TSX')).toBe('.TSX');
  });
});

describe('getLanguageFromExtension edge cases', () => {
  it('should return graphql for .graphql files', () => {
    expect(getLanguageFromExtension('.graphql')).toBe('graphql');
  });

  it('should return graphql for .gql files', () => {
    expect(getLanguageFromExtension('.gql')).toBe('graphql');
  });

  it('should return ruby for .rb files', () => {
    expect(getLanguageFromExtension('.rb')).toBe('ruby');
  });

  it('should return php for .php files', () => {
    expect(getLanguageFromExtension('.php')).toBe('php');
  });

  it('should return swift for .swift files', () => {
    expect(getLanguageFromExtension('.swift')).toBe('swift');
  });

  it('should return kotlin for .kt files', () => {
    expect(getLanguageFromExtension('.kt')).toBe('kotlin');
  });

  it('should return csharp for .cs files', () => {
    expect(getLanguageFromExtension('.cs')).toBe('csharp');
  });

  it('should return powershell for .ps1 files', () => {
    expect(getLanguageFromExtension('.ps1')).toBe('powershell');
  });

  it('should return less for .less files', () => {
    expect(getLanguageFromExtension('.less')).toBe('less');
  });

  it('should return ini for .ini files', () => {
    expect(getLanguageFromExtension('.ini')).toBe('ini');
  });

  it('should return toml for .toml files', () => {
    expect(getLanguageFromExtension('.toml')).toBe('ini');
  });
});
