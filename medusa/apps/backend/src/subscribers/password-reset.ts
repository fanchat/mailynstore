import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AuthWorkflowEvents } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  entity_id: string
  actor_type: string
  token: string
  metadata?: Record<string, unknown>
}>) {
  const notificationModuleService: INotificationModuleService =
    container.resolve("notification")

  const { entity_id, actor_type, token } = data

  // Build the reset password URL
  const adminOrigins =
    process.env.ADMIN_CORS?.split(",").map((s) => s.trim()) || []
  const baseUrl = adminOrigins[0] || "http://localhost:9000"

  const resetUrl = `${baseUrl}/app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(entity_id)}`

  try {
    await notificationModuleService.createNotifications({
      to: entity_id,
      channel: "email",
      template: "auth.password_reset",
      data: {
        entity_id,
        actor_type,
        token,
      },
      content: {
        subject: "中欧优品 - 重置密码",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">中欧优品 - 重置密码</h2>
            <p>您好，</p>
            <p>您最近请求了重置密码。请点击下方按钮来设置新密码：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-size: 16px;
                        display: inline-block;">
                重置密码
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              此链接将在 15 分钟后过期。<br/>
              如果按钮无法点击，请复制以下链接到浏览器打开：
            </p>
            <p style="color: #4F46E5; font-size: 13px; word-break: break-all;">
              ${resetUrl}
            </p>
            <hr style="border: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              如果您没有请求重置密码，请忽略此邮件。
            </p>
          </div>
        `,
      },
    })
  } catch (error: any) {
    console.error(`[password-reset] Failed to send notification: ${error.message}`)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}
