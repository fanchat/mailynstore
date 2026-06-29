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

  const popularTags = [
    "空调维修", "家电维修", "家政", "搬运", "装修",
    "面包", "蛋糕", "散养土鸡", "水果", "蔬菜",
    "理发", "美容", "家教", "翻译", "摄影",
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Search box — redesigned */}
      <div className="bg-white rounded-xl shadow-sm mb-4 p-4">
        {/* Guidance label */}
        <div className="text-xs text-gray-400 mb-2">
          🔍 搜商家 · 找服务 · 查本地生活
        </div>

        {/* Search bar with icon button */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="输入商家名、服务、职位..."
            className="flex-1 border-0 outline-none text-sm bg-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQ.trim()}
            className="text-sm text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 font-medium px-4 py-1.5 rounded-md transition flex items-center gap-1"
          >
            {searching ? (
              <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>搜索中</>
            ) : (
              "搜索"
            )}
          </button>
        </div>

        {/* Region filter */}
        <div className="flex items-center gap-2 mt-2">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            value={searchRegion}
            onChange={(e) => setSearchRegion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="所在地（默认为你的地区，可选）"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-amber-400"
          />
          {searchRegion && (
            <button
              onClick={() => setSearchRegion("")}
              className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
            >
              清除
            </button>
          )}
        </div>
        {searchRegion && (
          <div className="text-xs text-amber-600 mt-1 leading-relaxed">
            💡 默认为你的地区范围，可改成其他地区搜索<br />
            由大到小：省、市、区、街道
          </div>
        )}

        {/* Results or message */}
        {Array.isArray(results) && results.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <div className="text-xs text-gray-400 mb-1">共 {results.length} 个结果</div>
            {results.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {(user.nickname || user.email)?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate font-medium">{user.nickname || user.email}</div>
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
                    className="text-xs text-blue-600 border border-blue-600 px-3 py-1 rounded flex-shrink-0 hover:bg-blue-50 transition"
                  >
                    加好友
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {searchMsg && <div className="text-xs text-red-500 mt-2 whitespace-pre-line bg-red-50 rounded p-2">{searchMsg}</div>}
      </div>

      {/* Initial guidance when nothing searched yet */}
      {!searchQ && results.length === 0 && !searchMsg && (
        <div className="text-center text-gray-400 py-6 text-sm leading-relaxed">
          <div className="text-3xl mb-3">🔍</div>
          <div className="font-medium text-gray-500 mb-1">想找什么？</div>
          <div>搜商家名、服务种类、职位</div>
          <div className="text-xs text-gray-400 mt-1">搜之前先填好你的资料，别人才能找到你</div>

          {/* Popular search tags */}
          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">试试热门搜索</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSearchQ(tag); setTimeout(handleSearch, 50) }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-3 py-1 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
