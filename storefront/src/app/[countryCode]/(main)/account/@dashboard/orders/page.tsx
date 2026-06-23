import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"
import { getServerTranslation } from "@lib/i18n/getMessages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()

  return {
    title: t("account.ordersTitle"),
    description: t(
      "account.ordersDesc",
      "Overview of your previous orders."
    ),
  }
}

export default async function Orders() {
  const orders = await listOrders()
  const { t } = await getServerTranslation()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("account.ordersTitle")}</h1>
        <p className="text-base-regular">
          {t(
            "account.ordersDesc",
            "View your previous orders and their status. You can also create returns or exchanges for your orders if needed."
          )}
        </p>
      </div>
      <div>
        <OrderOverview orders={orders} />
        <Divider className="my-16" />
        <TransferRequestForm />
      </div>
    </div>
  )
}
