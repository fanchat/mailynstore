"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import MediaViewer from "../components/MediaViewer"
import ConfirmDialog from "../components/ConfirmDialog"

const calcAge = (birthday: string) => {
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function SocialProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const params = useParams()
  const countryCode = params.countryCode as string
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [privatePosts, setPrivatePosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)
  const [editingPost, setEditingPost] = useState<any | null>(null)
  const [viewerState, setViewerState] = useState<{ postId: number; index: number } | null>(null)
  const [toastMsg, setToastMsg] = useState("")
  const [confirmDeletePost, setConfirmDeletePost] = useState<any | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [newContent, setNewContent] = useState("")
  const [newMedia, setNewMedia] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // Edit modals state
  const [showPersonalEdit, setShowPersonalEdit] = useState(false)
  const [showWorkEdit, setShowWorkEdit] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/social/profile")
      if (res.ok) {
        const d = await res.json()
        setProfile(d.data || d)
      }
    } catch {}
    setLoading(false)
  }

  const loadMyPosts = async () => {
    setLoadingPosts(true)
    try {
      const res = await fetch("/api/social/posts?scope=mine&type=personal&limit=20")
      if (res.ok) {
        const d = await res.json()
        setPrivatePosts(d.data || d)
      }
    } catch {}
    setLoadingPosts(false)
  }

  // ── Post actions ──
  const handlePin = async (post: any) => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}/pin`, { method: "POST" })
      if (res.ok) loadMyPosts()
    } catch { alert("操作失败") }
  }

  const handleMoveUp = async (post: any) => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}/move-up`, { method: "POST" })
      if (res.ok) loadMyPosts()
      else { const d = await res.json(); alert(d.error || "操作失败") }
    } catch { alert("操作失败") }
  }

  const handlePublishTo = async (post: any, type: string) => {
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content: post.content || "",
          media_urls: post.media_urls || [],
        }),
      })
      if (res.ok) {
        const msg = type === "friend" ? "已发布到生活圈" : "已发布到工作圈"
        setToastMsg(msg)
        setTimeout(() => setToastMsg(""), 2000)
        loadMyPosts()
      } else {
        const d = await res.json()
        setToastMsg(d.error || "发布失败")
        setTimeout(() => setToastMsg(""), 2000)
      }
    } catch { setToastMsg("操作失败"); setTimeout(() => setToastMsg(""), 2000) }
  }

  const handleDeletePost = async (post: any) => {
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, { method: "DELETE" })
      if (res.ok) loadMyPosts()
      else alert("删除失败")
    } catch { alert("网络错误") }
    setConfirmDeletePost(null)
  }

  const handleEditSave = async (postId: number, data: any) => {
    try {
      const res = await fetch(`/api/social/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) { setEditingPost(null); loadMyPosts() }
      else alert("保存失败")
    } catch { alert("网络错误") }
  }

  // ── Publish a new post ──
  const handleMediaUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingMedia(true)
    const formData = new FormData()
    formData.append("file", files[0])
    try {
      const res = await fetch("/api/social/media", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setNewMedia((prev) => [...prev, data.url])
      } else {
        const err = await res.text()
        alert("上传失败: " + (err.length > 80 ? err.slice(0, 80) + "..." : err))
      }
    } catch (e) {
      alert("上传出错: " + (e instanceof Error ? e.message : String(e)))
    }
    setUploadingMedia(false)
  }

  const handleRemoveMedia = (url: string) => {
    setNewMedia((prev) => prev.filter((u) => u !== url))
  }

  const handlePublish = async () => {
    if (!newContent.trim() && newMedia.length === 0) return
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "personal",
          content: newContent.trim(),
          media_urls: newMedia.length > 0 ? newMedia : undefined,
        }),
      })
      if (res.ok) {
        setNewContent(""); setNewMedia([]); setShowPostForm(false)
        loadMyPosts()
      } else alert("发布失败")
    } catch { alert("网络错误") }
  }

  useEffect(() => {
    loadProfile()
    loadMyPosts()
  }, [])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("图片不能超过 5MB")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/social/profile/avatar", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const { url } = await res.json()
        setProfile(prev => prev ? { ...prev, avatar: url } : prev)
      } else {
        alert("上传失败")
      }
    } catch (e) {
      alert("上传出错")
    }
    setUploading(false)
  }

  const editNickname = () => {
    setShowRenameModal(true)
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-8">加载中...</div>
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-200 to-amber-100 flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-12 h-12 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">还未登录</p>
        <p className="text-sm text-gray-400 text-center max-w-[16rem] leading-relaxed mb-6">
          登录后即可查看个人资料、<br/>管理动态和好友
        </p>
        <a
          href={`/${countryCode}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-400 to-amber-400 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg hover:from-rose-500 hover:to-amber-500 transition-all"
        >
          去商城 → 我的
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    )
  }

  const wp = profile.work_profile
  const wpServices: string[] = wp?.services
    ? (Array.isArray(wp.services) ? wp.services : (() => { try { return JSON.parse(wp.services); } catch { return []; } })())
    : []
  const hasWorkInfo = wp && (
    wp.company_name || wp.job_title || wp.office_address || wp.contact ||
    wpServices.length > 0
  )

  return (
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
            {toastMsg}
          </div>
        )}

        {/* Profile header */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center">
        <div className="relative">
          <div
            onClick={uploading ? undefined : handleAvatarClick}
            className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                {(profile.nickname || profile.email)?.[0] || "?"}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
            {uploading ? (
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex items-center mt-3 gap-1">
          <div className="text-lg font-medium">{profile.nickname || profile.email}</div>
          <button onClick={editNickname} className="text-blue-500 hover:text-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{profile.email}</div>
        {profile.signature && (
          <div className="text-sm text-gray-400 mt-2 max-w-xs text-center">{profile.signature}</div>
        )}
      </div>

      {/* Work profile */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-sm">工作信息</div>
          <button onClick={() => setShowWorkEdit(true)} className="text-blue-500 text-xs hover:text-blue-600">
            {hasWorkInfo ? "编辑" : "添加"}
          </button>
        </div>
        {hasWorkInfo ? (
          <>
            {wp.company_name && (
              <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                <span>🏢</span> {wp.company_name}
              </div>
            )}
            {wp.job_title && (
              <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                <span>💼</span> {wp.job_title}
              </div>
            )}
            {wp.office_address && (
              <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                <span>📍</span> {wp.office_address}
              </div>
            )}
            {wp.contact && (
              <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                <span>📞</span> {wp.contact}
              </div>
            )}
            {wpServices.length > 0 && (
              <div className="text-sm text-gray-600 flex items-start gap-1.5">
                <span>📋</span>
                <span>{wpServices.join("、")}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">暂无工作信息，点击添加</div>
        )}
      </div>

      {/* Personal profile card */}
      <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-sm">个人资料</div>
          <button onClick={() => setShowPersonalEdit(true)} className="text-blue-500 text-xs hover:text-blue-600">
            编辑
          </button>
        </div>
        {profile.region && (
          <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
            <span>🏠</span> {profile.region}
          </div>
        )}
        {(() => {
          const wp = profile.work_profile
          const wpGender = wp?.gender
          const wpBirthday = wp?.birthday
          const hasInfo = profile.region || (wpGender !== undefined && wpGender > 0) || wpBirthday
          return (
            <>
              {wpGender !== undefined && wpGender > 0 && (
                <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                  {Number(wpGender) === 1 ? "男" : "女"}
                </div>
              )}
              {wpBirthday && (
                <div className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <span>🎂</span> {calcAge(wpBirthday) + "岁"}
                </div>
              )}
              {!hasInfo && <div className="text-sm text-gray-400">暂无资料</div>}
            </>
          )
        })()}
      </div>

      {/* My recent posts */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm">我的最近动态</div>
          <button
            onClick={() => setShowPostForm(!showPostForm)}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {showPostForm ? "收起" : "发布"}
          </button>
        </div>

        {/* ── Inline publish form ── */}
        {showPostForm && (
          <div className="bg-white rounded-lg shadow-sm mb-4 p-4 space-y-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="分享新鲜事..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            />
            {/* Media thumbnails */}
            {newMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newMedia.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded overflow-hidden group">
                    {/\.(mp4|mov|avi|webm)$/i.test(url) ? (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg">▶</div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(url)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add media button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => mediaInputRef.current?.click()}
                disabled={uploadingMedia}
                className="text-sm text-gray-500 flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {uploadingMedia ? "上传中..." : "📷 添加图片/视频"}
              </button>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { handleMediaUpload(e.target.files); e.target.value = "" }}
              />
              <span className="text-xs text-gray-400 ml-auto">发布到个人动态</span>
              <button
                onClick={handlePublish}
                disabled={!newContent.trim() && newMedia.length === 0}
                className="text-sm text-white bg-blue-500 px-4 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        )}
        {loadingPosts ? (
          <div className="text-center text-gray-400 py-4">加载中...</div>
        ) : privatePosts.length === 0 ? (
          <div className="text-center text-gray-400 py-4">暂无动态</div>
        ) : (
          <div className="space-y-2">
            {privatePosts.map((post: any) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm p-3 relative">
                {/* ⋮ Menu button */}
                {(() => {
                  const menuOpen = activeMenuId === post.id
                  return (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(menuOpen ? null : post.id) }}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                        </svg>
                      </button>
                      {menuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute top-8 right-2 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[10rem] text-sm">
                            <button onClick={() => { setActiveMenuId(null); handlePin(post) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                              📌 {post.is_pinned ? '取消置顶' : '置顶'}
                            </button>
                            <button onClick={() => { setActiveMenuId(null); handleMoveUp(post) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                              ⬆ 上移一位
                            </button>
                            <button onClick={() => { setActiveMenuId(null); handlePublishTo(post, 'friend') }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                              🌐 发布到生活圈
                            </button>
                            <button onClick={() => { setActiveMenuId(null); handlePublishTo(post, 'work') }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                💼 发布到工作圈
                              </button>
                            <button onClick={() => { setActiveMenuId(null); setEditingPost(post) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                              ✏️ 编辑
                            </button>
                            <button onClick={() => { setActiveMenuId(null); setConfirmDeletePost(post) }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-500">
                              🗑 删除
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )
                })()}
                {/* Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 pr-7">
                    {post.media_urls.map((url: string, i: number) => {
                      const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url)
                      return isVideo ? (
                        <button key={i} onClick={() => setViewerState({ postId: post.id, index: i })} className="relative aspect-square overflow-hidden rounded group">
                          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                            <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center text-gray-800 text-xl">▶</div>
                          </div>
                        </button>
                      ) : (
                        <button key={i} onClick={() => setViewerState({ postId: post.id, index: i })} className="aspect-square overflow-hidden rounded">
                          <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className={`text-sm text-gray-600 line-clamp-2 pr-7 ${post.media_urls?.length ? 'mt-2' : ''}`}>{post.content || ""}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(post.created_at).toLocaleString("zh-CN")}
                  {post.type === "work" && " · 工作圈"}
                  {post.is_pinned && " · 📌 置顶"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media viewer overlay */}
      {viewerState !== null && (() => {
        const post = privatePosts.find((p: any) => p.id === viewerState.postId)
        if (!post?.media_urls?.length) return null
        return (
          <MediaViewer
            urls={post.media_urls.map((url: string) => ({
              url,
              isVideo: /\.(mp4|mov|avi|webm)$/i.test(url),
            }))}
            initialIndex={viewerState.index}
            onClose={() => setViewerState(null)}
          />
        )
      })()}

      {/* ── Post Edit Modal ── */}
      {editingPost && (
        <PostEditModal
          post={editingPost}
          onSave={handleEditSave}
          onClose={() => setEditingPost(null)}
        />
      )}

      {/* ── Edit Personal Profile Modal ── */}
      {showPersonalEdit && (
        <PersonalEditModal
          profile={profile}
          onClose={() => setShowPersonalEdit(false)}
          onSaved={() => { setShowPersonalEdit(false); loadProfile() }}
        />
      )}

      {/* ── Rename Modal ── */}
      {showRenameModal && (
        <RenameModal
          current={profile.nickname || ""}
          onClose={() => setShowRenameModal(false)}
          onSaved={() => { setShowRenameModal(false); loadProfile() }}
        />
      )}

      {/* ── Edit Work Profile Modal ── */}
      {showWorkEdit && (
        <WorkEditModal
          wp={wp}
          onClose={() => setShowWorkEdit(false)}
          onSaved={() => { setShowWorkEdit(false); loadProfile() }}
        />
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={confirmDeletePost !== null}
        message="确认删除这条动态？"
        onConfirm={() => confirmDeletePost && handleDeletePost(confirmDeletePost)}
        onCancel={() => setConfirmDeletePost(null)}
      />
    </div>
  )
}

/* ===================== 动态编辑 Modal ===================== */
function PostEditModal({
  post,
  onSave,
  onClose,
}: {
  post: any
  onSave: (postId: number, data: any) => Promise<void>
  onClose: () => void
}) {
  const [content, setContent] = useState(post.content || "")
  const [editMedia, setEditMedia] = useState<string[]>(post.media_urls ? [...post.media_urls] : [])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [saving, setSaving] = useState(false)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingMedia(true)
    const formData = new FormData()
    formData.append("file", files[0])
    try {
      const res = await fetch("/api/social/media", { method: "POST", body: formData })
      if (res.ok) {
        const data = await res.json()
        setEditMedia((prev) => [...prev, data.url])
      } else {
        const err = await res.text()
        alert("上传失败: " + (err.length > 80 ? err.slice(0, 80) + "..." : err))
      }
    } catch (e) {
      alert("上传出错: " + (e instanceof Error ? e.message : String(e)))
    }
    setUploadingMedia(false)
  }

  const handleRemove = (url: string) => {
    setEditMedia((prev) => prev.filter((u) => u !== url))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(post.id, { content: content.trim(), media_urls: editMedia.length > 0 ? editMedia : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium">编辑动态</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享新鲜事..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
          />
          {/* Media thumbnails */}
          {editMedia.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editMedia.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded overflow-hidden group">
                  {/\.(mp4|mov|avi|webm)$/i.test(url) ? (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg">▶</div>
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => handleRemove(url)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Add media */}
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploadingMedia}
            className="text-sm text-gray-500 flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {uploadingMedia ? "上传中..." : "📷 添加图片/视频"}
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { handleUpload(e.target.files); e.target.value = "" }}
          />
        </div>
        <div className="flex gap-3 px-4 py-3 border-t">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ===================== Modal: 个人资料编辑 ===================== */
function PersonalEditModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: any
  onClose: () => void
  onSaved: () => void
}) {
  const [signature, setSignature] = useState(profile.signature || "")
  const [region, setRegion] = useState(profile.region || "")
  const [gender, setGender] = useState<number>(profile.work_profile?.gender ?? profile.gender ?? 0)
  const [birthday, setBirthday] = useState((profile.work_profile?.birthday || profile.birthday || "").split('T')[0] || "")
  const [displayName, setDisplayName] = useState(profile.work_profile?.display_name || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/social/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signature.trim(),
          region: region.trim(),
          gender,
          birthday: birthday || null,
          display_name: displayName.trim() || null,
        }),
      })
      if (res.ok) {
        onSaved()
      } else {
        alert("保存失败")
      }
    } catch {
      alert("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium">个人资料</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 称呼 */}
          <div>
            <div className="text-sm text-gray-500 mb-1">称呼</div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="你希望别人怎么称呼你"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* 性别 */}
          <div>
            <div className="text-sm text-gray-500 mb-2">性别</div>
            <div className="flex gap-2">
              {[{ label: "男", value: 1 }, { label: "女", value: 2 }, { label: "不显示", value: 0 }].map(
                (opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGender(opt.value)}
                    className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                      gender === opt.value
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 生日 */}
          <div>
            <div className="text-sm text-gray-500 mb-1">生日</div>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* 地区 */}
          <div>
            <div className="text-sm text-gray-500 mb-1">个人住址</div>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="如 Freiburg"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* 个性签名 */}
          <div>
            <div className="text-sm text-gray-500 mb-1">个性签名</div>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ===================== Modal: 工作信息编辑 ===================== */
function WorkEditModal({
  wp,
  onClose,
  onSaved,
}: {
  wp: any
  onClose: () => void
  onSaved: () => void
}) {
  const [company, setCompany] = useState(wp?.company_name || "")
  const [title, setTitle] = useState(wp?.job_title || "")
  const [address, setAddress] = useState(wp?.office_address || "")
  const [contact, setContact] = useState(wp?.contact || "")
  const [services, setServices] = useState(() => {
    const raw = wp?.services
    if (!raw) return ""
    const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })()
    return Array.isArray(arr) ? arr.join("、") : String(raw)
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const servicesArr: string[] = services
      .split(/[,，、]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s !== "")

    try {
      const res = await fetch("/api/social/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_profile: {
            company_name: company.trim(),
            job_title: title.trim(),
            office_address: address.trim(),
            contact: contact.trim(),
            services: servicesArr,
          },
        }),
      })
      if (res.ok) {
        onSaved()
      } else {
        alert("保存失败")
      }
    } catch {
      alert("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium">工作信息</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="text-sm text-gray-500 mb-1">公司名称</div>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="公司名称"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">职位</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="职位"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">服务区域</div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="如 杭州市区、西湖区"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">联系方式</div>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="电话/微信/邮箱等"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">服务介绍</div>
            <textarea
              value={services}
              onChange={(e) => setServices(e.target.value)}
              rows={2}
              placeholder="例：家电维修、空调、面包、散养土鸡"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            />
            <div className="text-xs text-amber-600 mt-1 leading-relaxed">
              💡 建议用短词、常用词，别人搜什么你就写什么<br />
              比如：空调维修、家电清洗、散养土鸡、草莓
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
/* ===================== Modal: 昵称修改 ===================== */
function RenameModal({
  current,
  onClose,
  onSaved,
}: {
  current: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(current)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === current) return
    setSaving(true)
    try {
      const res = await fetch("/api/social/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      })
      if (res.ok) {
        onSaved()
      } else {
        const d = await res.json()
        alert(d.error || "保存失败")
      }
    } catch {
      alert("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium">修改昵称</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="输入新昵称"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            autoFocus
          />
        </div>
        <div className="flex gap-3 px-4 py-3 border-t">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
