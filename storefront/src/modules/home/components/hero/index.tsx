"use client"

import { useState, useCallback, useRef, useEffect } from "react"

const IMAGES = [
  "freiburg-1.jpg","freiburg-2.jpg","freiburg-3.jpg","freiburg-4.jpg","freiburg-5.jpg","freiburg-alt2.jpg",
  "wine-1.jpg","wine-2.jpg","wine-3.jpg","wine-4.jpg","wine-alt1.jpg",
  "family-1.jpg","family-2.jpg","family-3.jpg","family-alt1.jpg",
  "sourcing-1.jpg","sourcing-2.jpg","sourcing-3.jpg","sourcing-4.jpg",
  "textile-1.jpg","textile-2.jpg","textile-3.jpg","textile-4.jpg","textile-5.jpg","textile-6.jpg",
]

const TEXTS = [
  // === Freiburg / 黑森林 / 风光 (6张) ===
  {
    line1: "德国，美丽的国度",
    line2: "我们在黑森林深处等你",
    line3: "— 弗莱堡 · 欧洲之心 —",
  },
  {
    line1: "森林、城堡与古桥",
    line2: "这就是我们生活的土地",
    line3: "— 黑森林 · 德国 —",
  },
  {
    line1: "自然与文明的交汇处",
    line2: "弗莱堡，欧洲最阳光的城市",
    line3:"— 德国 · 巴登-符腾堡 —",
  },
  {
    line1: "毗邻瑞士与法国",
    line3: "— 三国交界 · 无限可能 —",
    line2: "从弗莱堡出发，一日穿越三国",
  },
  {
    line1: "这里通向整个欧洲",
    line3: "— 弗莱堡 · 德国 —",
    line2: "为中国供应商打开欧盟之门",
  },
  {
    line1: "百年橡木桶的呼吸",
    line3: "— 📍 黑森林 · 德国 —",
    line2: "森林深处，藏着时间酿造的味道",
  },

  // === 葡萄酒 / 威士忌 (5张) ===
  {
    line1: "阳光、山坡与葡萄藤",
    line2: "巴登产区，德国最南端的秘密",
    line3: "— 莱茵河畔 · 美酒之乡 —",
  },
  {
    line1: "从葡萄到佳酿",
    line3: "— 🍷 巴登葡萄酒产区 —",
    line2: "每一滴都是风土的诗篇",
  },
  {
    line1: "不仅是葡萄酒",
    line3: "— 德国威士忌 · 悄然崛起 —",
    line2: "黑森林橡木桶里，藏着德意志的烈酒野心",
  },
  {
    line1: "举杯，敬中欧",
    line3: "— 弗莱堡 · 德国美酒 —",
    line2: "最纯正的酒，来自最纯净的土地",
  },
  {
    line1: "舌尖上的德国",
    line3: "— 味觉之旅 · 弗莱堡 —",
    line2: "黑森林的火腿、葡萄酒、威士忌与芝士",
  },

  // === 家庭 / 幸福时光 (4张) ===
  {
    line1: "一家人，一片森林",
    line3: "— 👨‍👩‍👧‍👦 黑森林 · 幸福时光 —",
    line2: "孩子们的童年，在自然里生长",
  },
  {
    line1: "德国，是我们安家的地方",
    line3: "— Freiburg im Breisgau —",
    line2: "也是通往中国梦的桥梁",
  },
  {
    line1: "幸福，就是一起探索",
    line2: "在森林徒步，在山谷眺望",
    line3: "— 黑森林 · 家庭日 —",
  },
  {
    line1: "生活在中欧十字路口",
    line3: "— 🇩🇪🇨🇭🇫🇷 三国之间 —",
    line2: "让孩子在世界里长大",
  },

  // === 供应商 / 工厂 / 采购 (4张) ===
  {
    line1: "为品质而来",
    line2: "德国标准 · 中国效率",
    line3: "— 中欧供应链桥梁 —",
  },
  {
    line1: "我们在中国寻找",
    line3: "— 最好的供应商 · 最优的品质 —",
    line2: "同时也将德国精品带回中国",
  },
  {
    line1: "不止是贸易",
    line2: "更是信任的传递",
    line3: "— 🇩🇪 品质 · 🇨🇳 制造 · 🌍 共赢 —",
  },
  {
    line1: "从图纸到货架",
    line2: "我们在中德之间编织网络",
    line3: "— 采购 · 品控 · 物流 · 一站直达 —",
  },

  // === 家纺产品 (6张) ===
  {
    line1: "德国品质，家纺典范",
    line2: "每一针每一线，都是承诺",
    line3: "— 🛏️ 优质家纺 · 德国标准 —",
  },
  {
    line1: "让睡眠成为享受",
    line2: "德国设计 · 中国匠心",
    line3: "— 家纺系列 · 舒适之选 —",
  },
  {
    line1: "从黑森林到你的卧室",
    line2: "我们用最严格的标准挑选",
    line3: "— 家纺 · 床品 · 生活美学 —",
  },
  {
    line1: "柔软，是一种态度",
    line2: "德国品质管控的中国精品",
    line3: "— 家纺 · 母婴级安全 —",
  },
  {
    line1: "以德之名",
    line2: "把最好的家纺带给最爱的人",
    line3: "— 德国严选 · 家纺系列 —",
  },
  {
    line1: "好产品，跨越山海",
    line2: "我们在弗莱堡为你把关",
    line3: "— 家纺臻品 · 德质标杆 —",
  },
]

interface SlideData {
  id: number
  image: string
  text: (typeof TEXTS)[number]
}

