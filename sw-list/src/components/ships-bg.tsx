'use client'

import { useState, useEffect } from 'react'

const IMGS = [
  '/anchor.webp',
  '/boat.webp',
  '/sailboat.webp',
  '/captain.webp',
  '/steering-wheel.webp',
]

const POS_MOBILE = [
  { s: 35, t: 3, l: 2, r: -12 },
  { s: 32, t: 3, l: 85, r: 10 },
  { s: 30, t: 12, l: 5, r: 8 },
  { s: 34, t: 12, l: 80, r: -15 },
  { s: 32, t: 22, l: 3, r: -8 },
  { s: 30, t: 22, l: 88, r: 12 },
  { s: 35, t: 32, l: 6, r: 15 },
  { s: 32, t: 32, l: 82, r: -10 },
  { s: 30, t: 42, l: 2, r: -6 },
  { s: 34, t: 42, l: 86, r: 8 },
  { s: 32, t: 52, l: 5, r: 10 },
  { s: 30, t: 52, l: 84, r: -12 },
  { s: 35, t: 62, l: 3, r: -8 },
  { s: 32, t: 62, l: 88, r: 15 },
  { s: 30, t: 72, l: 6, r: 6 },
  { s: 34, t: 72, l: 82, r: -10 },
  { s: 32, t: 82, l: 2, r: -15 },
  { s: 30, t: 82, l: 86, r: 8 },
  { s: 35, t: 92, l: 5, r: 12 },
  { s: 32, t: 92, l: 84, r: -6 },
]

const POS_DESKTOP = [
  { s: 50, t: 2, l: 2, r: -15 },
  { s: 45, t: 10, l: 6, r: -8 },
  { s: 48, t: 20, l: 3, r: -20 },
  { s: 42, t: 30, l: 5, r: -12 },
  { s: 55, t: 40, l: 2, r: -18 },
  { s: 44, t: 50, l: 6, r: -6 },
  { s: 50, t: 60, l: 3, r: -10 },
  { s: 46, t: 70, l: 5, r: -14 },
  { s: 40, t: 80, l: 2, r: -8 },
  { s: 48, t: 90, l: 6, r: -16 },
  { s: 60, t: 4, l: 92, r: 12 },
  { s: 52, t: 14, l: 89, r: 18 },
  { s: 65, t: 24, l: 94, r: 8 },
  { s: 48, t: 34, l: 90, r: 15 },
  { s: 54, t: 44, l: 93, r: 10 },
  { s: 50, t: 54, l: 89, r: 14 },
  { s: 58, t: 64, l: 92, r: 6 },
  { s: 44, t: 74, l: 90, r: 12 },
  { s: 52, t: 84, l: 94, r: -8 },
  { s: 46, t: 94, l: 88, r: 10 },
  { s: 38, t: 6, l: 18, r: 5 },
  { s: 35, t: 6, l: 35, r: -10 },
  { s: 40, t: 6, l: 52, r: 8 },
  { s: 36, t: 6, l: 70, r: -6 },
  { s: 42, t: 6, l: 82, r: 12 },
  { s: 34, t: 15, l: 25, r: -8 },
  { s: 38, t: 15, l: 42, r: 6 },
  { s: 36, t: 15, l: 60, r: -12 },
  { s: 40, t: 15, l: 76, r: 10 },
  { s: 35, t: 25, l: 20, r: 4 },
  { s: 38, t: 25, l: 38, r: -8 },
  { s: 42, t: 25, l: 55, r: 14 },
  { s: 36, t: 25, l: 72, r: -6 },
  { s: 34, t: 25, l: 85, r: 8 },
  { s: 40, t: 35, l: 15, r: -10 },
  { s: 36, t: 35, l: 32, r: 6 },
  { s: 38, t: 35, l: 48, r: -4 },
  { s: 42, t: 35, l: 65, r: 12 },
  { s: 35, t: 35, l: 80, r: -8 },
  { s: 38, t: 45, l: 22, r: 8 },
  { s: 34, t: 45, l: 40, r: -6 },
  { s: 40, t: 45, l: 58, r: 10 },
  { s: 36, t: 45, l: 75, r: -12 },
  { s: 42, t: 55, l: 18, r: -5 },
  { s: 38, t: 55, l: 35, r: 8 },
  { s: 35, t: 55, l: 52, r: -10 },
  { s: 40, t: 55, l: 68, r: 6 },
  { s: 36, t: 55, l: 82, r: -8 },
  { s: 34, t: 65, l: 25, r: 12 },
  { s: 40, t: 65, l: 42, r: -6 },
  { s: 38, t: 65, l: 60, r: 8 },
  { s: 42, t: 65, l: 78, r: -10 },
  { s: 36, t: 75, l: 20, r: 6 },
  { s: 35, t: 75, l: 38, r: -8 },
  { s: 40, t: 75, l: 55, r: 10 },
  { s: 38, t: 75, l: 72, r: -6 },
  { s: 34, t: 75, l: 85, r: 12 },
  { s: 42, t: 85, l: 15, r: -10 },
  { s: 38, t: 85, l: 32, r: 8 },
  { s: 36, t: 85, l: 50, r: -4 },
  { s: 40, t: 85, l: 68, r: 6 },
  { s: 35, t: 85, l: 82, r: -12 },
  { s: 38, t: 95, l: 22, r: 10 },
  { s: 34, t: 95, l: 42, r: -6 },
  { s: 40, t: 95, l: 62, r: 8 },
  { s: 36, t: 95, l: 78, r: -10 },
]

function genPicks(len: number) {
  let prev = -1
  const arr: number[] = []
  for (let i = 0; i < len; i++) {
    let n = Math.floor(Math.random() * IMGS.length)
    while (n === prev) n = Math.floor(Math.random() * IMGS.length)
    arr.push(n)
    prev = n
  }
  return arr
}

export function ShipsBg() {
  const [mPicks, setMPicks] = useState<number[]>([])
  const [dPicks, setDPicks] = useState<number[]>([])

  useEffect(() => {
    setMPicks(genPicks(POS_MOBILE.length))
    setDPicks(genPicks(POS_DESKTOP.length))
  }, [])

  if (!mPicks.length || !dPicks.length) return null

  return (
    <>
      <div className="ships md:hidden">
        {POS_MOBILE.map((p, i) => (
          <div
            key={i}
            className="ship"
            style={{
              width: p.s,
              height: p.s,
              top: `${p.t}%`,
              left: `${p.l}%`,
              transform: `rotate(${p.r}deg)`,
            }}
          >
            <img src={IMGS[mPicks[i]]} alt="" />
          </div>
        ))}
      </div>
      <div className="ships hidden md:block">
        {POS_DESKTOP.map((p, i) => (
          <div
            key={i}
            className="ship"
            style={{
              width: p.s,
              height: p.s,
              top: `${p.t}%`,
              left: `${p.l}%`,
              transform: `rotate(${p.r}deg)`,
            }}
          >
            <img src={IMGS[dPicks[i]]} alt="" />
          </div>
        ))}
      </div>
    </>
  )
}
