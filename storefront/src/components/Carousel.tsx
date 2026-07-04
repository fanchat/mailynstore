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
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-100" style={{ aspectRatio: "21 / 9" }}>
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        {item.title && <h2 className="text-xl font-bold">{item.title}</h2>}
        {item.subtitle && <p className="text-sm opacity-90 mt-1">{item.subtitle}</p>}
      </div>
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-800 hover:bg-white transition"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-800 hover:bg-white transition"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition ${i === current ? "bg-white" : "bg-white/40"}`}
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
