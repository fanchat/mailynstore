"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import MediaViewer from "./components/MediaViewer"
import ConfirmDialog from "./components/ConfirmDialog"

interface Post {
  id: number
  customer_id: string
  type: string
  content: string
  media_urls: string[]
  location: string | null
  visibility: string
  is_pinned: boolean
  comments_enabled: boolean
  created_at: string
  like_count: number
  liked: boolean
  comment_count: number
  customer: {
    id: string
    email: string
    nickname: string | null
    avatar: string | null
    signature: string | null
  }
}

interface PostCardProps {
  post: Post
  onRefresh: () => void
}

function PostCard({ post, onRefresh }: PostCardProps) {
  const [liking, setLiking] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState("")
  const [myCustomerId, setMyCustomerId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const params = useParams()
  const countryCode = params.countryCode as string

  // Load current user's customer id for ownership check
  useEffect(() => {
    fetch("/api/social/profile")
      .then(r => r.json())
      .then(d => setMyCustomerId(d.data?.id || null))
      .catch(() => {})
  }, [])

  const isOwner = myCustomerId === post.customer_id

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "刚刚"
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    try {
      const res = await fetch(`/api/social/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })
      if (res.ok) {
        onRefresh()
      }
    } catch (e) {
      console.error("like error", e)
    }
    setLiking(false)
  }

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`)
      if (res.ok) {
        const json = await res.json()
        setComments(json.data || json)
      }
    } catch (e) {
      console.error("comments error", e)
    }
  }

  const toggleComments = () => {
    if (!showComments) {
      loadComments()
    }
    setShowComments(!showComments)
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onRefresh()
      } else {
        alert("删除失败")
      }
    } catch (e) {
      console.error("delete error", e)
      alert("网络错误")
    }
    setShowDeleteConfirm(false)
  }

  const handlePin = async () => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}/pin`, { method: "POST" })
      if (res.ok) onRefresh()
    } catch { alert("操作失败") }
    setMenuOpen(false)
  }

  const handleMoveUp = async () => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}/move-up`, { method: "POST" })
      if (res.ok) onRefresh()
      else { const d = await res.json(); alert(d.error || "操作失败") }
    } catch { alert("操作失败") }
    setMenuOpen(false)
  }

  const handleToggleComments = async () => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments_enabled: !post.comments_enabled }),
      })
      if (res.ok) onRefresh()
    } catch { alert("操作失败") }
    setMenuOpen(false)
  }

  const handleEditSave = async (content: string) => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) { setEditing(false); onRefresh() }
      else alert("保存失败")
    } catch { alert("网络错误") }
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, content: commentText }),
      })
      if (res.ok) {
        setCommentText("")
        setShowComments(false)
        onRefresh()
      }
    } catch (e) {
      console.error("comment error", e)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4 p-4 relative">
      {/* Header */}
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {post.customer.avatar ? (
            <img src={post.customer.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">
              {post.customer.nickname?.[0] || "?"}
            </div>
          )}
        </div>
        <div className="ml-3 flex-1">
          <div className="font-medium text-sm">
            {post.customer.nickname || post.customer.email}
            {post.is_pinned && <span className="text-orange-500 ml-1">📌</span>}
          </div>
          <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
        </div>
        {/* ⋮ Menu button — own posts only */}
        {isOwner && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-12 right-4 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[10rem] text-sm">
                  <button onClick={handlePin} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                    📌 {post.is_pinned ? '取消置顶' : '置顶'}
                  </button>
                  <button onClick={handleMoveUp} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                    ⬆ 上移一位
                  </button>
                  <button onClick={() => { setMenuOpen(false); setEditing(true) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                    ✏️ 编辑
                  </button>
                  <button onClick={handleToggleComments} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                    💬 {post.comments_enabled ? '关闭评论' : '开启评论'}
                  </button>
                  <button onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-500">
                    🗑 删除
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="mb-3">
          <textarea
            defaultValue={post.content}
            id={`edit-${post.id}`}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 px-3 py-1 border rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button onClick={() => {
              const el = document.getElementById(`edit-${post.id}`) as HTMLTextAreaElement
              if (el) handleEditSave(el.value)
            }} className="text-sm text-white bg-blue-500 px-3 py-1 rounded-lg hover:bg-blue-600">
              保存
            </button>
          </div>
        </div>
      ) : (
        post.content && <div className="text-sm mb-3 whitespace-pre-wrap">{post.content}</div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mb-3">
          {post.media_urls.map((url, i) => {
            const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)
            return isVideo ? (
              <button key={i} onClick={() => setMediaViewerIndex(i)} className="relative aspect-square overflow-hidden rounded group">
                <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                  <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center text-gray-800 text-xl">▶</div>
                </div>
              </button>
            ) : (
              <button key={i} onClick={() => setMediaViewerIndex(i)} className="aspect-square overflow-hidden rounded">
                <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </button>
            )
          })}
        </div>
      )}

      {/* Location */}
      {post.location && (
        <div className="text-xs text-gray-400 mb-2">📍 {post.location}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 ${post.liked ? "text-red-500" : ""}`}
        >
          {post.liked ? "❤️" : "🤍"} {post.like_count}
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1">
          💬 {post.comment_count}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 border-t pt-3">
          {comments.map((c: any) => (
            <div key={c.id} className="flex items-start mb-2 text-sm">
              <div className="text-blue-600 font-medium mr-2 shrink-0">
                {c.customer?.nickname || "用户"}:
              </div>
              <div>{c.content}</div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写评论..."
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <button
              onClick={submitComment}
              className="text-blue-600 text-sm font-medium"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* Media viewer overlay */}
      {mediaViewerIndex !== null && post.media_urls && (
        <MediaViewer
          urls={post.media_urls.map((url: string) => ({
            url,
            isVideo: /\.(mp4|mov|avi|webm)$/i.test(url),
          }))}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerIndex(null)}
        />
      )}
      <ConfirmDialog
        open={showDeleteConfirm}
        message="确认删除这条朋友圈？"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [myNickname, setMyNickname] = useState("")
  const [feedType, setFeedType] = useState<"friend" | "work">("friend")
  const [viewingFriendId, setViewingFriendId] = useState("")
  const [workProfile, setWorkProfile] = useState<any>(null)
  const [friendProfile, setFriendProfile] = useState<any>(null)

  const searchParams = useSearchParams()
  const focusCustomerId = searchParams?.get("focus") || ""

  const loadPosts = useCallback(async (type?: string) => {
    try {
      const effectiveType = type || feedType
      setViewingFriendId(focusCustomerId)
      let url: string
      if (focusCustomerId) {
        // Visit a friend's garden
        url = `/api/social/posts?customer_id=${focusCustomerId}`
      } else {
        // My own garden — my posts only, filtered by tab type
        url = `/api/social/posts?scope=mine&type=${effectiveType}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.data || data)
      }
    } catch (e) {
      console.error("feed error", e)
    }
    setLoading(false)
  }, [feedType, focusCustomerId])

  useEffect(() => {
    setLoading(true)
    loadPosts(feedType)
    if (focusCustomerId) {
      // Visiting a friend — load their profile
      fetch(`/api/social/profile?customer_id=${focusCustomerId}`).then(r => r.json()).then(d => {
        setFriendProfile(d.data || null)
      }).catch(() => {})
      setWorkProfile(null)
    } else {
      // My own circles — load my profile
      fetch("/api/social/profile").then(r => r.json()).then(d => {
        setMyNickname(d.data?.nickname || "我")
        setWorkProfile(d.data?.work_profile || null)
      }).catch(() => {})
      setFriendProfile(null)
    }
  }, [feedType, loadPosts, focusCustomerId])

  const switchType = (type: "friend" | "work") => {
    if (type !== feedType) {
      setFeedType(type)
    }
  }

  const params = useParams()
  const countryCode = params.countryCode as string

  return (
    <div className="max-w-lg mx-auto px-4 py-4 w-full">
      {/* 工作信息卡片 */}
      {((!viewingFriendId && workProfile) || (viewingFriendId && friendProfile?.work_profile)) && (() => {
        const isFriend = !!viewingFriendId
        const wp = isFriend ? friendProfile.work_profile : workProfile
        const services: string[] = wp.services
          ? (Array.isArray(wp.services) ? wp.services : (() => { try { return JSON.parse(wp.services) } catch { return [] } })())
          : []
        const hasInfo = wp.company_name || wp.job_title || services.length > 0 || wp.office_address || wp.contact
        if (!hasInfo) return null
        return (
          <div className="relative mb-5 overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-white to-blue-50 shadow-[0_2px_12px_-3px_rgba(59,130,246,0.15)] border border-blue-100/60">
            {/* Decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400" />
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-blue-100/40 to-sky-100/40 blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-100/30 to-blue-100/30 blur-lg" />

            <div className="relative px-4 pt-4 pb-3.5">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 shadow-sm">
                  <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-800 tracking-wide">工作信息</span>
              </div>

              <div className="space-y-2.5">
                {wp.company_name && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 text-center text-base">🏢</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-800">{wp.company_name}</span>
                      {wp.job_title && (
                        <>
                          <span className="text-gray-300 mx-1.5">·</span>
                          <span className="text-gray-500">{wp.job_title}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 text-center text-base">🔧</span>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {services.map((s: string, i: number) => (
                        <span key={i} className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border border-blue-200/60 shadow-[0_1px_2px_rgba(59,130,246,0.06)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {wp.office_address && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 text-center text-base">📍</span>
                    <span className="text-gray-700">{wp.office_address}</span>
                  </div>
                )}

                {wp.contact && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 text-center text-base">📞</span>
                    <span className="text-gray-700 font-medium">{wp.contact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Folder-style tabs */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => switchType("friend")}
          className={`w-1/2 py-2 text-sm font-medium rounded-md transition-all text-center ${
            feedType === "friend"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📁 生活圈
        </button>
        <button
          onClick={() => switchType("work")}
          className={`w-1/2 py-2 text-sm font-medium rounded-md transition-all text-center ${
            feedType === "work"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📁 工作圈
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {viewingFriendId ? "你的好友还没有可显示的发布" : feedType === "friend" ? "暂无生活动态" : "暂无工作动态"}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onRefresh={() => loadPosts(feedType)} />
        ))
      )}
    </div>
  )
}