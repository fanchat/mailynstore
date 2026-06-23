import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import Script from "next/script"
import { I18nProvider } from "@lib/i18n/TranslationsProvider"
import { getLocale, getMessages } from "@lib/i18n/getMessages"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
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
        <Script id="chatwoot" strategy="afterInteractive">
          {`(function(d,t){var BASE_URL="${process.env.NEXT_PUBLIC_CHATWOOT_URL || "http://localhost:3000"}";var g=d.createElement(t),s=d.getElementsByTagName(t)[0];g.src=BASE_URL+"/packs/js/sdk.js";g.defer=true;g.async=true;s.parentNode.insertBefore(g,s);g.onload=function(){window.chatwootSDK.run({websiteToken:"${process.env.NEXT_PUBLIC_CHATWOOT_TOKEN || ""}",baseUrl:BASE_URL})}})(document,"script")`}
        </Script>
      </body>
    </html>
  )
}
