"use client"

import React from "react"
import { useTranslation } from "./TranslationsProvider"
import { locales, localeNames, localeFlags, type Locale } from "./config"

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale)
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      className={`bg-transparent border border-ui-border-base rounded px-2 py-1 text-xs cursor-pointer hover:text-ui-fg-base ${className}`}
      aria-label="Select language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeFlags[l]} {localeNames[l]}
        </option>
      ))}
    </select>
  )
}
