"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

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
    if (!confirm("确认删除这条朋友圈？")) return
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
        loadComments()
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
                  <button onClick={() => { setMenuOpen(false); handleDelete() }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-500">
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
              <video key={i} src={url} className="w-full aspect-square object-cover rounded" />
            ) : (
              <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded" />
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
    </div>
  )
}

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [myNickname, setMyNickname] = useState("")
  const [feedType, setFeedType] = useState<"friend" | "work">("friend")

  const loadPosts = useCallback(async (type?: string) => {
    try {
      const effectiveType = type || feedType
      const res = await fetch(`/api/social/posts?type=${effectiveType}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.data || data)
      }
    } catch (e) {
      console.error("feed error", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    loadPosts(feedType)
    // Load my nickname
    fetch("/api/social/profile").then(r => r.json()).then(d => {
      setMyNickname(d.data?.nickname || "我")
    }).catch(() => {})
  }, [feedType, loadPosts])

  const switchType = (type: "friend" | "work") => {
    if (type !== feedType) {
      setFeedType(type)
    }
  }

  const params = useParams()
  const countryCode = params.countryCode as string

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Folder-style tabs */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => switchType("friend")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            feedType === "friend"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📁 生活圈
        </button>
        <button
          onClick={() => switchType("work")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            feedType === "work"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📁 工作圈
        </button>
      </div>

      {/* Quick post box */}
      <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
        <Link
          href={`/${countryCode}/social/new-post`}
          className="block w-full text-left px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-400 hover:bg-gray-100"
        >
          {feedType === "friend" ? "分享生活..." : "分享工作..."}
        </Link>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {feedType === "friend" ? "暂无生活动态" : "暂无工作动态"}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onRefresh={() => loadPosts(feedType)} />
        ))
      )}
    </div>
  )
}