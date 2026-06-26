import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    path: "/app",
  },
  modules: {
    notification: {
      options: {
        providers: [
          {
            resolve: "./src/modules/smtp-notification",
            id: "smtp-notification",
            options: {
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || "465"),
              secure: true,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
              from: process.env.SMTP_FROM,
              channels: ["email"],
            },
          },
        ],
      },
    },
  },
})
