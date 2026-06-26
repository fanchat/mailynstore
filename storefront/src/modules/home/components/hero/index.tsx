"use client"

import { useState, useCallback, useRef } from "react"

const SLIDES = [
  { id: 1, video: "/videos/slide1.mp4" },
  { id: 2, video: "/videos/slide2.mp4" },
  { id: 3, video: "/videos/slide3.mp4" },
]

const Hero = () => {
  const [current, setCurrent] = useState(0)
  const touchX = useRef(0)

  const go = useCallback((idx: number) => setCurrent(idx), [])
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % SLIDES.length),
    []
  )
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length),
    []
  )

  return (
    <div className="h-[calc(100vh-174px)] flex flex-col">
      {/* 上部：轮播区 — 占满剩余空间 */}
      <div
        className="relative flex-1 w-full overflow-hidden"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          const dx = touchX.current - e.changedTouches[0].clientX
          if (Math.abs(dx) > 50) dx > 0 ? next() : prev()
        }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === current ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {i === current && (
              <video
                key={s.id}
                src={s.video}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onEnded={next}
              />
            )}
          </div>
        ))}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20 z-[2]" />

        {/* Left / Right arrows */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white text-xl hover:bg-white/40 transition"
          aria-label="上一个"
        >
          ‹
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white text-xl hover:bg-white/40 transition"
          aria-label="下一个"
        >
          ›
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 下部：定位文案 — 按内容自动高度 */}
      <div className="flex-shrink-0 flex flex-col justify-center items-center text-center px-6 py-8 bg-gradient-to-t from-stone-50 to-rose-50/40">
        <p className="text-base text-ui-fg-base font-medium max-w-xs leading-relaxed tracking-wide">
          德国本地线上展厅
        </p>
        <p className="text-xs text-ui-fg-subtle max-w-[14rem] leading-relaxed mt-2 tracking-wider text-amber-700/80">
          甄选 · 零售到家
        </p>
        <div className="w-8 h-px bg-amber-200/60 my-4" />
        <p className="text-sm text-ui-fg-subtle max-w-xs leading-relaxed">
          每一件都由中国最优质的店长亲手精选
        </p>
        <p className="text-sm text-ui-fg-subtle max-w-xs leading-relaxed mt-1">
          全部一手货源，直供德国
        </p>
        <p className="text-xs text-ui-fg-muted max-w-[14rem] leading-relaxed mt-4 italic">
          滑动上方视频，了解我们的工作场景与生产环境
        </p>
      </div>
    </div>
  )
}

export default Hero