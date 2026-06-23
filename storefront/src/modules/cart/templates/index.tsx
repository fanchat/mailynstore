import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getServerTranslation } from "@lib/i18n/getMessages"

const CartTemplate = async ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { t } = await getServerTranslation()

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate
                cart={cart}
                heading={t("cart.title")}
              />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-white py-6">
                      <Summary
                        cart={cart as any}
                        checkoutText={t("cart.checkout")}
                        subtotalText={t("cart.subtotal")}
                        shippingText={t("cart.shipping")}
                        taxText={t("cart.tax")}
                        totalText={t("cart.total")}
                      />
                    </div>
                    <LocalizedClientLink href="/store">
                      <span className="text-ui-fg-interactive txt-medium-plus hover:text-ui-fg-interactive-hover">
                        {t("cart.continueShopping")}
                      </span>
                    </LocalizedClientLink>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-y-4">
            <EmptyCartMessage
              heading={t("cart.title")}
              message={t("cart.emptyCart")}
              linkText={t("cart.continueShopping")}
            />
            <LocalizedClientLink href="/store">
              <span className="text-ui-fg-interactive txt-medium-plus hover:text-ui-fg-interactive-hover">
                {t("cart.continueShopping")}
              </span>
            </LocalizedClientLink>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
