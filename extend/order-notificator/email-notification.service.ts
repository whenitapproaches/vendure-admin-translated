import { Injectable, Inject } from "@nestjs/common"
import {
  Order,
  OrderState,
  RequestContext,
  TransactionalConnection,
} from "@vendure/core"
import { PluginInitOptions } from "./types"
import { ORDER_NOTIFICATOR_PLUGIN_OPTIONS } from "./constants"
import { NotificationTemplateService } from "./services/notification-template.service"
import {
  NotificationType,
  NotificationEvent,
} from "./entities/notification-template.entity"
import * as nodemailer from "nodemailer"

@Injectable()
export class EmailNotificationService {
  constructor(
    @Inject(ORDER_NOTIFICATOR_PLUGIN_OPTIONS)
    private options: PluginInitOptions,
    private connection: TransactionalConnection,
    private notificationTemplateService: NotificationTemplateService
  ) {}

  async sendOrderStateTransitionEmail(
    order: Order,
    previousState: OrderState,
    newState: OrderState
  ): Promise<void> {
    if (
      !this.options.enableOrderStatusChangeNotifications ||
      !this.options.enableEmailNotifications
    ) {
      return
    }

    try {
      const customerEmail = order.customer?.emailAddress
      if (!customerEmail) {
        console.warn(`No customer email found for order ${order.code}`)
        return
      }

      // Create a temporary RequestContext for database operations
      const ctx = RequestContext.empty()

      // Get email template for order status change
      const template =
        await this.notificationTemplateService.findByTypeAndEvent(
          ctx,
          NotificationType.EMAIL,
          NotificationEvent.ORDER_CREATED
        )

      if (!template) {
        console.warn(
          `No email template found for ORDER_STATUS_CHANGED event. Please initialize default templates.`
        )
        return
      }

      // Process template with order data
      const subject = await this.notificationTemplateService.processTemplate(
        ctx,
        template.subject,
        order,
        {
          previousState,
          newState,
        }
      )
      const body = await this.notificationTemplateService.processTemplate(
        ctx,
        template.content,
        order,
        {
          previousState,
          newState,
        }
      )

      const fromName = this.options.emailFromName
      const fromAddress = this.options.emailFromAddress

      // Create transporter using the same SMTP settings as EmailPlugin
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_GMAIL_USER,
          pass: process.env.EMAIL_GMAIL_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: customerEmail,
        subject,
        html: body,
      })
    } catch (error) {
      console.error(`Error sending order state transition email: ${error}`)
    }
  }

  async sendOrderConfirmationEmail(
    order: Order,
  ): Promise<void> {
    if (
      !this.options.enableOrderStatusChangeNotifications ||
      !this.options.enableEmailNotifications
    ) {
      return
    }

    try {
      const customerEmail = order.customer?.emailAddress
      if (!customerEmail) {
        console.warn(`No customer email found for order ${order.code}`)
        return
      }

      // Create a temporary RequestContext for database operations
      const ctx = RequestContext.empty()

      // Get email template for order confirmation
      const template =
        await this.notificationTemplateService.findByTypeAndEvent(
          ctx,
          NotificationType.EMAIL,
          NotificationEvent.ORDER_CONFIRMED
        )

      if (!template) {
        console.warn(
          `No email template found for ORDER_CONFIRMED event. Please initialize default templates.`
        )
        return
      }

      // Process template with order data
      const subject = await this.notificationTemplateService.processTemplate(
        ctx,
        template.subject,
        order,
        {}
      )
      const body = await this.notificationTemplateService.processTemplate(
        ctx,
        template.content,
        order,
        {}
      )

      const fromName = this.options.emailFromName
      const fromAddress = this.options.emailFromAddress

      // Create transporter using the same SMTP settings as EmailPlugin
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_GMAIL_USER,
          pass: process.env.EMAIL_GMAIL_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: customerEmail,
        subject,
        html: body,
      })
    } catch (error) {
      console.error(`Error sending order confirmation email: ${error}`)
    }
  }

  async sendOrderShippedEmail(order: Order): Promise<void> {
    if (
      !this.options.enableOrderStatusChangeNotifications ||
      !this.options.enableEmailNotifications
    ) {
      return
    }

    try {
      const customerEmail = order.customer?.emailAddress
      if (!customerEmail) {
        console.warn(`No customer email found for order ${order.code}`)
        return
      }

      // Create a temporary RequestContext for database operations
      const ctx = RequestContext.empty()

      // Get email template for order shipped
      const template =
        await this.notificationTemplateService.findByTypeAndEvent(
          ctx,
          NotificationType.EMAIL,
          NotificationEvent.ORDER_SHIPPED
        )

      if (!template) {
        console.warn(
          `No email template found for ORDER_SHIPPED event. Please initialize default templates.`
        )
        return
      }

      // Process template with order data
      const subject = await this.notificationTemplateService.processTemplate(
        ctx,
        template.subject,
        order,
        {}
      )
      const body = await this.notificationTemplateService.processTemplate(
        ctx,
        template.content,
        order,
        {}
      )

      const fromName = this.options.emailFromName
      const fromAddress = this.options.emailFromAddress

      // Create transporter using the same SMTP settings as EmailPlugin
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_GMAIL_USER,
          pass: process.env.EMAIL_GMAIL_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: customerEmail,
        subject,
        html: body,
      })
    } catch (error) {
      console.error(`Error sending order shipped email: ${error}`)
    }
  }
}
