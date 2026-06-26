"use client"

import { useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

interface MediaItem {
  url: string
  file: File
  preview: string // data URL for preview
}

export default function NewPostPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const countryCode = params.countryCode as string
  const isPersonal = searchParams.get("scope") === "personal"
  const [content, setContent] = useState("")
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 20 * 1024 * 1024) {
          alert(`${file.name} 超过 20MB，已跳过`)
          continue
        }
        // Create preview
        const preview = URL.createObjectURL(file)
        // Upload to backend
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/social/media", {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          setMediaItems((prev) => [
            ...prev,
            { url: data.url, file, preview },
          ])
        } else {
          alert(`${file.name} 上传失败`)
        }
      }
    } catch {
      alert("上传出错")
    }
    setUploading(false)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  const removeMedia = (index: number) => {
    const item = mediaItems[index]
    URL.revokeObjectURL(item.preview)
    setMediaItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if ((!content.trim() && mediaItems.length === 0) || posting) return
    setPosting(true)
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isPersonal ? "personal" : "friend",
          content: content.trim() || undefined,
          media_urls: mediaItems.map((m) => m.url),
        }),
      })
      if (res.ok) {
        router.push(isPersonal
          ? `/${countryCode}/social/profile`
          : `/${countryCode}/social`)
      } else {
        const data = await res.json()
        alert(data.error || "发布失败")
      }
    } catch (e) {
      alert("网络错误")
    }
    setPosting(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享新鲜事..."
          className="w-full min-h-[200px] border-0 outline-none resize-none text-sm"
          autoFocus
        />

        {/* Media preview grid */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {mediaItems.map((item, i) => {
              const isVideo = item.file.type.startsWith("video/")
              return (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {isVideo ? (
                    <video src={item.preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/70"
                  >
                    ✕
                  </button>
                  {isVideo && (
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      ▶
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            {/* Add image/video button */}
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
              {uploading ? "上传中..." : "添加图片/视频"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {mediaItems.length > 0 && (
              <span className="text-xs text-gray-400">{mediaItems.length} 个文件</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-500"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && mediaItems.length === 0) || posting || uploading}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {posting ? "发布中..." : "发布"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}