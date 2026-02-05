/**
 * Markdown Renderer
 *
 * Simple markdown preview component for notes.
 * Supports GitHub-flavored markdown checkboxes.
 */

'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;
  /** Text color class */
  textColor: string;
  /** Callback when checkbox is toggled */
  onCheckboxToggle?: (lineIndex: number, checked: boolean) => void;
}

/**
 * Preprocess content to convert checkbox syntax to proper markers
 */
function preprocessCheckboxes(content: string): string {
  return content
    .split('\n')
    .map((line, index) => {
      // Match lines like "- [ ] task" or "- [x] task" or "* [ ] task"
      const uncheckedMatch = line.match(/^(\s*[-*])\s*\[\s*\]\s+(.*)$/);
      if (uncheckedMatch) {
        return `${uncheckedMatch[1]} <!--checkbox:${index}:unchecked--> ${uncheckedMatch[2]}`;
      }
      const checkedMatch = line.match(/^(\s*[-*])\s*\[x\]\s+(.*)$/i);
      if (checkedMatch) {
        return `${checkedMatch[1]} <!--checkbox:${index}:checked--> ${checkedMatch[2]}`;
      }
      return line;
    })
    .join('\n');
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  textColor,
  onCheckboxToggle,
}: MarkdownRendererProps) {
  // Preprocess content for checkboxes
  const processedContent = useMemo(() => preprocessCheckboxes(content), [content]);

  if (!content.trim()) {
    return (
      <p className={`${textColor} opacity-50 italic text-sm`}>
        Empty note. Switch to edit mode to add content.
      </p>
    );
  }

  return (
    <ReactMarkdown
      components={{
        // Headers
        h1: ({ children }) => (
          <h1 className={`text-xl font-bold mb-2 ${textColor}`}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className={`text-lg font-bold mb-2 ${textColor}`}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className={`text-base font-bold mb-1 ${textColor}`}>{children}</h3>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className={`mb-2 text-sm ${textColor}`}>{children}</p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className={`list-none mb-2 text-sm ${textColor}`}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className={`list-decimal list-inside mb-2 text-sm ${textColor}`}>
            {children}
          </ol>
        ),
        li: ({ children }) => {
          // Check if this is a checkbox item
          const childArray = Array.isArray(children) ? children : [children];
          const firstChild = childArray[0];

          // Look for checkbox marker in children
          if (typeof firstChild === 'string') {
            const uncheckedMatch = firstChild.match(/<!--checkbox:(\d+):unchecked-->\s*/);
            const checkedMatch = firstChild.match(/<!--checkbox:(\d+):checked-->\s*/);

            if (uncheckedMatch || checkedMatch) {
              const isChecked = !!checkedMatch;
              const lineIndex = parseInt(uncheckedMatch?.[1] || checkedMatch?.[1] || '0', 10);
              const restContent = firstChild.replace(/<!--checkbox:\d+:(un)?checked-->\s*/, '');

              return (
                <li className="mb-1 flex items-start gap-2 list-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onCheckboxToggle?.(lineIndex, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                  />
                  <span className={isChecked ? 'line-through opacity-60' : ''}>
                    {restContent}
                    {childArray.slice(1)}
                  </span>
                </li>
              );
            }
          }

          return <li className="mb-0.5 ml-4 list-disc">{children}</li>;
        },
        // Inline styles
        strong: ({ children }) => (
          <strong className="font-bold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        // Code
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ) : (
            <code className="block bg-black/10 p-2 rounded text-xs font-mono mb-2 overflow-x-auto">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-black/10 p-2 rounded text-xs font-mono mb-2 overflow-x-auto">
            {children}
          </pre>
        ),
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            {children}
          </a>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-current/30 pl-3 italic opacity-80 mb-2">
            {children}
          </blockquote>
        ),
        // Horizontal rule
        hr: () => <hr className="border-current/20 my-2" />,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
});
