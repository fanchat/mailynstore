"use client"

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { deleteAccount } from "@lib/data/customer"

const ProfileDeleteAccount = () => {
  const { countryCode } = useParams() as { countryCode: string }
  const [step, setStep] = useState<0 | 1 | 2>(0) // 0=隐藏, 1=第一次确认, 2=第二次确认
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    setDeleting(true)
    setError("")

    // deleteAccount calls DELETE /store/customers/me,
    // cleans up session, then redirects to home on success.
    // On error it returns { error: string }.
    const result = await deleteAccount(countryCode)

    if (result && "error" in result) {
      setError(result.error)
      setDeleting(false)
    }
    // If no error, the server action redirects — we never reach here
  }

  if (step === 0) {
    return (
      <div className="mt-8 pt-8 border-t border-gray-200">
        <button
          onClick={() => setStep(1)}
          className="text-sm text-red-500 hover:text-red-700 underline"
        >
          永久删除帐号
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      {step === 1 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            ⚠ 第一次确认：您确定要永久删除帐号吗？
          </p>
          <p className="text-xs text-red-600 mb-4">
            删除意味着所有记录将被彻底抹除，包括商城订单等全部数据，
            <strong className="font-bold">此操作不可撤销！</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              我了解后果，继续
            </button>
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            ⚠ 第二次确认：确认删除，不留任何痕迹？
          </p>
          <p className="text-xs text-red-600 mb-4">
            所有订单、消息记录将全部清空。此操作无法撤回。
          </p>
          {error && (
            <p className="text-xs text-red-600 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "删除中..." : "确认永久删除"}
            </button>
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileDeleteAccount
