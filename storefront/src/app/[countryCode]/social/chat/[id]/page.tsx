"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useVoiceCall } from "../../../../../lib/useVoiceCall"

interface Message {
  id: number
  conversation_id: number
  sender_id: string
  type: string
  content: string
  media_url: string | null
  created_at: string
  sender_email: string
  sender_nickname: string | null
  sender_avatar: string | null
}

interface ConvInfo {
  id: number
  type: string
  name: string | null
  members: { id: string; nickname: string | null; email: string; avatar: string | null }[]
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

// Read _medusa_jwt from server-side API route (cookie is HttpOnly)
async function getJwtToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/jwt")
    if (!res.ok) return null
    const data = await res.json()
    return data.token || null
  } catch {
    return null
  }
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const convId = params.id as string
  const countryCode = params.countryCode as string
  const enableVoice = process.env.NEXT_PUBLIC_ENABLE_VOICE_CALL === "true"

  const [conv, setConv] = useState<ConvInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  // Voice recording state
  const [micSupported, setMicSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStart, setRecordingStart] = useState(0)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Voice call ──
  const [jwtToken, setJwtToken] = useState<string | null>(null)

  useEffect(() => {
    getJwtToken().then(setJwtToken)
  }, [])

  const voiceCall = useVoiceCall({
    convId,
    myId: myId || "",
    jwtToken,
    enabled: process.env.NEXT_PUBLIC_ENABLE_VOICE_CALL === "true",
    remoteAudioRef,
  })

  // Check microphone support
  useEffect(() => {
    setMicSupported(typeof navigator.mediaDevices?.getUserMedia === "function")
  }, [])

  // Fetch conversation info + my identity
  useEffect(() => {
    fetch(`/api/social/conversations/${convId}`)
      .then(r => r.json())
      .then(d => {
        const c = d.data || d
        if (c) setConv(c)
      })
      .catch(() => {})
    fetch("/api/social/profile")
      .then(r => r.json())
      .then(d => {
        const p = d.data || d
        setMyId(p?.id || null)
      })
      .catch(() => {})
  }, [convId])

  // Load messages
  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/social/conversations/${convId}/messages`)
      if (res.ok) {
        const d = await res.json()
        setMessages(d.data || d)
      }
    } catch {}
  }

  // Mark as read when opening
  const markAsRead = async () => {
    try {
      await fetch(`/api/social/conversations/${convId}/read`, { method: "POST" })
    } catch {}
  }

  useEffect(() => {
    if (convId) {
      loadMessages()
      markAsRead()
    }
  }, [convId])

  // Auto scroll to bottom only on new messages (not initial load)
  const [initialLoad, setInitialLoad] = useState(true)
  useEffect(() => {
    if (!initialLoad) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, initialLoad])

  useEffect(() => {
    if (messages.length > 0 && initialLoad) {
      setInitialLoad(false)
    }
  }, [messages])

  // Poll every 3s
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [convId])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/social/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        setInputText("")
        await loadMessages()
      }
    } catch {}
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Voice recording ──

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      let mimeType = ""
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus"
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"
      }
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.start()
      const start = performance.now()
      setRecordingStart(start)
      setIsRecording(true)
      setRecordingElapsed(0)

      timerRef.current = setInterval(() => {
        setRecordingElapsed(Math.floor((performance.now() - start) / 1000))
      }, 1000)
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        alert("需要麦克风权限才能录制语音")
      } else {
        alert("录音初始化失败，当前浏览器可能不支持录音功能")
      }
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return

    mediaRecorderRef.current.onstop = async () => {
      if (timerRef.current) clearInterval(timerRef.current)

      const duration = Math.max(1, Math.floor((performance.now() - recordingStart) / 1000))
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm"
      const blob = new Blob(audioChunksRef.current, { type: mimeType })

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      setIsRecording(false)
      setIsUploading(true)

      try {
        const formData = new FormData()
        const ext = mimeType.includes("mp4") ? "m4a" : "webm"
        formData.append("file", blob, `voice_${Date.now()}.${ext}`)

        const uploadRes = await fetch("/api/social/media", {
          method: "POST",
          body: formData,
        })
        if (!uploadRes.ok) throw new Error("upload_failed")
        const { url } = await uploadRes.json()

        const msgRes = await fetch(`/api/social/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "voice",
            media_url: url,
            content: String(duration),
          }),
        })
        if (!msgRes.ok) throw new Error("send_failed")

        await loadMessages()
      } catch {
        alert("语音发送失败")
      }

      setIsUploading(false)
    }

    mediaRecorderRef.current.stop()
  }

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setRecordingElapsed(0)
  }

  // ── Voice playback ──

  const playVoice = (msgId: number, mediaUrl: string) => {
    if (playingId === msgId) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlayingId(null)
      return
    }

    audioRef.current?.pause()

    const audio = new Audio(mediaUrl)
    audioRef.current = audio
    setPlayingId(msgId)

    audio.onended = () => {
      setPlayingId(null)
      audioRef.current = null
    }

    audio.onerror = () => {
      setPlayingId(null)
      audioRef.current = null
    }

    audio.play().catch(() => {
      setPlayingId(null)
      audioRef.current = null
    })
  }

  // Cleanup audio and timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const otherMember = conv?.members.find(m => m.id !== myId)
  const otherId = conv && myId ? (conv.members.find(m => m.id !== myId)?.id || "") : ""
  const title = otherMember?.nickname || otherMember?.email || "聊天"
  const isOnline = true // Can check via signaling server in future

  // ── Handle call button ──
  const handleStartCall = useCallback(() => {
    if (otherId && myId) {
      voiceCall.startCall(otherId)
      setRemoteUser({
        customer_id: otherId,
        nickname: otherMember?.nickname || null,
        avatar: otherMember?.avatar || null,
      })
    }
  }, [otherId, myId, voiceCall, otherMember])

  const [remoteUser, setRemoteUser] = useState<{ customer_id: string; nickname: string | null; avatar: string | null } | null>(null)

  // ── Auto-clear toast after 3s ──
  useEffect(() => {
    if (voiceCall.toastMessage) {
      const t = setTimeout(() => voiceCall.setToastMessage(""), 3000)
      return () => clearTimeout(t)
    }
  }, [voiceCall.toastMessage, voiceCall.setToastMessage])

  return (
    <div className="flex flex-col bg-gray-50 flex-1 min-h-0">
      {/* Hidden audio element for remote audio */}
      {/* ── Toast notification ── */}
      {voiceCall.toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {voiceCall.toastMessage}
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay />

      {/* ── Top block (fixed): ← 好友名 🏠 📞 */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-lg">
            ←
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {otherMember?.avatar ? (
                <img src={otherMember.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                  {(otherMember?.nickname || otherMember?.email)?.[0] || "?"}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-gray-400">{otherMember?.email}</div>
            </div>
          </div>
          <button
            onClick={() => {
              if (otherId) router.push(`/${countryCode}/social?focus=${otherId}`)
            }}
            disabled={!otherId}
            className={`w-7 h-7 rounded-full bg-gray-100 hover:bg-blue-50 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors flex-shrink-0 ${!otherId ? "opacity-40" : ""}`}
            title="查看好友圈子"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
              <path d="M4 18L24 4L44 18" fill="#C0392B" stroke="#922B21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 17L24 7L40 17" fill="none" stroke="#922B21" strokeWidth="0.6" opacity="0.4"/>
              <path d="M12 15.5L24 9L36 15.5" fill="none" stroke="#922B21" strokeWidth="0.6" opacity="0.4"/>
              <path d="M36 7V15H30" fill="#A0522D" stroke="#6B3410" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="30" y1="15" x2="36" y2="15" stroke="#6B3410" strokeWidth="1.2"/>
              <rect x="32" y="10" width="2" height="3" rx="0.3" fill="#6B3410" opacity="0.3"/>
              <path d="M7 18V42H41V18Z" fill="#F5DEB3" stroke="#D4B896" strokeWidth="1.2"/>
              <line x1="7" y1="24" x2="41" y2="24" stroke="#E8D5A8" strokeWidth="0.4"/>
              <line x1="7" y1="30" x2="41" y2="30" stroke="#E8D5A8" strokeWidth="0.4"/>
              <line x1="7" y1="36" x2="41" y2="36" stroke="#E8D5A8" strokeWidth="0.4"/>
              <path d="M20 42V32C20 29.8 21.8 28 24 28C26.2 28 28 29.8 28 32V42" fill="#8B6914" stroke="#6B5010" strokeWidth="1.2"/>
              <circle cx="26" cy="35" r="1.5" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
              <path d="M20 28C20 25.8 21.8 24 24 24C26.2 24 28 25.8 28 28" fill="none" stroke="#6B5010" strokeWidth="0.8" opacity="0.5"/>
              <rect x="11" y="24" width="8" height="8" rx="1" fill="#87CEEB" stroke="#5B8CA8" strokeWidth="1.2"/>
              <line x1="15" y1="24" x2="15" y2="32" stroke="#5B8CA8" strokeWidth="1"/>
              <line x1="11" y1="28" x2="19" y2="28" stroke="#5B8CA8" strokeWidth="1"/>
              <rect x="10" y="31.5" width="10" height="1.5" rx="0.5" fill="#D4B896"/>
              <rect x="29" y="24" width="8" height="8" rx="1" fill="#87CEEB" stroke="#5B8CA8" strokeWidth="1.2"/>
              <line x1="33" y1="24" x2="33" y2="32" stroke="#5B8CA8" strokeWidth="1"/>
              <line x1="29" y1="28" x2="37" y2="28" stroke="#5B8CA8" strokeWidth="1"/>
              <rect x="28" y="31.5" width="10" height="1.5" rx="0.5" fill="#D4B896"/>
              <rect x="6" y="40.5" width="36" height="2" rx="0.5" fill="#8B7355" opacity="0.4"/>
            </svg>
          </button>
          {enableVoice && (
          <button
            onClick={handleStartCall}
            disabled={!otherId || voiceCall.callState === "calling" || voiceCall.callState === "connected"}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-green-50 flex items-center justify-center text-gray-500 hover:text-green-500 transition-colors flex-shrink-0 disabled:opacity-40"
            title={voiceCall.callState === "connected" ? "通话中" : "语音通话"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-1.5a16.5 16.5 0 01-16.5-16.5V4.5z" />
            </svg>
          </button>
          )}
        </div>

      {/* Messages框 */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-lg shadow-sm px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">开始聊天吧</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === myId
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                    isMe
                      ? "bg-blue-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.type === "voice" ? (
                    <button
                      onClick={() => playVoice(msg.id, msg.media_url || "")}
                      className="flex items-center gap-2 min-w-[100px]"
                    >
                      <span className="text-base leading-none">
                        {playingId === msg.id ? "⏸" : "▶"}
                      </span>
                      <span className="text-sm font-medium">
                        {formatDuration(parseInt(msg.content || "0", 10))}
                      </span>
                      <span className="flex-1 h-1 rounded-full overflow-hidden bg-current opacity-30">
                        <span
                          className={`block h-full rounded-full bg-current ${
                            playingId === msg.id ? "animate-pulse" : ""
                          }`}
                          style={{ width: playingId === msg.id ? "60%" : "100%" }}
                        />
                      </span>
                    </button>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                  <div
                    className={`text-xs mt-0.5 ${
                      isMe ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        {isUploading ? (
          <div className="text-sm text-gray-400 text-center py-2">发送语音消息...</div>
        ) : (
          <>
            {isRecording && (
              <div className="flex items-center gap-3 mb-2">
                <span className="text-red-500 text-lg animate-pulse">🔴</span>
                <span className="font-mono text-sm tabular-nums">
                  {formatDuration(recordingElapsed)}
                </span>
                <button
                  onClick={stopRecording}
                  className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 flex-shrink-0"
                  title="停止录音"
                >
                  ■
                </button>
                <button
                  onClick={cancelRecording}
                  className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0"
                  title="取消"
                >
                  ✕
                </button>
                <span className="text-xs text-gray-400 ml-auto">点击停止发送语音</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              {micSupported && (
                <button
                  onClick={startRecording}
                  title="语音消息"
                  disabled={isRecording}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0 text-lg disabled:opacity-40"
                >
                  🎤
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={sending}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-600 flex-shrink-0"
              >
                {sending ? "..." : "➤"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Incoming call modal ── */}
      {enableVoice && voiceCall.incomingCall && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-3 overflow-hidden">
              {voiceCall.incomingCall.caller_avatar ? (
                <img src={voiceCall.incomingCall.caller_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                  {(voiceCall.incomingCall.caller_nickname || "?")[0]}
                </div>
              )}
            </div>
            <div className="text-lg font-medium mb-1">
              {voiceCall.incomingCall.caller_nickname || "未知用户"}
            </div>
            <div className="text-sm text-gray-400 mb-6">邀请你语音通话...</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={voiceCall.rejectCall}
                className="w-14 h-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors"
                title="拒绝"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 4.5a3 3 0 00-3-3h-1.372c-.86 0-1.61.586-1.819 1.42l-1.105 4.423a1.875 1.875 0 00.694 1.955l1.293.97c.135.101.164.249.126.352a11.285 11.285 0 00-6.697 6.697c-.103.038-.25.009-.352-.126l-.97-1.293a1.875 1.875 0 00-1.955-.694L4.92 12.053c-.834.209-1.42.959-1.42 1.82V19.5a3 3 0 003 3h1.5a16.5 16.5 0 0016.5-16.5V4.5z" />
                </svg>
              </button>
              <button
                onClick={voiceCall.acceptCall}
                className="w-14 h-14 rounded-full bg-green-100 text-green-500 flex items-center justify-center hover:bg-green-200 transition-colors animate-pulse"
                title="接听"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-1.5a16.5 16.5 0 01-16.5-16.5V4.5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calling overlay (等待对方接听) ── */}
      {enableVoice && voiceCall.callState === "calling" && remoteUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center text-white">
          <div className="w-20 h-20 rounded-full bg-gray-600 mb-4 overflow-hidden">
            {remoteUser.avatar ? (
              <img src={remoteUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {(remoteUser.nickname || "?")[0]}
              </div>
            )}
          </div>
          <div className="text-xl font-medium mb-1">{remoteUser.nickname || "通话中"}</div>
          <div className="text-amber-400 text-sm mb-8">
            <span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse" />
            正在呼叫...
          </div>
          <button
            onClick={voiceCall.hangup}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="取消"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 4.5a3 3 0 00-3-3h-1.372c-.86 0-1.61.586-1.819 1.42l-1.105 4.423a1.875 1.875 0 00.694 1.955l1.293.97c.135.101.164.249.126.352a11.285 11.285 0 00-6.697 6.697c-.103.038-.25.009-.352-.126l-.97-1.293a1.875 1.875 0 00-1.955-.694L4.92 12.053c-.834.209-1.42.959-1.42 1.82V19.5a3 3 0 003 3h1.5a16.5 16.5 0 0016.5-16.5V4.5z" />
            </svg>
          </button>
          <div className="text-xs text-gray-400 mt-3">点击取消</div>
        </div>
      )}

      {/* ── Active call overlay ── */}
      {enableVoice && voiceCall.callState === "connected" && remoteUser && (
        <div className="fixed inset-0 z-50 bg-gray-900/90 flex flex-col items-center justify-center text-white">
          <div className="w-20 h-20 rounded-full bg-gray-600 mb-4 overflow-hidden">
            {remoteUser.avatar ? (
              <img src={remoteUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {(remoteUser.nickname || "?")[0]}
              </div>
            )}
          </div>
          <div className="text-xl font-medium mb-1">{remoteUser.nickname || "通话中"}</div>
          <div className="text-green-400 text-sm mb-8">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            通话中
          </div>
          <div className="text-3xl font-mono mb-12 tabular-nums">
            {voiceCall.formatDuration(voiceCall.callDuration)}
          </div>
          <button
            onClick={voiceCall.hangup}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="挂断"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 4.5a3 3 0 00-3-3h-1.372c-.86 0-1.61.586-1.819 1.42l-1.105 4.423a1.875 1.875 0 00.694 1.955l1.293.97c.135.101.164.249.126.352a11.285 11.285 0 00-6.697 6.697c-.103.038-.25.009-.352-.126l-.97-1.293a1.875 1.875 0 00-1.955-.694L4.92 12.053c-.834.209-1.42.959-1.42 1.82V19.5a3 3 0 003 3h1.5a16.5 16.5 0 0016.5-16.5V4.5z" />
            </svg>
          </button>
          <div className="text-xs text-gray-400 mt-3">点击挂断</div>
        </div>
      )}

      {/* ── Calling state (waiting for answer) ── */}
      {voiceCall.callState === "calling" && (
        <div className="fixed inset-0 z-50 bg-gray-900/90 flex flex-col items-center justify-center text-white">
          <div className="w-20 h-20 rounded-full bg-gray-600 mb-4 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {(otherMember?.nickname || otherMember?.email || "?")[0]}
            </div>
          </div>
          <div className="text-xl font-medium mb-1">{otherMember?.nickname || otherMember?.email || "正在呼叫..."}</div>
          <div className="text-gray-400 text-sm mb-12">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
            等待对方接听...
          </div>
          <button
            onClick={voiceCall.hangup}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="取消"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.5 4.5a3 3 0 00-3-3h-1.372c-.86 0-1.61.586-1.819 1.42l-1.105 4.423a1.875 1.875 0 00.694 1.955l1.293.97c.135.101.164.249.126.352a11.285 11.285 0 00-6.697 6.697c-.103.038-.25.009-.352-.126l-.97-1.293a1.875 1.875 0 00-1.955-.694L4.92 12.053c-.834.209-1.42.959-1.42 1.82V19.5a3 3 0 003 3h1.5a16.16.16.16 0016.5-16.5V4.5z" />
            </svg>
          </button>
          <div className="text-xs text-gray-400 mt-3">取消呼叫</div>
        </div>
      )}

      {/* ── Call ended state ── */}
      {voiceCall.callState === "ended" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-72 shadow-xl text-center">
            <div className="text-lg font-medium mb-2">通话已结束</div>
            {voiceCall.callDuration > 0 && (
              <div className="text-gray-400 text-sm mb-4">
                通话时长 {voiceCall.formatDuration(voiceCall.callDuration)}
              </div>
            )}
            <button
              onClick={() => voiceCall.hangup()}
              className="px-6 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600"
            >
              返回聊天
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
