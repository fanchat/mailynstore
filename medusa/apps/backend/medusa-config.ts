import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    redisPrefix: "mailyn:",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    sessionOptions: {
      saveUninitialized: true,
    },
    cookieOptions: {
      secure: false,
    },
  },
  admin: {
    path: "/app",
  },
  modules: {
    auth: {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
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
