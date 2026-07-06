"use client"

import { useState, useEffect } from "react"

export default function BottomBand() {
  const [bannerUrl, setBannerUrl] = useState("")

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.bottom) setBannerUrl(d.data.bottom)
      })
      .catch(() => {})
  }, [])

  if (bannerUrl) {
    return (
      <div className="h-[215px] flex-shrink-0 border-t border-gray-200 bg-white overflow-hidden">
        <img
          src={bannerUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="h-[215px] flex-shrink-0 border-t border-gray-200 bg-white flex flex-col items-center justify-center text-center px-6">
      <span className="text-sm md:text-base text-gray-600 tracking-wider leading-relaxed max-w-xs">
        &nbsp;
      </span>
      <div className="w-8 h-px bg-amber-200/50 mt-3 mb-2" />
      <span className="text-xs text-gray-400 tracking-widest">
        &nbsp;
      </span>
    </div>
  )
}
