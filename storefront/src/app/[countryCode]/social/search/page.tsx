"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

export default function SearchPage() {
  const params = useParams()
  const countryCode = params.countryCode as string

  const [searchQ, setSearchQ] = useState("")
  const [searchRegion, setSearchRegion] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState("")
  const [friends, setFriends] = useState<any[]>([])
  const [toastMsg, setToastMsg] = useState("")

  // Load profile for default region + friends list for "isFriend" check
  useEffect(() => {
    Promise.all([
      fetch("/api/social/profile"),
      fetch("/api/social/friends"),
    ]).then(async ([pRes, fRes]) => {
      if (pRes.ok) {
        const d = await pRes.json()
        const p = d.data || d
        if (p?.region) {
          const townLevel = p.region.split(/[,，]/)[0].trim()
          if (townLevel) setSearchRegion(townLevel)
        }
      }
      if (fRes.ok) {
        const d = await fRes.json()
        setFriends(d.data || d)
      }
    }).catch(() => {})
  }, [])

  const isFriend = (id: string) => friends.some((f: any) => f.id === id)

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
        setSearchQ("")
        setResults([])
      } else {
        const d = await res.json()
        setToastMsg(d.error || "发送失败")
        setTimeout(() => setToastMsg(""), 2000)
      }
    } catch {
      setToastMsg("网络错误")
      setTimeout(() => setToastMsg(""), 2000)
    }
  }

  const handleSearch = async () => {
    const q = searchQ.trim().toLowerCase()
    if (!q) return
    setSearching(true)
    setResults([])
    setSearchMsg("")
    try {
      const regionParam = searchRegion.trim() ? `&region=${encodeURIComponent(searchRegion.trim())}` : ""
      const res = await fetch(`/api/social/search?q=${encodeURIComponent(q)}${regionParam}`)
      if (res.ok) {
        const d = await res.json()
        const data = d.data || d
        if (Array.isArray(data) && data.length > 0) {
          setResults(data)
        } else {
          setSearchMsg(d.message || "未找到匹配的商家或用户")
        }
      } else {
        setSearchMsg("搜索失败")
      }
    } catch { setSearchMsg("网络错误") }
    setSearching(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Search box */}
      <div className="bg-white rounded-lg shadow-sm mb-4 p-3">
        <div className="text-xs text-gray-400 mb-1">搜商家、找服务</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="空调、家电维修、面包、散养土鸡..."
            className="flex-1 border-0 outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQ.trim()}
            className="text-sm text-blue-600 font-medium disabled:text-gray-300"
          >
            {searching ? "搜索中..." : "搜索"}
          </button>
        </div>

        {/* Region filter */}
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={searchRegion}
            onChange={(e) => setSearchRegion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="所在地（可选）"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-amber-400"
          />
        </div>
        {searchRegion && (
          <div className="text-xs text-amber-600 mt-1 leading-relaxed">
            💡 默认为你的地区范围，可改成其他地区搜索<br />
            由大到小：省、市、区、街道
          </div>
        )}

        {/* Results or message */}
        {Array.isArray(results) && results.length > 0 && (
          <div className="mt-2 border-t pt-2 space-y-2">
            {results.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {(user.nickname || user.email)?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{user.nickname || user.email}</div>
                    {user.company_name && (
                      <div className="text-xs text-gray-500 truncate">🏢 {user.company_name}{user.job_title ? " · " + user.job_title : ""}</div>
                    )}
                    {user.services && (() => {
                      const arr: string[] = Array.isArray(user.services) ? user.services : (() => { try { return JSON.parse(user.services); } catch { return []; } })()
                      return arr.length > 0 ? (
                        <div className="text-xs text-amber-600 truncate">🛠 {arr.join("、")}</div>
                      ) : null
                    })()}
                    {user.office_address && (
                      <div className="text-xs text-gray-400 truncate">📍 {user.office_address}</div>
                    )}
                  </div>
                </div>
                {isFriend(user.id) ? (
                  <span className="text-xs text-gray-400 flex-shrink-0">已是好友</span>
                ) : (
                  <button
                    onClick={() => sendRequest(user.id)}
                    className="text-xs text-blue-600 border border-blue-600 px-3 py-1 rounded flex-shrink-0"
                  >
                    加好友
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {searchMsg && <div className="text-xs text-red-500 mt-1 whitespace-pre-line">{searchMsg}</div>}
      </div>

      {/* Quick tip when nothing searched yet */}
      {!searchQ && results.length === 0 && !searchMsg && (
        <div className="text-center text-gray-400 py-16 text-sm leading-relaxed">
          搜商家、找服务<br />
          输入关键词试试
        </div>
      )}
    </div>
  )
}
