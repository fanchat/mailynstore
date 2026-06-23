import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { getServerTranslation } from "@lib/i18n/getMessages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()

  return {
    title: t("auth.welcomeBack"),
    description: t(
      "auth.signInDescription",
      "Sign in to your maily's store account."
    ),
  }
}

export default async function Login() {
  const { t } = await getServerTranslation()

  return <LoginTemplate />
}
