/**
 * Language Detection Utility
 *
 * Maps file extensions to Monaco editor language identifiers.
 */

/**
 * Extension to Monaco language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // TypeScript/JavaScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',

  // Data formats
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.toml': 'ini',
  '.ini': 'ini',

  // Markdown
  '.md': 'markdown',
  '.mdx': 'markdown',

  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',

  // Java/Kotlin
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',

  // C#/F#
  '.cs': 'csharp',
  '.fs': 'fsharp',

  // Ruby
  '.rb': 'ruby',
  '.rake': 'ruby',

  // PHP
  '.php': 'php',

  // Swift
  '.swift': 'swift',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.ps1': 'powershell',
  '.psm1': 'powershell',

  // Database
  '.sql': 'sql',

  // Docker
  '.dockerfile': 'dockerfile',

  // GraphQL
  '.graphql': 'graphql',
  '.gql': 'graphql',

  // Others
  '.r': 'r',
  '.lua': 'lua',
  '.perl': 'perl',
  '.pl': 'perl',
  '.scala': 'scala',
  '.clj': 'clojure',
  '.elm': 'elm',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hrl': 'erlang',
  '.hs': 'haskell',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.dart': 'dart',
  '.tf': 'hcl',
  '.proto': 'protobuf',
};

/**
 * Get Monaco language identifier from file extension.
 *
 * @param extension - File extension (with or without leading dot)
 * @returns Monaco language identifier
 */
export function getLanguageFromExtension(extension: string): string {
  if (!extension) {
    return 'plaintext';
  }

  // Normalize: ensure leading dot and lowercase
  const normalized = extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  return EXTENSION_TO_LANGUAGE[normalized] ?? 'plaintext';
}

/**
 * Extract file extension from filename or path.
 *
 * @param filename - Filename or full path
 * @returns Extension including leading dot, or empty string if none
 */
export function getExtension(filename: string): string {
  if (!filename) {
    return '';
  }

  // Get the basename (handle paths)
  const basename = filename.split('/').pop() ?? '';

  // Handle dotfiles (e.g., .gitignore)
  if (basename.startsWith('.') && !basename.includes('.', 1)) {
    return basename;
  }

  // Find the last dot
  const lastDotIndex = basename.lastIndexOf('.');

  // No dot or dot at the end
  if (lastDotIndex === -1 || lastDotIndex === basename.length - 1) {
    return '';
  }

  return basename.substring(lastDotIndex);
}

/**
 * Get language display name for UI
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    kotlin: 'Kotlin',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    shell: 'Shell',
    powershell: 'PowerShell',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    xml: 'XML',
    markdown: 'Markdown',
    dockerfile: 'Dockerfile',
    graphql: 'GraphQL',
    plaintext: 'Plain Text',
    ini: 'INI',
    fsharp: 'F#',
    haskell: 'Haskell',
    vue: 'Vue',
    svelte: 'Svelte',
    dart: 'Dart',
    lua: 'Lua',
    perl: 'Perl',
    scala: 'Scala',
    clojure: 'Clojure',
    elm: 'Elm',
    elixir: 'Elixir',
    erlang: 'Erlang',
    r: 'R',
    hcl: 'HCL',
    protobuf: 'Protocol Buffers',
  };

  return displayNames[language] ?? language.charAt(0).toUpperCase() + language.slice(1);
}
