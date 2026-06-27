"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

type Tab = "feed" | "friends" | "shop" | "profile" | "search" | "messages"

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const countryCode = params.countryCode as string

  const path = pathname.replace(`/${countryCode}/social`, "") || "/"
  const activeTab: Tab = path.startsWith("/friends")
    ? "friends"
    : path.startsWith("/messages")
    ? "messages"
    : path.startsWith("/shop")
    ? "shop"
    : path.startsWith("/search")
    ? "search"
    : path.startsWith("/profile")
    ? "profile"
    : "feed"

  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "feed", label: "圈子", href: `/${countryCode}/social` },
    { id: "friends", label: "好友", href: `/${countryCode}/social/friends` },
    { id: "shop", label: "商城", href: `/${countryCode}` },
    { id: "messages", label: "消息", href: `/${countryCode}/social/messages` },
    { id: "search", label: "搜索", href: `/${countryCode}/social/search` },
    { id: "profile", label: "我的", href: `/${countryCode}/social/profile` },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <div className="w-12" />
        <h1 className="text-lg font-semibold flex-1 text-center">
          {activeTab === "feed" && "圈子"}
          {activeTab === "friends" && "好友"}
          {activeTab === "search" && "搜索"}
          {activeTab === "messages" && "消息"}
          {activeTab === "profile" && "我的"}
        </h1>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-16">{children}</div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          {tabs.map((tab) => (
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
                {tab.id === "messages" && "💬"}
                {tab.id === "profile" && "👤"}
              </span>
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}