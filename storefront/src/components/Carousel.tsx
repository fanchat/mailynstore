"use client"

import { useState, useEffect, useCallback } from "react"

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

  // Auto-play
  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [items.length, next])

  if (loading || items.length === 0) return null

  const item = items[current]

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top text area */}
      <div className="absolute top-0 left-0 right-0 z-20 p-10 md:p-14 pb-0">
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
      <div className="absolute inset-0 flex items-center justify-center">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.title || ""}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Subtle gradient overlay at bottom for readability */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/50 to-transparent z-10" />

      {/* Bottom controls area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 md:p-10 flex items-end justify-between">
        {/* Navigation dots */}
        {items.length > 1 && (
          <div className="flex items-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all duration-500 rounded-full ${
                  i === current
                    ? "w-8 h-2 bg-white/80"
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* CTA link */}
        {item.link_url && (
          <a
            href={item.link_url}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 text-white/80 text-sm font-light tracking-wide hover:bg-white/10 hover:text-white transition backdrop-blur-sm"
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
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 text-xl hover:bg-white/25 hover:text-white transition border border-white/10"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 text-xl hover:bg-white/25 hover:text-white transition border border-white/10"
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
