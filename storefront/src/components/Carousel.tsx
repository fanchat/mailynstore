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
    <div className="relative w-full h-[calc(100vh-120px)] overflow-hidden bg-gray-900">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
      <div className="absolute bottom-0 left-0 right-0 p-10 text-white bg-gradient-to-t from-black/60 to-transparent">
        {item.title && <h2 className="text-2xl md:text-4xl font-light tracking-wider">{item.title}</h2>}
        {item.subtitle && <p className="text-sm md:text-base text-white/70 mt-2 font-light tracking-wide max-w-lg">{item.subtitle}</p>}
      </div>
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 text-xl hover:bg-white/25 hover:text-white transition border border-white/10"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 text-xl hover:bg-white/25 hover:text-white transition border border-white/10"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all duration-500 rounded-full ${
                  i === current
                    ? "w-8 h-2 bg-white/70"
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
      {item.link_url && (
        <a
          href={item.link_url}
          className="absolute inset-0 z-10"
          aria-label={item.title || "轮播图"}
        />
      )}
    </div>
  )
}
