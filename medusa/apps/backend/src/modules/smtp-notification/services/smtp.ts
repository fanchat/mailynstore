import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import nodemailer, { Transporter } from "nodemailer"

type InjectedDependencies = {
  logger: Logger
}

interface SmtpNotificationOptions {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

export class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "smtp-notification"
  protected logger_: Logger
  protected options_: SmtpNotificationOptions
  private transporter_: Transporter

  constructor({ logger }: InjectedDependencies, options: SmtpNotificationOptions) {
    super()
    this.logger_ = logger
    this.options_ = options

    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.auth.user,
        pass: options.auth.pass,
      },
    })
  }

  static validateOptions(options: Record<string, any>) {
    if (!options.host) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP host is required in the provider's options."
      )
    }
    if (!options.port) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP port is required in the provider's options."
      )
    }
    if (!options.auth?.user || !options.auth?.pass) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP auth credentials (user/pass) are required in the provider's options."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "'from' address is required in the provider's options."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      )
    }

    const subject =
      notification.content?.subject ||
      (notification.data?.subject as string) ||
      "Notification"

    const html =
      notification.content?.html ||
      (notification.data?.html as string) ||
      (notification.content?.text || notification.data?.text
        ? `<p>${notification.content?.text || notification.data?.text}</p>`
        : `<p>Template: ${notification.template}</p><pre>${JSON.stringify(notification.data, null, 2)}</pre>`)

    try {
      const result = await this.transporter_.sendMail({
        from: this.options_.from,
        to: notification.to,
        subject,
        html,
      })

      this.logger_.info(
        `Email sent to ${notification.to}, messageId: ${result.messageId}`
      )

      return { id: result.messageId }
    } catch (error: any) {
      this.logger_.error(`Failed to send email to ${notification.to}: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error.message}`
      )
    }
  }
}

export default SmtpNotificationService
