"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

type Tab = "feed" | "friends" | "shop" | "profile" | "search" | "chat"

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const countryCode = params.countryCode as string
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const check = () => {
      fetch("/api/nt/ping", { signal: AbortSignal.timeout(5000) })
        .then(r => r.json())
        .then(d => setIsConnected(d.ok === true))
        .catch(() => setIsConnected(false))
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const path = pathname.replace(`/${countryCode}/social`, "") || "/"
  const activeTab: Tab = path.startsWith("/friends")
    ? "friends"
    : path.startsWith("/chat")
    ? "chat"
    : path.startsWith("/shop")
    ? "shop"
    : path.startsWith("/search")
    ? "search"
    : path.startsWith("/profile")
    ? "profile"
    : "feed"

  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "feed", label: "圈子", href: `/${countryCode}/social` },
    { id: "chat", label: "聊天", href: "#" },
    { id: "friends", label: "好友", href: `/${countryCode}/social/friends` },
    { id: "shop", label: "商城", href: `/${countryCode}` },
    { id: "search", label: "搜索", href: `/${countryCode}/social/search` },
    { id: "profile", label: "我的", href: `/${countryCode}/social/profile` },
  ]

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <div className="w-12" />
        <h1 className="text-lg font-semibold flex-1 text-center">
          {activeTab === "feed" && "圈子"}
          {activeTab === "chat" && "聊天"}
          {activeTab === "friends" && "好友"}
          {activeTab === "search" && "搜索"}
          {activeTab === "profile" && "我的"}
        </h1>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className={`flex-1 ${activeTab !== "chat" ? "pb-16" : "pb-14"} flex flex-col min-h-0`}>{children}</div>

      {/* Bottom nav — hide chat tab from nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          {tabs.filter(t => t.id !== "chat").map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center px-4 py-1 text-xs ${
                activeTab === tab.id
                  ? "text-blue-600 font-medium"
                  : "text-gray-500"
              }`}
            >
              <span className="text-lg mb-0.5">
                {tab.id === "feed" && "📰"}
                {tab.id === "friends" && "👥"}
                {tab.id === "shop" && "🏪"}
                {tab.id === "search" && "🔍"}
                {tab.id === "profile" && (
                  <span className="relative inline-flex">
                    👤
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                      isConnected ? "bg-green-400 animate-pulse" : "bg-gray-300"
                    }`} />
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}