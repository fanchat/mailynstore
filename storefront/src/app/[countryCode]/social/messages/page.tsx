"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Member {
  id: string
  email: string
  nickname: string | null
  avatar: string | null
}

interface LastMessage {
  content: string
  created_at: string
  sender_id: string
}

interface Conversation {
  id: number
  type: string
  name: string | null
  created_at: string
  updated_at: string
  last_read_at: string | null
  unread_count: number
  last_message: LastMessage | null
  members: Member[]
}

function timeAgo(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return mins + "分钟前"
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + "小时前"
  const days = Math.floor(hours / 24)
  if (days < 7) return days + "天前"
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export default function MessagesPage() {
  const params = useParams()
  const countryCode = params.countryCode as string
  const [convs, setConvs] = useState<Conversation[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/social/conversations").then(function(r) { return r.json() }),
      fetch("/api/social/profile").then(function(r) { return r.json() }),
    ]).then(function([convData, profileData]) {
      var list = convData.data || convData || []
      var p = profileData.data || profileData
      setMyId(p?.id || null)
      setConvs(list)
      setLoading(false)
    }).catch(function() { setLoading(false) })
  }, [])

  useEffect(function() {
    var iv = setInterval(async function() {
      try {
        var r = await fetch("/api/social/conversations")
        var d = await r.json()
        setConvs(d.data || d || [])
      } catch (_) {}
    }, 5000)
    return function() { clearInterval(iv) }
  }, [])

  var unreadConvs = convs.filter(function(c) { return c.unread_count > 0 })
  var readConvs = convs.filter(function(c) { return c.unread_count === 0 })

  function getOther(c: Conversation) {
    return c.members.find(function(m) { return m.id !== myId })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {unreadConvs.length > 0 && (
        <div>
          <div className="px-4 py-2 text-xs font-medium text-red-500 bg-red-50 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            未读消息
          </div>
          {unreadConvs.map(function(c) {
            var other = getOther(c)
            var name = other?.nickname || other?.email || "未知"
            var lm = c.last_message
            var isSender = lm?.sender_id === myId
            var preview = lm ? (isSender ? "你: " : "") + lm.content : "暂无消息"
            return (
              <ConvItem
                key={c.id}
                conv={c}
                other={other}
                name={name}
                preview={preview}
                time={lm?.created_at || c.updated_at}
                countryCode={countryCode}
                isUnread={true}
              />
            )
          })}
        </div>
      )}

      <div>
        {unreadConvs.length > 0 && (
          <div className="px-4 py-2 text-xs font-medium text-gray-400 bg-gray-50">
            全部对话
          </div>
        )}
        {convs.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-16">
            还没有聊天记录<br />
            去好友页面找朋友聊天吧
          </div>
        ) : (
          readConvs.map(function(c) {
            var other = getOther(c)
            var name = other?.nickname || other?.email || "未知"
            var lm = c.last_message
            var isSender = lm?.sender_id === myId
            var preview = lm ? (isSender ? "你: " : "") + lm.content : "暂无消息"
            return (
              <ConvItem
                key={c.id}
                conv={c}
                other={other}
                name={name}
                preview={preview}
                time={lm?.created_at || c.updated_at}
                countryCode={countryCode}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function ConvItem(props: {
  conv: Conversation
  other: Member | undefined
  name: string
  preview: string
  time: string
  countryCode: string
  isUnread?: boolean
}) {
  return (
    <Link
      href={"/" + props.countryCode + "/social/chat/" + props.conv.id}
      className={"flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors" + (props.isUnread ? " bg-red-50/30" : "")}
    >
      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 relative">
        {props.other?.avatar ? (
          <img src={props.other.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
            {(props.other?.nickname || props.other?.email || "?")[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={"text-sm truncate " + (props.isUnread ? "font-bold text-gray-900" : "text-gray-800")}>
            {props.name}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {timeAgo(props.time)}
            {props.isUnread && (
              <span className="ml-1 text-red-500 font-bold">
                {" ·"} {props.conv.unread_count > 99 ? "99+" : props.conv.unread_count}条未读
              </span>
            )}
          </span>
        </div>
        <div className={"text-xs truncate mt-0.5 " + (props.isUnread ? "text-gray-600 font-medium" : "text-gray-400")}>
          {props.preview}
        </div>
      </div>
    </Link>
  )
}
