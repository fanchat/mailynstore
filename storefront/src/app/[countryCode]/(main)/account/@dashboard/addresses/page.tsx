import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerTranslation } from "@lib/i18n/getMessages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()

  return {
    title: t("account.addressesTitle"),
    description: t("account.addressesDesc", "View your addresses"),
  }
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)
  const { t } = await getServerTranslation()

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("account.addressesTitle")}</h1>
        <p className="text-base-regular">
          {t(
            "account.addressesDesc",
            "View and update your shipping addresses, you can add as many as you like. Saving your addresses will make them available during checkout."
          )}
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