const SLIDES: SlideData[] = IMAGES.map((img, i) => ({
  id: i,
  image: img,
  text: TEXTS[i % TEXTS.length]!,
}))

const Hero = () => {
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]))
  const touchX = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const go = useCallback((idx: number) => setCurrent(idx), [])
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % SLIDES.length),
    []
  )
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length),
    []
  )

  useEffect(() => {
    const toLoad = new Set(loaded)
    for (const offset of [-1, 0, 1, 2]) {
      const idx = (current + offset + SLIDES.length) % SLIDES.length
      toLoad.add(idx)
    }
    if (toLoad.size > loaded.size) {
      const timer = setTimeout(() => setLoaded(toLoad), 100)
      return () => clearTimeout(timer)
    }
  }, [current])

  useEffect(() => {
    timerRef.current = setInterval(next, 5000)
    return () => clearInterval(timerRef.current)
  }, [next])

  const handleManual = useCallback(
    (fn: () => void) => {
      clearInterval(timerRef.current)
      fn()
      timerRef.current = setInterval(next, 5000)
    },
    [next]
  )

  const particlesFor = (i: number) => {
    const base = i % 7
    return [
      { x: 15 + (base * 5) % 70, y: 20 + (base * 7) % 60, sz: 4, d: 0 },
      { x: 75 - (base * 3) % 50, y: 15 + (base * 9) % 50, sz: 3, d: 0.3 },
      { x: 40 + (base * 8) % 30, y: 75 - (base * 4) % 40, sz: 5, d: 0.6 },
      { x: 85 - (base * 6) % 40, y: 65 - (base * 5) % 30, sz: 3, d: 0.9 },
      { x: 25 + (base * 4) % 50, y: 55 + (base * 3) % 20, sz: 2, d: 1.2 },
      { x: 60 - (base * 7) % 30, y: 30 + (base * 6) % 40, sz: 4, d: 0.5 },
      { x: 50 + (base * 9) % 30, y: 85 - (base * 8) % 30, sz: 3, d: 0.8 },
    ]
  }

  return (
    <div className="h-[calc(100vh-174px)] flex flex-col">
      <div
        className="relative flex-1 w-full overflow-hidden"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = touchX.current - e.changedTouches[0].clientX
          if (Math.abs(dx) > 50) handleManual(dx > 0 ? next : prev)
        }}
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === current
          const t = slide.text
          const particles = particlesFor(i)

          return (
            <div key={slide.id} className="absolute inset-0">
              {/* Background image */}
              <div
                className={`absolute inset-0 transition-all duration-1000 ease-out ${
                  isActive ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                {loaded.has(i) && (
                  <img
                    src={`/images/hero/${slide.image}`}
                    alt=""
                    className="w-full h-full object-cover"
                    loading={i < 3 ? "eager" : "lazy"}
                    onLoad={() => setLoaded((s) => new Set(s).add(i))}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
              </div>

              {/* Particles */}
              {loaded.has(i) && (
                <div
                  className={`absolute inset-0 transition-all duration-1000 ease-out ${
                    isActive ? "opacity-100 z-[2]" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <div className="absolute -top-1/3 -right-1/4 w-[120%] h-[120%] opacity-[0.06]">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent blur-3xl" />
                  </div>
                  {particles.map((p, pi) => (
                    <div
                      key={pi}
                      className="absolute rounded-full bg-white/15 backdrop-blur-sm animate-float"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.sz * 4}px`,
                        height: `${p.sz * 4}px`,
                        animationDelay: `${p.d}s`,
                        animationDuration: `${3 + p.d}s`,
                      }}
                    />
                  ))}
                  <div
                    className="absolute inset-0 opacity-[0.06] animate-sweep"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
                    }}
                  />
                </div>
              )}

              {/* Text overlay */}
              <div
                className={`absolute inset-0 z-[3] flex flex-col items-center justify-center px-8 transition-all duration-800 ease-out ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] text-white text-center drop-shadow-lg leading-relaxed">
                  {t.line1}
                </h2>

                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent my-4" />

                <p className="text-base md:text-lg text-white/70 tracking-[0.1em] font-light text-center max-w-md">
                  {t.line2}
                </p>

                <p className="text-xs md:text-sm text-white/40 mt-5 text-center tracking-widest">
                  {t.line3}
                </p>
              </div>
            </div>
          )
        })}

        {/* Arrows */}
        <button onClick={() => handleManual(prev)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xl hover:bg-white/25 hover:text-white transition-all duration-300 border border-white/10"
          aria-label="上一个">‹</button>

        <button onClick={() => handleManual(next)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xl hover:bg-white/25 hover:text-white transition-all duration-300 border border-white/10"
          aria-label="下一个">›</button>

        {/* Dots */}
        <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-1.5 flex-wrap px-10">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => handleManual(() => go(i))}
              aria-label={`Slide ${i + 1}`}
              className={`transition-all duration-500 rounded-full ${
                i === current
                  ? "w-8 h-2 bg-white/70"
                  : "w-2 h-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 flex flex-col justify-center items-center text-center px-6 py-6 bg-gradient-to-t from-stone-50 to-amber-50/30">
        <p className="text-xs text-ui-fg-muted tracking-wider leading-relaxed max-w-xs">
          以信相待 · 丰盛人生
        </p>
        <div className="w-6 h-px bg-amber-200/40 mt-2 mb-1" />
        <p className="text-[10px] text-ui-fg-muted/60 tracking-widest">
          中国采购 · 德国品质 · 全球供应链
        </p>
      </div>
    </div>
  )
}

export default Hero
