import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import ProfileDeleteAccount from "@modules/account/components/profile-delete-account"
import LocaleSwitcher from "@lib/i18n/LocaleSwitcher"

import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerTranslation } from "@lib/i18n/getMessages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()

  return {
    title: t("account.profileTitle"),
    description: t(
      "account.profileDesc",
      "View and edit your maily's store profile."
    ),
  }
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()
  const { t } = await getServerTranslation()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("account.profileTitle")}</h1>
        <p className="text-base-regular">
          {t(
            "account.profileDesc",
            "View and update your profile information, including your name, email, and phone number. You can also update your billing address, or change your password."
          )}
        </p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        {/* <ProfilePassword customer={customer} />
        <Divider /> */}
        <ProfileBillingAddress customer={customer} regions={regions} />
        <Divider />
        <ProfileDeleteAccount />
        <div className="pt-4 pb-2 flex items-center gap-2 text-sm text-ui-fg-subtle">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
;``
