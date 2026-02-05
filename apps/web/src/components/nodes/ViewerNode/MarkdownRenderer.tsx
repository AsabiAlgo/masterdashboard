/**
 * Markdown Renderer Component
 *
 * Renders markdown content with GitHub Flavored Markdown support.
 */

'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  return (
    <div className="h-full overflow-auto bg-slate-900 p-6">
      <article className="max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Headings
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-slate-100 mt-0 mb-4 pb-2 border-b border-slate-700">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-slate-100 mt-6 mb-3 pb-2 border-b border-slate-700">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-slate-200 mt-5 mb-2">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-slate-200 mt-4 mb-2">
                {children}
              </h4>
            ),

            // Paragraphs
            p: ({ children }) => (
              <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
            ),

            // Links
            a: ({ href, children }) => {
              const isExternal = href?.startsWith('http');
              return (
                <a
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {children}
                </a>
              );
            },

            // Strong/Bold
            strong: ({ children }) => (
              <strong className="font-semibold text-slate-200">{children}</strong>
            ),

            // Emphasis/Italic
            em: ({ children }) => (
              <em className="italic text-slate-300">{children}</em>
            ),

            // Strikethrough (GFM)
            del: ({ children }) => (
              <del className="line-through text-slate-500">{children}</del>
            ),

            // Inline code
            code: ({ className, children }) => {
              const isCodeBlock = className?.includes('language-');
              if (isCodeBlock) {
                return (
                  <code className={`${className} block overflow-x-auto`}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="text-green-400 bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            },

            // Code blocks
            pre: ({ children }) => (
              <pre className="bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono">
                {children}
              </pre>
            ),

            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 bg-slate-800/50 pl-4 py-2 my-4 text-slate-400 italic">
                {children}
              </blockquote>
            ),

            // Unordered lists
            ul: ({ children }) => (
              <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1 pl-2">
                {children}
              </ul>
            ),

            // Ordered lists
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1 pl-2">
                {children}
              </ol>
            ),

            // List items
            li: ({ children }) => (
              <li className="text-slate-300">{children}</li>
            ),

            // Horizontal rule
            hr: () => <hr className="border-slate-700 my-6" />,

            // Tables (GFM)
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border-collapse border border-slate-700 text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-800">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-slate-700 hover:bg-slate-800/50">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="border border-slate-700 px-4 py-2 text-left font-semibold text-slate-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-slate-700 px-4 py-2 text-slate-300">
                {children}
              </td>
            ),

            // Task lists (GFM)
            input: ({ checked, type }) => {
              if (type === 'checkbox') {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-2 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 cursor-default"
                  />
                );
              }
              return null;
            },

            // Images
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded-lg border border-slate-700 my-4"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
});
