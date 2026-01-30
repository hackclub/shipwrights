'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { generateProjectSummary } from '@/app/actions/ai-summary'

import { ShipCert } from '@/types'

interface Props {
  cert: ShipCert
}

export function AiSummary({ cert }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localSummary, setLocalSummary] = useState(cert.aiSummary)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateProjectSummary(cert.id, {
        projectName: cert.project,
        projectType: cert.type,
        readmeUrl: cert.links?.readme,
        demoUrl: cert.links?.demo,
        repoUrl: cert.links?.repo,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate summary :(')
      }

      if (result.summary) {
        setLocalSummary(result.summary)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error ;/')
    } finally {
      setLoading(false)
    }
  }

  const displaySummary = localSummary || cert.aiSummary

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20 mb-4 md:mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-amber-400 font-mono text-sm font-bold uppercase tracking-wider">
          AI Summary
        </h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-amber-900/30 text-amber-300 px-4 py-1.5 font-mono text-xs hover:bg-amber-900/50 transition-all border border-amber-700/60 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? 'generating...' : 'generate'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 font-mono text-xs mb-4 bg-red-950/30 p-3 rounded-xl border border-red-900/50">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {displaySummary ? (
        <div className="bg-zinc-950/50 border-2 border-amber-900/20 rounded-2xl p-5 shadow-inner">
          <div className="prose prose-invert prose-sm max-w-none font-mono text-gray-300 leading-relaxed">
            <ReactMarkdown>{displaySummary}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="text-gray-600 font-mono text-sm text-center py-8 border-2 border-dashed border-zinc-800 rounded-2xl">
          no summary generated yet...
        </div>
      )}
    </div>
  )
}
