'use client'

export default function err({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-neutral-500">something went oh oh...</p>
      <button onClick={reset} className="text-white underline">
        maybe this button will help?
      </button>
    </div>
  )
}
