"use client"

import { useState, useEffect } from "react"

interface Friend {
  id: number
  friend_customer_id: string
  customer_email: string
  customer_nickname: string | null
  customer_avatar: string | null
  created_at: string
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadFriends = async () => {
    try {
      const res = await fetch("/api/social/friends")
      if (res.ok) {
        const body = await res.json()
        setFriends(body.data || body)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadFriends() }, [])

  const searchUser = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/social/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const body = await res.json()
        setSearchResults(body.data || body)
      }
    } catch {}
  }

  const sendRequest = async (targetId: string) => {
    await fetch("/api/social/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_customer_id: targetId }),
    })
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm mb-4 p-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => searchUser(e.target.value)}
          placeholder="搜索用户添加好友..."
          className="w-full border-0 outline-none text-sm"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 border-t pt-2">
            {searchResults.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{u.nickname || u.email}</span>
                <button
                  onClick={() => sendRequest(u.id)}
                  className="text-xs text-blue-600 border border-blue-600 px-3 py-1 rounded"
                >
                  加好友
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friends list */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : friends.length === 0 ? (
        <div className="text-center text-gray-400 py-8">暂无好友</div>
      ) : (
        friends.map((f) => (
          <div key={f.id} className="bg-white rounded-lg shadow-sm mb-2 p-3 flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {f.customer_avatar ? (
                <img src={f.customer_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  {f.customer_nickname?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="ml-3 text-sm font-medium">{f.customer_nickname || f.customer_email}</div>
          </div>
        ))
      )}
    </div>
  )
}