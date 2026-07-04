import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import Script from "next/script"
import { I18nProvider } from "@lib/i18n/TranslationsProvider"
import { getLocale, getMessages } from "@lib/i18n/getMessages"
import "styles/globals.css"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Mailyns",
    "mobile-web-app-capable": "yes",
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages(locale)

  return (
    <html lang={locale} data-mode="light">
      <body>
        <I18nProvider initialLocale={locale} initialMessages={messages}>
          <main className="relative">{props.children}</main>
        </I18nProvider>
        <Script id="client-error-log" strategy="afterInteractive">
          {`(function(){function report(e){try{var d={message:e.message||String(e),stack:e.stack||"",location:location.href};navigator.sendBeacon("/api/client-error",JSON.stringify(d))}catch(e){}}window.onerror=function(m,s,l,c,e){report(e||{message:m,stack:s+":"+l+":"+c})};window.addEventListener("unhandledrejection",function(e){report(e.reason||{message:"Unhandled Promise Rejection"})})})()`}
        </Script>
        <Script id="chatwoot" strategy="afterInteractive">
          {`(function(d,t){var BASE_URL="${process.env.NEXT_PUBLIC_CHATWOOT_URL || "http://localhost:3000"}";var g=d.createElement(t),s=d.getElementsByTagName(t)[0];g.src=BASE_URL+"/packs/js/sdk.js";g.defer=true;g.async=true;s.parentNode.insertBefore(g,s);g.onload=function(){window.chatwootSDK.run({websiteToken:"${process.env.NEXT_PUBLIC_CHATWOOT_TOKEN || ""}",baseUrl:BASE_URL})}})(document,"script")`}
        </Script>
        <Script defer src="/script.js" data-website-id="fe1f85f2-25fa-42e4-bd02-a597d86743e4" />
      </body>
    </html>
  )
}
