"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

export default function StoreTopBar() {
  const params = useParams()
  const countryCode = params.countryCode as string
  const [bannerUrl, setBannerUrl] = useState("")

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.top) setBannerUrl(d.data.top)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-[138px] mx-auto border-b bg-white border-gray-200 overflow-hidden">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4 leading-tight">
            <span className="font-semibold text-lg tracking-widest uppercase">
              Mailyn's
            </span>
            <span className="text-xs text-gray-500 mt-0.5 tracking-wide">
              天下一家 · 共享科技进步
            </span>
          </div>
        )}
      </header>
    </div>
  )
}
