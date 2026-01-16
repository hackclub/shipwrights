'use client'

import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="bg-grid min-h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <Image
          src="/lol.gif"
          alt="lol"
          width={200}
          height={200}
          className="mx-auto mb-6"
          unoptimized
        />

        <p className="text-red-400 font-mono text-xl mb-6">lol</p>
      </div>
    </div>
  )
}
