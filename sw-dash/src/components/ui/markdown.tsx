'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Props {
  content: string
  className?: string
}

export default function Md({ content, className = '' }: Props) {
  if (!content.trim()) {
    return (
      <div className={`text-gray-600 font-mono text-sm italic ${className}`}>
        nothing to preview yet
      </div>
    )
  }

  return (
    <div className={`markdown-preview ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ children, className: cn, ...rest }) {
            const match = /language-(\w+)/.exec(cn || '')
            return match ? (
              <SyntaxHighlighter PreTag="div" language={match[1]} style={vscDarkPlus}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code {...rest} className={cn}>
                {children}
              </code>
            )
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-white mb-3 border-b border-gray-700 pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold text-white mb-2">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-bold text-white mb-2">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-bold text-white mb-2">{children}</h6>,
          p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children, className: cn }) => {
            const isTodo = cn?.includes('task-list-item')
            return (
              <li className={`${isTodo ? 'flex items-start gap-2' : ''} text-gray-300`}>
                {children}
              </li>
            )
          },
          input: ({ type, checked }) =>
            type === 'checkbox' ? (
              <input type="checkbox" checked={checked} disabled className="mt-1 cursor-default" />
            ) : null,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-700 pl-4 italic text-gray-400 mb-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-700 text-gray-300">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
          tbody: ({ children }) => <tbody className="bg-black">{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold border-r border-gray-700 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-r border-gray-700 last:border-r-0">{children}</td>
          ),
          hr: () => <hr className="border-gray-700 my-4" />,
          del: ({ children }) => <del className="text-gray-500">{children}</del>,
          pre: ({ children }) => (
            <pre className="bg-[#1e1e1e] rounded p-4 overflow-x-auto mb-4">{children}</pre>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ''} className="max-w-full h-auto rounded my-4" />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
