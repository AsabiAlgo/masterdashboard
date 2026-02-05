/**
 * Code Viewer Component
 *
 * Displays code with line numbers and syntax highlighting.
 */

'use client';

import { memo, useMemo } from 'react';

interface CodeViewerProps {
  content: string;
  extension: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
}

// Extension to language mapping for syntax colors
const EXTENSION_LANGUAGES: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.swift': 'swift',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

// Simple keyword highlighting for common patterns
const KEYWORDS = {
  typescript: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'import', 'export', 'from', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'async', 'await', 'new', 'this', 'extends', 'implements', 'public', 'private', 'protected', 'readonly', 'static', 'abstract', 'default', 'as', 'is', 'in', 'of', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false'],
  python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'with', 'as', 'lambda', 'yield', 'async', 'await', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'global', 'nonlocal'],
  go: ['func', 'package', 'import', 'type', 'struct', 'interface', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'go', 'defer', 'chan', 'select', 'var', 'const', 'map', 'make', 'new', 'nil', 'true', 'false', 'error'],
  rust: ['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'async', 'await', 'move', 'self', 'Self', 'true', 'false', 'None', 'Some', 'Ok', 'Err', 'where', 'type', 'dyn', 'unsafe'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'export', 'local', 'readonly', 'declare', 'source', 'echo', 'exit', 'true', 'false'],
};

function getLanguage(extension: string): string {
  return EXTENSION_LANGUAGES[extension.toLowerCase()] ?? 'text';
}

function getKeywords(language: string): string[] {
  if (language === 'javascript') return KEYWORDS.typescript;
  return KEYWORDS[language as keyof typeof KEYWORDS] ?? [];
}

// Simple syntax highlighting using regex
function highlightLine(line: string, language: string): string {
  const keywords = getKeywords(language);
  let result = line;

  // Escape HTML entities
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight strings (single and double quotes)
  result = result.replace(
    /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="text-green-400">$&</span>'
  );

  // Highlight comments (// and #)
  result = result.replace(
    /(\/\/.*$|#.*$)/gm,
    '<span class="text-slate-500 italic">$1</span>'
  );

  // Highlight numbers
  result = result.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-orange-400">$1</span>'
  );

  // Highlight keywords
  if (keywords.length > 0) {
    const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    result = result.replace(
      keywordPattern,
      '<span class="text-purple-400">$1</span>'
    );
  }

  return result;
}

export const CodeViewer = memo(function CodeViewer({
  content,
  extension,
  showLineNumbers,
  wordWrap,
}: CodeViewerProps) {
  const language = getLanguage(extension);

  const lines = useMemo(() => {
    return content.split('\n').map((line, index) => ({
      number: index + 1,
      content: line,
      highlighted: highlightLine(line, language),
    }));
  }, [content, language]);

  const lineNumberWidth = lines.length.toString().length;

  return (
    <div className="h-full overflow-auto bg-slate-900 font-mono text-sm">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line) => (
            <tr key={line.number} className="hover:bg-slate-800/50">
              {showLineNumbers && (
                <td
                  className="sticky left-0 bg-slate-900 px-3 py-0.5 text-right text-slate-500 select-none border-r border-slate-800"
                  style={{ minWidth: `${lineNumberWidth + 2}ch` }}
                >
                  {line.number}
                </td>
              )}
              <td className="px-4 py-0.5">
                <pre
                  className={`${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} text-slate-200`}
                  dangerouslySetInnerHTML={{ __html: line.highlighted || '&nbsp;' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
