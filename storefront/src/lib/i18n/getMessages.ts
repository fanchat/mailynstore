import { cookies } from "next/headers"
import { type Locale, defaultLocale } from "./config"

export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies()
    const locale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined
    if (locale && ["en", "zh", "de"].includes(locale)) {
      return locale
    }
  } catch {}
  return defaultLocale
}

export async function getMessages(locale?: Locale) {
  const l = locale || (await getLocale())
  try {
    return (await import(`../../../messages/${l}.json`)).default
  } catch {
    return (await import(`../../../messages/${defaultLocale}.json`)).default
  }
}

// Helper for server components to get translation
export async function getServerTranslation(locale?: Locale) {
  const l = locale || (await getLocale())
  const messages = await getMessages(l)
  
  function resolveNestedKey(obj: any, key: string): string | undefined {
    return key.split(".").reduce((acc: any, part) => {
      if (acc && typeof acc === "object") return acc[part]
      return undefined
    }, obj)
  }
  
  return {
    locale: l,
    t: (key: string, fallback?: string) => {
      const value = resolveNestedKey(messages, key)
      return value !== undefined ? value : (fallback || key)
    },
  }
}
