"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001"
const STUN_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended"

export interface CallerInfo {
  customer_id: string
  nickname: string | null
  avatar: string | null
}

export interface IncomingCall {
  caller_id: string
  caller_nickname: string | null
  caller_avatar: string | null
  sdp: string
}

export interface UseVoiceCallOptions {
  convId: string
  myId: string
  jwtToken: string | null
  remoteAudioRef?: React.RefObject<HTMLAudioElement | null>
}

export function useVoiceCall({ convId, myId, jwtToken, remoteAudioRef }: UseVoiceCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle")
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [remoteUser, setRemoteUser] = useState<CallerInfo | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Audio tones (ringback / ringing / busy / unreachable) ──
  const toneCtxRef = useRef<AudioContext | null>(null)
  const toneOscRef = useRef<OscillatorNode | null>(null)
  const toneOsc2Ref = useRef<OscillatorNode | null>(null)  // for dual-tone busy
  const toneGainRef = useRef<GainNode | null>(null)
  const toneTimerRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const stopTone = useCallback(() => {
    if (toneTimerRef.current) {
      clearInterval(toneTimerRef.current)
      toneTimerRef.current = null
    }
    if (toneOscRef.current) {
      try { toneOscRef.current.stop() } catch {}
      toneOscRef.current = null
    }
    if (toneOsc2Ref.current) {
      try { toneOsc2Ref.current.stop() } catch {}
      toneOsc2Ref.current = null
    }
    if (toneCtxRef.current) {
      try { toneCtxRef.current.close() } catch {}
      toneCtxRef.current = null
    }
    toneGainRef.current = null
  }, [])

  const startRingbackTone = useCallback(() => {
    stopTone()
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 440
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      toneCtxRef.current = ctx
      toneOscRef.current = osc
      toneGainRef.current = gain
      // 中国式回铃音: 嘟(1s) 停(4s) — 每500ms tick一次
      let tick = 0
      toneTimerRef.current = setInterval(() => {
        if (!toneGainRef.current) return
        tick++
        const p = tick % 10 // 10 ticks = 5s cycle
        toneGainRef.current.gain.value = (p >= 1 && p <= 2) ? 0.3 : 0
      }, 500)
    } catch {}
  }, [stopTone])

  const startRingingTone = useCallback(() => {
    stopTone()
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 450
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      toneCtxRef.current = ctx
      toneOscRef.current = osc
      toneGainRef.current = gain
      // 正常来电铃音: 响(0.4s) 停(0.2s) 响(0.4s) 停(2s) — 类"铃~铃~"节奏
      let tick = 0
      toneTimerRef.current = setInterval(() => {
        if (!toneGainRef.current) return
        tick++
        const p = tick % 15 // 15 ticks × 200ms = 3s cycle
        if (p === 0) tick = 0 // prevent overflow, reset on each cycle
        // Pattern: 响(ticks1-2) 停(tick3) 响(ticks4-5) 停(ticks6-15)
        const on = (p >= 1 && p <= 2) || (p >= 4 && p <= 5)
        toneGainRef.current.gain.value = on ? 0.25 : 0
      }, 200)
    } catch {}
  }, [stopTone])

  // ── Tone control by call state ──
  useEffect(() => {
    if (callState === "ringing") {
      // 来电响铃
      startRingingTone()
    } else if (callState === "connected" || callState === "ended" || callState === "idle") {
      stopTone()
    }
    // callState === "calling" → 保持 startCall 里设的回铃音
  }, [callState, startRingingTone, stopTone])

  const startBusyTone = useCallback(() => {
    stopTone()
    try {
      const ctx = new AudioContext()
      const gain = ctx.createGain()
      gain.gain.value = 0
      // Dual-tone busy signal: 480Hz + 620Hz
      const osc1 = ctx.createOscillator()
      osc1.type = "sine"
      osc1.frequency.value = 480
      osc1.connect(gain)
      const osc2 = ctx.createOscillator()
      osc2.type = "sine"
      osc2.frequency.value = 620
      osc2.connect(gain)
      gain.connect(ctx.destination)
      osc1.start()
      osc2.start()
      toneCtxRef.current = ctx
      toneOscRef.current = osc1
      toneOsc2Ref.current = osc2
      toneGainRef.current = gain
      // 忙音: 0.5s on / 0.5s off, 2 cycles
      let tick = 0
      toneTimerRef.current = setInterval(() => {
        if (!toneGainRef.current) return
        tick++
        const p = tick % 4 // 4 ticks × 500ms = 2s total
        toneGainRef.current.gain.value = (p < 2) ? 0.3 : 0
        if (p >= 3) {
          // After 2 cycles, stop
          stopTone()
        }
      }, 500)
    } catch {}
  }, [stopTone])

  const startUnreachableTone = useCallback(() => {
    stopTone()
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 450
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      toneCtxRef.current = ctx
      toneOscRef.current = osc
      toneGainRef.current = gain
      // 无法接通: 3 short beeps, then auto-stop
      let tick = 0
      toneTimerRef.current = setInterval(() => {
        if (!toneGainRef.current) return
        tick++
        const p = tick % 12 // 12 ticks × 250ms = 3s
        const on = (p >= 1 && p <= 2) || (p >= 5 && p <= 6) || (p >= 9 && p <= 10)
        toneGainRef.current.gain.value = on ? 0.3 : 0
        if (p >= 11) {
          stopTone()
        }
      }, 250)
    } catch {}
  }, [stopTone])

  const [toastMessage, setToastMessage] = useState("")

  const stopTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // ── Connect Socket.IO ──
  useEffect(() => {
    if (!jwtToken) {
      return
    }
    const socket = io(SIGNALING_URL, {
      auth: { token: jwtToken },
      transports: ["websocket"],
      path: "/ws-call",
    })

    socket.on("connect", () => {
      console.log("[voice-call] Signaling connected")
    })

    socket.on("connect_error", (err: Error) => {
      console.error("[voice-call] Signaling connect error:", err.message)
      setToastMessage("信令连接失败: " + err.message)
    })

    socket.on("call:incoming", (data: IncomingCall) => {
      setIncomingCall(data)
      setCallState("ringing")
      setRemoteUser({
        customer_id: data.caller_id,
        nickname: data.caller_nickname,
        avatar: data.caller_avatar,
      })
    })

    socket.on("call:accepted", async ({ sdp }: { sdp: string }) => {
      if (!pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }))
        setCallState("connected")
        startTimer()
      } catch (err) {
        console.error("[voice-call] Failed to set remote description (answer):", err)
      }
    })

    socket.on("ice:candidate", async ({ candidate }: { candidate: string }) => {
      if (!pcRef.current || !candidate) return
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)))
      } catch (err) {
        console.error("[voice-call] Failed to add ICE candidate:", err)
      }
    })

    socket.on("call:ended", () => {
      cleanup()
      setCallState("ended")
    })

    socket.on("call:rejected", () => {
      stopTimeout()
      startBusyTone()
      setToastMessage("对方已拒绝")
      setTimeout(() => {
        cleanup()
        setCallState("idle")
      }, 2000)
    })

    socket.on("call:error", ({ message }: { message: string }) => {
      console.error("[voice-call] Error:", message)
      stopTimeout()
      startUnreachableTone()
      setToastMessage(message)
      setTimeout(() => {
        cleanup()
        setCallState("idle")
      }, 2000)
    })

    socket.on("disconnect", () => {
      cleanup()
      setCallState("idle")
    })

    socketRef.current = socket

    return () => {
      cleanup()
      socket.disconnect()
    }
  }, [jwtToken])

  // ── Start timer ──
  const startTimer = useCallback(() => {
    setCallDuration(0)
    timerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1)
    }, 1000)
  }, [])

  // ── Stop timer ──
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Cleanup peer connection & media ──
  const cleanup = useCallback(() => {
    stopTimeout()
    stopTimer()
    stopTone()
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }, [stopTimer, stopTone, stopTimeout])

  // ── Start a call ──
  const startCall = useCallback(async (targetId: string) => {
    if (!socketRef.current) {
      return
    }

    try {
      // 在 getUserMedia 授权弹窗前预热 AudioContext（绕过 autoplay 限制）
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 440
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      toneCtxRef.current = ctx
      toneOscRef.current = osc
      toneGainRef.current = gain
      // 中国式回铃音: 嘟(1s) 停(4s) — 每500ms tick一次
      let tick = 0
      toneTimerRef.current = setInterval(() => {
        if (!toneGainRef.current) return
        tick++
        const p = tick % 10
        toneGainRef.current.gain.value = (p >= 1 && p <= 2) ? 0.3 : 0
      }, 500)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = new RTCPeerConnection(STUN_SERVERS)
      pcRef.current = pc

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice:candidate", {
            target_id: targetId,
            candidate: JSON.stringify(event.candidate.toJSON()),
          })
        }
      }

      pc.ontrack = (event) => {
        if (remoteAudioRef?.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          cleanup()
          setCallState("ended")
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socketRef.current.emit("call:offer", {
        target_id: targetId,
        sdp: offer.sdp,
      })

      setCallState("calling")
      setRemoteUser(null) // Will be set when we know the other user

      // 30s timeout — auto-hangup if no answer
      stopTimeout()
      timeoutRef.current = setTimeout(() => {
        stopTimeout()
        startUnreachableTone()
        setToastMessage("对方暂时无法接听")
        if (socketRef.current && targetId) {
          socketRef.current.emit("call:hangup", { target_id: targetId })
        }
        cleanup()
        setCallState("idle")
      }, 30000)
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setToastMessage("需要麦克风权限才能通话")
      } else {
        setToastMessage("通话初始化失败：" + (err?.message || "未知错误"))
      }
      cleanup()
      setCallState("idle")
    }
  }, [cleanup, stopTimeout, startUnreachableTone, setToastMessage])

  // ── Accept incoming call ──
  const acceptCall = useCallback(async () => {
    if (!socketRef.current || !incomingCall) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = new RTCPeerConnection(STUN_SERVERS)
      pcRef.current = pc

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice:candidate", {
            target_id: incomingCall.caller_id,
            candidate: JSON.stringify(event.candidate.toJSON()),
          })
        }
      }

      pc.ontrack = (event) => {
        if (remoteAudioRef?.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          cleanup()
          setCallState("ended")
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: incomingCall.sdp }))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socketRef.current.emit("call:answer", {
        target_id: incomingCall.caller_id,
        sdp: answer.sdp,
      })

      setIncomingCall(null)
      setCallState("connected")
      startTimer()
    } catch (err: any) {
      console.error("[voice-call] Accept failed:", err)
      alert("接听失败：" + (err?.message || "未知错误"))
      cleanup()
      setCallState("idle")
    }
  }, [incomingCall, startTimer, cleanup])

  // ── Reject incoming call ──
  const rejectCall = useCallback(() => {
    if (socketRef.current && incomingCall) {
      socketRef.current.emit("call:reject", { target_id: incomingCall.caller_id })
    }
    setIncomingCall(null)
    setCallState("idle")
    cleanup()
  }, [incomingCall, cleanup])

  // ── Hangup active call ──
  const hangup = useCallback(() => {
    if (socketRef.current && remoteUser) {
      socketRef.current.emit("call:hangup", { target_id: remoteUser.customer_id })
    }
    cleanup()
    setCallState("ended")
    // Reset after a moment
    setTimeout(() => setCallState("idle"), 1500)
  }, [remoteUser, cleanup])

  // ── Format duration ──
  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }, [])

  return {
    callState,
    incomingCall,
    callDuration,
    formatDuration,
    remoteUser,
    toastMessage,
    setToastMessage,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
  }
}
