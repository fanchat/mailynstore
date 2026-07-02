"use client"

import { useParams } from "next/navigation"

export default function StoreTopBar() {
  const params = useParams()
  const countryCode = params.countryCode as string

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-[110px] mx-auto border-b bg-white border-gray-200">
        <div className="flex flex-col items-center justify-center h-full px-4 leading-tight">
          <span className="font-semibold text-lg tracking-widest uppercase">
            Mailyn's
          </span>
          <span className="text-xs text-gray-500 mt-0.5 tracking-wide">
            天下一家 · 共享科技进步
          </span>
        </div>
      </header>
    </div>
  )
}