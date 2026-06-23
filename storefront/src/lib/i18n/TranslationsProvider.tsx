"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { type Locale, defaultLocale } from "./config"
import enMessages from "../../../messages/en.json"
import zhMessages from "../../../messages/zh.json"
import deMessages from "../../../messages/de.json"

const allMessages: Record<string, any> = {
  en: enMessages,
  zh: zhMessages,
  de: deMessages,
}

interface Messages {
  [key: string]: string | Messages
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
  messages: Messages
}

const I18nContext = createContext<I18nContextType | null>(null)

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return {
      t: (key: string, fallback?: string) => fallback || key,
      locale: defaultLocale as Locale,
    }
  }
  return { t: ctx.t, locale: ctx.locale }
}

function loadMessages(locale: Locale): Messages {
  return (allMessages[locale] || allMessages[defaultLocale]) as Messages
}

function resolveNestedKey(obj: Messages, key: string): string | undefined {
  return key.split(".").reduce((acc: Messages | string | undefined, part) => {
    if (typeof acc === "object" && acc !== null) {
      return (acc as Messages)[part]
    }
    return undefined
  }, obj as Messages | undefined) as string | undefined
}

export function I18nProvider({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: Locale
  initialMessages: Messages
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Messages>(initialMessages)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    setMessages(loadMessages(newLocale))
  }, [])

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const value = resolveNestedKey(messages, key)
      if (value !== undefined) return value
      return fallback || key
    },
    [messages]
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </I18nContext.Provider>
  )
}
