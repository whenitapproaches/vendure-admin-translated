import { Injectable, Inject } from "@nestjs/common"
import { PluginInitOptions } from "./types"
import { ORDER_NOTIFICATOR_PLUGIN_OPTIONS } from "./constants"
import { NotificationTemplateService } from "./services/notification-template.service"
import {
  NotificationType,
  NotificationEvent,
} from "./entities/notification-template.entity"
import { RequestContext } from "@vendure/core"
import * as https from "https"
import { Order } from "@vendure/core"

@Injectable()
export class TelegramNotificationService {
  constructor(
    @Inject(ORDER_NOTIFICATOR_PLUGIN_OPTIONS)
    private options: PluginInitOptions,
    private notificationTemplateService: NotificationTemplateService
  ) {}

  async sendNotification(order: Order): Promise<void> {
    if (!this.options.telegramBotToken || !this.options.telegramChatId) {
      return
    }

    try {
      // Create a temporary RequestContext for database operations
      const ctx = RequestContext.empty()

      // Try to get custom template first
      const template =
        await this.notificationTemplateService.findByTypeAndEvent(
          ctx,
          NotificationType.TELEGRAM,
          NotificationEvent.ORDER_CREATED
        )

      let message: string

      if (template) {
        // Use custom template
        message = await this.notificationTemplateService.processTemplate(
          ctx,
          template.content,
          order
        )
      } else {
        // Fallback to default formatting
        message = this.formatOrderCreatedMessage(order)
      }

      const url = `https://api.telegram.org/bot${this.options.telegramBotToken}/sendMessage`
      const postData = JSON.stringify({
        chat_id: this.options.telegramChatId,
        text: message,
        parse_mode: "HTML",
      })

      const urlObj = new URL(url)
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      }

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = ""
          res.on("data", (chunk) => {
            data += chunk
          })
          res.on("end", () => {
            if (res.statusCode === 200) {
              resolve()
            } else {
              resolve()
            }
          })
        })

        req.on("error", (error) => {
          resolve()
        })

        req.write(postData)
        req.end()
      })
    } catch (error) {
      console.error(`Error sending Telegram notification: ${error}`)
    }
  }

  formatOrderCreatedMessage(order: any): string {
    const template =
      this.options.notificationTemplate?.orderCreated ||
      "🛒 <b>New Order Created</b>\n\n" +
        "Order ID: <code>{orderId}</code>\n" +
        "Customer: {customerName}\n" +
        "Total: {total}\n" +
        "Status: {status}\n" +
        "Created: {createdAt}"

    return template
      .replace("{orderId}", order.code)
      .replace(
        "{customerName}",
        order.customer?.firstName && order.customer?.lastName
          ? `${order.customer.firstName} ${order.customer.lastName}`
          : order.customer?.emailAddress || "Unknown"
      )
      .replace("{total}", order.total?.toFixed(2) || "0.00")
      .replace("{status}", order.state || "Unknown")
      .replace("{createdAt}", new Date(order.createdAt).toLocaleString())
  }

  formatOrderStatusChangeMessage(order: any, previousState: string): string {
    const template =
      this.options.notificationTemplate?.orderStatusChanged ||
      "📊 <b>Order Status Updated</b>\n\n" +
        "Order ID: <code>{orderId}</code>\n" +
        "Customer: {customerName}\n" +
        "Previous Status: {previousStatus}\n" +
        "New Status: {newStatus}\n" +
        "Updated: {updatedAt}"

    return template
      .replace("{orderId}", order.code)
      .replace(
        "{customerName}",
        order.customer?.firstName && order.customer?.lastName
          ? `${order.customer.firstName} ${order.customer.lastName}`
          : order.customer?.emailAddress || "Unknown"
      )
      .replace("{previousStatus}", previousState)
      .replace("{newStatus}", order.state || "Unknown")
      .replace("{updatedAt}", new Date().toLocaleString())
  }
}
