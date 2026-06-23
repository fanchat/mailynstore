import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServerTranslation } from "@lib/i18n/getMessages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()

  return {
    title: t("cart.title"),
    description: "View your cart",
  }
}

export default async function Cart() {
  const { t } = await getServerTranslation()
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return <CartTemplate cart={cart} customer={customer} />
}
