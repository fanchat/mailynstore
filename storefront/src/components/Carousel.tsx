"use client"

import { useState, useEffect, useCallback, useRef } from "react"

type CarouselItem = {
  id: number
  title: string
  subtitle: string
  image_url: string
  link_url: string
  sort_order: number
}

export default function Carousel() {
  const [items, setItems] = useState<CarouselItem[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch("/api/carousel")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setItems(d.data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length)
  }, [items.length])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length)
  }, [items.length])

  const goTo = useCallback((i: number) => {
    setCurrent(i)
  }, [])

  // Auto-play with pause support
  useEffect(() => {
    if (items.length <= 1) return
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(next, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [items.length, next, paused])

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  if (loading || items.length === 0) return null

  const item = items[current]

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Click to pause/play — full area */}
      <div
        className="absolute inset-0 z-30 cursor-pointer"
        onClick={togglePause}
      />

      {/* Top text area */}
      <div className="absolute top-0 left-0 right-0 z-20 p-10 md:p-14 pb-0 pointer-events-none">
        {item.title && (
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-light tracking-wider text-white leading-tight max-w-2xl">
            {item.title}
          </h2>
        )}
        {item.subtitle && (
          <p className="text-sm md:text-base text-white/60 mt-3 font-light tracking-wide max-w-lg">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Centered image area - fills remaining space */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.title || ""}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Pause/Play indicator */}
      {paused && (
        <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          </div>
        </div>
      )}

      {/* Subtle gradient overlay at bottom for readability */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-none" />

      {/* Bottom controls area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 md:p-10 flex items-end justify-between pointer-events-none">
        {/* Navigation dots */}
        {items.length > 1 && (
          <div className="flex items-center gap-2 pointer-events-auto">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i) }}
                className={`transition-all duration-500 rounded-full ${
                  i === current
                    ? "w-8 h-2 bg-white/80"
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Pause/Play button + pause label */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {paused && (
            <span className="text-white/50 text-xs tracking-widest">已暂停</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); togglePause() }}
            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 hover:bg-white/25 hover:text-white transition border border-white/10"
            title={paused ? "继续播放" : "暂停"}
          >
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
          </button>
        </div>

        {/* CTA link */}
        {item.link_url && (
          <a
            href={item.link_url}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 text-white/80 text-sm font-light tracking-wide hover:bg-white/10 hover:text-white transition backdrop-blur-sm pointer-events-auto"
          >
            查看更多
            <span className="text-lg leading-none">→</span>
          </a>
        )}
      </div>

      {/* Prev/Next arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 text-xl hover:bg-white/25 hover:text-white transition border border-white/10 pointer-events-auto"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 text-xl hover:bg-white/25 hover:text-white transition border border-white/10 pointer-events-auto"
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
