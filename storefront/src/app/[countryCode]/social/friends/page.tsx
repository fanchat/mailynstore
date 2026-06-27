"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface Friend {
  id: string
  email: string
  nickname: string | null
  avatar: string | null
  signature: string | null
  friend_since: string
}

interface GroupConv {
  id: number
  type: string
  name: string | null
  members: { id: string; email: string; nickname: string | null; avatar: string | null }[]
  created_at: string
}

export default function FriendsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<GroupConv[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showQrCode, setShowQrCode] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [toastMsg, setToastMsg] = useState("")

  const params = useParams()
  const countryCode = params.countryCode as string
  const router = useRouter()

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [fRes, gRes, pRes] = await Promise.all([
        fetch("/api/social/friends"),
        fetch("/api/social/conversations"),
        fetch("/api/social/profile"),
      ])
      if (fRes.ok) { const d = await fRes.json(); setFriends(d.data || d) }
      if (gRes.ok) { const d = await gRes.json(); setGroups((d.data || d).filter((c: any) => c.type === "group")) }
      if (pRes.ok) { const d = await pRes.json(); setProfile(d.data || d) }
    } catch {}
    setLoading(false)
  }

  // Send friend request (called from add modal)
  const sendRequest = async (targetId: string) => {
    try {
      const res = await fetch("/api/social/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_customer_id: targetId }),
      })
      if (res.ok) {
        setToastMsg("好友请求已发送")
        setTimeout(() => setToastMsg(""), 2000)
        setShowAddFriend(false)
      } else {
        const d = await res.json()
        setToastMsg(d.error || "发送失败")
        setTimeout(() => setToastMsg(""), 2000)
      }
    } catch { setToastMsg("网络错误"); setTimeout(() => setToastMsg(""), 2000) }
  }

  // Create group conversation
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      const res = await fetch("/api/social/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", name, customer_ids: memberIds }),
      })
      if (res.ok) {
        setShowCreateGroup(false)
        loadAll()
      } else {
        const d = await res.json()
        alert(d.error || "建群失败")
      }
    } catch { alert("网络错误") }
  }

  const startChat = async (friendId: string) => {
    try {
      const res = await fetch("/api/social/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_customer_id: friendId }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/${countryCode}/social/chat/${data.id}`)
      } else {
        const d = await res.json()
        setToastMsg(d.error || "创建聊天失败")
        setTimeout(() => setToastMsg(""), 2000)
      }
    } catch {
      setToastMsg("网络错误")
      setTimeout(() => setToastMsg(""), 2000)
    }
  }

  const isFriend = (id: string) => friends.some(f => f.id === id)

  const profileId = profile?.id || null

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-sm hover:bg-gray-50"
        >
          <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">👥</span>
          <span>建群</span>
        </button>
        <button
          onClick={() => setShowAddFriend(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-sm hover:bg-gray-50"
        >
          <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">➕</span>
          <span>加好友</span>
        </button>
        <button
          onClick={() => setShowQrCode(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"
        >
          <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">📱</span>
          <span>我的二维码</span>
        </button>
      </div>

      {/* Friend requests indicator */}
      <FriendRequestBadge onAccepted={() => loadAll()} />

      {/* Groups list */}
      {groups.length > 0 && (
        <div className="mb-4">
          <div className="font-medium text-sm text-gray-500 mb-2">群聊 ({groups.length})</div>
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-lg shadow-sm mb-2 p-3">
              <div className="text-sm font-medium">{g.name || "未命名群"}</div>
              <div className="text-xs text-gray-400 mt-1">
                {g.members.map(m => m.nickname || m.email).join("、")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div>
        <div className="font-medium text-sm text-gray-500 mb-2">好友 ({friends.length})</div>
        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : friends.length === 0 ? (
          <div className="text-center text-gray-400 py-8">暂无好友，去搜索添加吧</div>
        ) : (
          friends.map((f) => (
            <div key={f.id} onClick={() => startChat(f.id)} className="bg-white rounded-lg shadow-sm mb-2 p-3 flex items-center cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {f.avatar ? (
                  <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    {(f.nickname || f.email)?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium">{f.nickname || f.email}</div>
                <div className="text-xs text-gray-400">{f.email}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add Friend Modal ── */}
      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-medium">加好友</div>
              <button onClick={() => setShowAddFriend(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">输入对方邮箱</div>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="邮箱地址"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div className="text-center text-xs text-gray-400">或让对方向你出示二维码</div>
            </div>
            <div className="flex gap-3 px-4 py-3 border-t">
              <button onClick={() => setShowAddFriend(false)} className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button
                onClick={async () => {
                  if (!addEmail.trim()) return
                  // Search the email, then send request
                  const res = await fetch(`/api/social/search?q=${encodeURIComponent(addEmail.trim().toLowerCase())}`)
                  if (res.ok) {
                    const d = await res.json()
                    const data = d.data || d
                    if (data.length > 0) {
                      await sendRequest(data[0].id)
                    } else {
                      alert("未找到该用户")
                    }
                  } else { alert("搜索失败") }
                }}
                className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
              >发送请求</button>
            </div>
          </div>
        </div>
      )}

      {/* ── My QR Code Modal ── */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-xs shadow-xl overflow-hidden text-center">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium">我的二维码</div>
              <button onClick={() => setShowQrCode(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=mailyns%3A%2F%2Fadd-friend%2F${encodeURIComponent(profile?.email || "")}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>
              <div className="text-sm font-medium">{profile?.nickname || profile?.email}</div>
              <div className="text-xs text-gray-400 mt-1">{profile?.email}</div>
              <div className="text-xs text-gray-400 mt-4">让对方扫描此码添加好友</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {showCreateGroup && (
        <CreateGroupModal
          friends={friends}
          onCreate={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  )
}

/* ============================ Friend Request Badge ============================ */
function FriendRequestBadge({ onAccepted }: { onAccepted: () => void }) {
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/social/friends/requests")
      .then(r => r.json())
      .then(d => {
        const data = d.data || d
        // API returns {received: [...], sent: [...]} or flat array
        const list = Array.isArray(data) ? data : (data?.received || [])
        setRequests(list.filter((r: any) => r.status === "pending"))
      })
      .catch(() => {})
  }, [])

  if (requests.length === 0) return null

  const handleAccept = async (reqId: number) => {
    try {
      const res = await fetch(`/api/social/friends/requests/${reqId}/accept`, { method: "POST" })
      if (res.ok) { onAccepted(); setRequests(prev => prev.filter(r => r.id !== reqId)) }
    } catch {}
  }

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4 p-3">
      <div className="text-sm font-medium mb-2">好友请求 ({requests.length})</div>
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between py-1">
          <span className="text-sm">{req.nickname || [req.first_name, req.last_name].filter(Boolean).join(" ") || req.email || req.requester_id?.slice(0, 12)}</span>
          <button
            onClick={() => handleAccept(req.id)}
            className="text-xs text-white bg-green-500 px-3 py-1 rounded hover:bg-green-600"
          >
            接受
          </button>
        </div>
      ))}
    </div>
  )
}

/* ============================ Create Group Modal ============================ */
function CreateGroupModal({
  friends,
  onCreate,
  onClose,
}: {
  friends: Friend[]
  onCreate: (name: string, memberIds: string[]) => Promise<void>
  onClose: () => void
}) {
  const [groupName, setGroupName] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleFriend = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCreate = async () => {
    if (!groupName.trim()) { alert("请输入群名称"); return }
    if (selected.length === 0) { alert("请选择至少一位好友"); return }
    setSaving(true)
    try {
      await onCreate(groupName.trim(), selected)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="font-medium">建群</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4 border-b shrink-0">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="群名称"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {friends.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">还没有好友，先去加好友吧</div>
          ) : (
            <div className="space-y-1">
              {friends.map((f) => (
                <label
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                    selected.includes(f.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(f.id)}
                    onChange={() => toggleFriend(f.id)}
                    className="accent-blue-500"
                  />
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {f.avatar ? (
                      <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {(f.nickname || f.email)?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="text-sm">{f.nickname || f.email}</div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-4 py-3 border-t shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
          <button
            onClick={handleCreate}
            disabled={saving || !groupName.trim() || selected.length === 0}
            className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  )
}