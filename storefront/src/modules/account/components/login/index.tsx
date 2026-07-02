"use client"

import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useParams } from "next/navigation"
import { useActionState } from "react"
import { useTranslation } from "@lib/i18n/TranslationsProvider"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const { t } = useTranslation()
  const { countryCode } = useParams() as { countryCode: string }
  const [message, formAction] = useActionState(login, null)

  return (
    <div className="max-w-sm w-full flex flex-col items-center" data-testid="login-page">
      <h1 className="text-large-semi uppercase mb-6">{t("auth.welcomeBack")}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {t("auth.signInDescription")}
      </p>

      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("auth.emailLabel")}
            name="email"
            title="Enter your email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("auth.passwordLabel")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          {t("auth.signInButton")}
        </SubmitButton>
      </form>

      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("auth.notMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          {t("auth.signUpButton")}
        </button>
        .
      </span>
    </div>
  )
}

export default Login