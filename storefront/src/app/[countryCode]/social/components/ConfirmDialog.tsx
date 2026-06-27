"use client"

import { useState, useEffect } from "react"

interface ConfirmDialogProps {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export default function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  confirmText = "确认",
  cancelText = "取消",
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      // Small delay for enter animation
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200 ${
        visible ? "bg-black/40" : "bg-transparent"
      }`}
      onClick={onCancel}
    >
      <div
        className={`bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-800 text-sm text-center mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}