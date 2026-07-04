"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"

type Tab = "home" | "categories" | "social" | "cart" | "account"

export default function StoreBottomNav() {
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

  // Extract the meaningful path segment after countryCode
  const regex = new RegExp(`^/${countryCode}(/.*)?$`)
  const match = pathname.match(regex)
  const subPath = match && match[1] ? match[1] : "/"

  const activeTab: Tab =
    subPath === "/" || subPath.startsWith("/products")
      ? "home"
      : subPath.startsWith("/store") || subPath.startsWith("/categories")
        ? "categories"
        : subPath.startsWith("/social")
          ? "social"
          : subPath.startsWith("/cart")
            ? "cart"
            : subPath.startsWith("/account")
              ? "account"
              : "home"

  const tabs: { id: Tab; label: string; href: string; icon: string }[] = [
    { id: "home", label: "home", href: `/${countryCode}`, icon: "🏪" },
    { id: "categories", label: "分类", href: `/${countryCode}/store`, icon: "📂" },
    { id: "social", label: "社交", href: `/${countryCode}/social`, icon: "🌐" },
    { id: "cart", label: "购物车", href: `/${countryCode}/cart`, icon: "🛒" },
    { id: "account", label: "我的", href: `/${countryCode}/account`, icon: "👤" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200">
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
            <span className="text-lg mb-0.5">{tab.id === "account" ? (
              <span className="relative inline-flex">
                {tab.icon}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                  isConnected ? "bg-green-400 animate-pulse" : "bg-gray-300"
                }`} />
              </span>
            ) : tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}