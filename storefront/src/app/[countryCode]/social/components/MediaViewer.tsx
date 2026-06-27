"use client"

import { useState, useEffect } from "react"

interface MediaViewerProps {
  urls: { url: string; isVideo: boolean }[]
  initialIndex?: number
  onClose: () => void
}

export default function MediaViewer({ urls, initialIndex = 0, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const item = urls[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : i))
      if (e.key === "ArrowRight") setIndex((i) => (i < urls.length - 1 ? i + 1 : i))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [urls.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/30 z-10"
      >
        ✕
      </button>

      {urls.length > 1 && index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/30 z-10"
        >
          ‹
        </button>
      )}

      <div className="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        {item.isVideo ? (
          <video src={item.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg" />
        ) : (
          <img src={item.url} alt="" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
        )}
      </div>

      {urls.length > 1 && index < urls.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/30 z-10"
        >
          ›
        </button>
      )}

      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {index + 1} / {urls.length}
        </div>
      )}
    </div>
  )
}

/** Helper: extract video first frame as a poster data URL */
export function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.playsInline = true
    video.muted = true
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2)
    }
    video.onseeked = () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.6))
      video.remove()
    }
    video.onerror = () => {
      // Fallback: just show a generic video icon
      resolve("")
      video.remove()
    }
    video.src = URL.createObjectURL(file)
  })
}