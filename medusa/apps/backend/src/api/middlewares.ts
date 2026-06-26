import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/social/profile/avatar",
      bodyParser: false,
    },
    {
      matcher: "/store/social/media",
      bodyParser: false,
    },
  ],
})