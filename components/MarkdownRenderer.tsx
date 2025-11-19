import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-700 prose-a:text-emerald-600">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        // Force HTML output to avoid potential double rendering (MathML + HTML) if CSS is missing/mismatched
        rehypePlugins={[[rehypeKatex, { output: 'html' }]]} 
        components={{
            // Custom components to ensure styles match Ecobi theme
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-slate-800 mb-3 mt-6" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-medium text-slate-800 mb-2 mt-4" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-600" {...props} />,
            li: ({node, ...props}) => <li className="mb-1 text-slate-600" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-400 pl-4 italic text-slate-600 my-4" {...props} />,
            code: ({node, inline, className, children, ...props}: any) => {
                const match = /language-(\w+)/.exec(className || '')
                return !inline ? (
                  <pre className="bg-slate-100 rounded-lg p-4 overflow-x-auto my-4 text-sm">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-slate-100 rounded px-1 py-0.5 text-sm text-pink-600 font-mono" {...props}>
                    {children}
                  </code>
                )
              }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};