'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { generateProjectSummary } from '@/app/actions/ai-summary'

interface Props {
    cert: any
}

export function AiSummary({ cert }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
                throw new Error(result.error)
            }
            window.location.reload()
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl shadow-amber-950/20 mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-2 md:mb-3">
                <h3 className="text-amber-400 font-mono text-sm font-bold">
                    AI Summary
                </h3>
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-amber-900/30 text-amber-300 px-3 py-1 font-mono text-xs hover:bg-amber-900/50 transition-all border border-amber-700/60 rounded disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                    {loading ? 'generating...' : 'generate'}
                </button>
            </div>

            {error && (
                <div className="text-red-400 font-mono text-xs mb-2 bg-red-950/50 p-2 rounded border border-red-900/50">
                    {error}
                </div>
            )}

            {cert.aiSummary ? (
                <div className="bg-zinc-950/50 border-2 border-amber-900/30 rounded-2xl p-4">
                    <div className="prose prose-invert prose-sm max-w-none font-mono text-gray-300">
                        <ReactMarkdown>{cert.aiSummary}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div className="text-gray-500 font-mono text-sm text-center py-4">
                    no summary generated yet...
                </div>
            )}
        </div>
    )
}
