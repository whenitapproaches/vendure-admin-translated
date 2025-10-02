import { Injectable } from "@nestjs/common"
import { TransactionalConnection, RequestContext, Order } from "@vendure/core"
import {
  NotificationTemplate,
  NotificationType,
  NotificationEvent,
} from "../entities/notification-template.entity"
import { StoreSettingsService } from "../../store-settings/services/store-settings.service"
import * as Handlebars from "handlebars"

export interface CreateNotificationTemplateInput {
  name: string
  type: NotificationType
  event: NotificationEvent
  subject: string
  content: string
  description?: string
}

export interface UpdateNotificationTemplateInput {
  id: string
  name?: string
  subject?: string
  content?: string
  isActive?: boolean
  description?: string
}

@Injectable()
export class NotificationTemplateService {
  constructor(
    private connection: TransactionalConnection,
    private storeSettingsService: StoreSettingsService
  ) {
    this.registerHandlebarsHelpers()
  }

  private registerHandlebarsHelpers() {
    // Helper for formatting currency
    Handlebars.registerHelper(
      "currency",
      function (amount: number, currencyCode: string = "USD") {
        if (typeof amount !== "number") return "$0.00"
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currencyCode,
        }).format(amount / 100) // Convert from cents
      }
    )

    // Helper for formatting dates
    Handlebars.registerHelper(
      "formatDate",
      function (date: Date | string, format: string = "long") {
        const dateObj = typeof date === "string" ? new Date(date) : date
        if (format === "short") {
          return dateObj.toLocaleDateString()
        }
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(dateObj)
      }
    )

    // Helper for conditional formatting
    Handlebars.registerHelper(
      "ifEquals",
      function (this: any, arg1: any, arg2: any, options: any) {
        return arg1 == arg2 ? options.fn(this) : options.inverse(this)
      }
    )

    // Helper for capitalizing text
    Handlebars.registerHelper("capitalize", function (str: string) {
      if (typeof str !== "string") return ""
      return str.charAt(0).toUpperCase() + str.slice(1)
    })

    // Helper for formatting order status
    Handlebars.registerHelper("formatStatus", function (status: string) {
      if (typeof status !== "string") return ""
      return status.replace(/([A-Z])/g, " $1").trim()
    })
  }

  async findAll(ctx: RequestContext): Promise<NotificationTemplate[]> {
    return this.connection.getRepository(ctx, NotificationTemplate).find()
  }

  async findOne(
    ctx: RequestContext,
    id: string
  ): Promise<NotificationTemplate | null> {
    return this.connection
      .getRepository(ctx, NotificationTemplate)
      .findOne({ where: { id } })
  }

  async findByTypeAndEvent(
    ctx: RequestContext,
    type: NotificationType,
    event: NotificationEvent
  ): Promise<NotificationTemplate | null> {
    return this.connection
      .getRepository(ctx, NotificationTemplate)
      .findOne({ where: { type, event, isActive: true } })
  }

  async create(
    ctx: RequestContext,
    input: CreateNotificationTemplateInput
  ): Promise<NotificationTemplate> {
    const template = new NotificationTemplate({
      name: input.name,
      type: input.type,
      event: input.event,
      subject: input.subject,
      content: input.content,
      description: input.description,
      isActive: true,
    })

    const saved = await this.connection
      .getRepository(ctx, NotificationTemplate)
      .save(template)

    return saved
  }

  async update(
    ctx: RequestContext,
    input: UpdateNotificationTemplateInput
  ): Promise<NotificationTemplate> {
    const template = await this.findOne(ctx, input.id)
    if (!template) {
      throw new Error(`NotificationTemplate with id ${input.id} not found`)
    }

    if (input.name !== undefined) template.name = input.name
    if (input.subject !== undefined) template.subject = input.subject
    if (input.content !== undefined) template.content = input.content
    if (input.isActive !== undefined) template.isActive = input.isActive
    if (input.description !== undefined)
      template.description = input.description

    return this.connection
      .getRepository(ctx, NotificationTemplate)
      .save(template)
  }

  async delete(ctx: RequestContext, id: string): Promise<boolean> {
    const result = await this.connection
      .getRepository(ctx, NotificationTemplate)
      .delete(id)
    return (result.affected ?? 0) > 0
  }

  /**
   * Load store settings and format them for template usage
   */
  private async loadStoreSettings(
    ctx: RequestContext
  ): Promise<Record<string, string>> {
    try {
      const storeSettings = await this.storeSettingsService.findAll(ctx)
      const settingsMap: Record<string, string> = {}

      storeSettings.forEach((setting) => {
        settingsMap[setting.key] = setting.value
      })

      return settingsMap
    } catch (error) {
      console.error("Error loading store settings:", error)
      return {}
    }
  }

  /**
   * Process template using Handlebars template engine
   * Supports advanced templating features:
   * - Variables: {{order.code}}, {{customer.firstName}}, {{storeSettings.shop-name}}
   * - Helpers: {{currency order.totalWithTax order.currencyCode}}
   * - Conditionals: {{#ifEquals order.state "PaymentSettled"}}...{{/ifEquals}}
   * - Loops: {{#each order.lines}}...{{/each}}
   * - Formatting: {{formatDate order.createdAt}}, {{capitalize order.state}}
   */
  async processTemplate(
    ctx: RequestContext,
    template: string,
    order: Order,
    additionalData: Record<string, any> = {}
  ): Promise<string> {
    try {
      const compiledTemplate = Handlebars.compile(template)

      // Load store settings
      const storeSettings = await this.loadStoreSettings(ctx)

      // Prepare template data
      const templateData = {
        order: {
          code: order.code || "",
          state: order.state || "",
          totalWithTax: order.totalWithTax || 0,
          total: order.totalWithTax || 0, // Alias for convenience
          currencyCode: order.currencyCode || "USD",
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          lines:
            order.lines?.map((line) => ({
              id: line.id,
              quantity: line.quantity,
              productVariant: {
                id: line.productVariant?.id,
                name:
                  line.productVariant?.name ||
                  line.productVariant?.translations[0]?.name ||
                  "Sản phẩm không có tên",
                sku: line.productVariant?.sku,
              },
              linePriceWithTax: line.linePriceWithTax || 0,
              unitPriceWithTax: line.unitPriceWithTax || 0,
            })) || [],
          shippingAddress: this.formatAddressObject(order.shippingAddress),
          billingAddress: this.formatAddressObject(order.billingAddress),
        },
        customer: {
          id: order.customer?.id,
          firstName: order.customer?.firstName || "",
          lastName: order.customer?.lastName || "",
          fullName:
            `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() ||
            "Valued Customer",
          email: order.customer?.emailAddress || "",
        },
        storeSettings,
        // Add any additional data
        ...additionalData,
      }

      return compiledTemplate(templateData)
    } catch (error) {
      console.error("Error processing template:", error)
      return `Template processing error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }

  private formatCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100) // Convert from cents
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  private formatOrderItems(order: Order): string {
    if (!order.lines || order.lines.length === 0) {
      return "No items"
    }

    return order.lines
      .map((line: any) => {
        const name = line.productVariant?.name || "Unknown item"
        const quantity = line.quantity || 0
        const price = this.formatCurrency(
          line.linePriceWithTax || 0,
          order.currencyCode
        )
        return `${quantity}x ${name} - ${price}`
      })
      .join("\n")
  }

  private formatAddress(address: any): string {
    if (!address) return ""

    const parts = [
      address.fullName,
      address.streetLine1,
      address.streetLine2,
      address.city,
      address.province,
      address.postalCode,
      address.country,
    ].filter(Boolean)

    return parts.join(", ")
  }

  private formatAddressObject(address: any): any {
    if (!address) return null

    return {
      fullName: address.fullName || "",
      streetLine1: address.streetLine1 || "",
      streetLine2: address.streetLine2 || "",
      city: address.city || "",
      province: address.province || "",
      postalCode: address.postalCode || "",
      country: address.country || "",
      formatted: this.formatAddress(address),
    }
  }

  /**
   * Get default templates for initialization
   */
  getDefaultTemplates(): CreateNotificationTemplateInput[] {
    return [
      {
        name: "Default Email Order Created",
        type: NotificationType.EMAIL,
        event: NotificationEvent.ORDER_CREATED,
        subject:
          "🎉 Cảm ơn bạn đã đặt hàng tại {{storeSettings.shop-name}} - Đơn hàng {{order.code}}",
        content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cảm ơn bạn đã đặt hàng - {{storeSettings.shop-name}}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #fefde8;
            line-height: 1.6;
            color: #1A242E;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 8px 24px rgba(26, 36, 46, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #E40066 0%, #0F3460 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
            position: relative;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .store-logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            margin-bottom: 8px;
        }
        .header .subtitle {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
            background-color: #ffffff;
        }
        .greeting {
            font-size: 20px;
            color: #E40066;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            color: #1A242E;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .order-summary {
            background: linear-gradient(135deg, #fefde8 0%, #f9f9f9 100%);
            border-left: 4px solid #E40066;
            padding: 25px;
            margin: 30px 0;
            border-radius: 0 12px 12px 0;
            box-shadow: 0 4px 12px rgba(228, 0, 102, 0.1);
        }
        .order-summary h3 {
            margin-top: 0;
            color: #0F3460;
            font-size: 18px;
            font-weight: 600;
        }
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E5E7EB;
        }
        .order-info:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .order-info .label {
            font-weight: 600;
            color: #0F3460;
        }
        .order-info .value {
            color: #1A242E;
            font-weight: 500;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(26, 36, 46, 0.1);
        }
        .items-table th {
            background: #E40066;
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #E5E7EB;
            color: #1A242E;
        }
        .items-table tr:last-child td {
            border-bottom: none;
        }
        .items-table tr:nth-child(even) {
            background-color: #fefde8;
        }
        .total-section {
            background: linear-gradient(135deg, #E40066 0%, #0F3460 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 6px 16px rgba(228, 0, 102, 0.3);
        }
        .total-section h3 {
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .total-amount {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .address-section {
            display: flex;
            gap: 20px;
            margin: 30px 0;
        }
        .address-box {
            flex: 1;
            background: linear-gradient(135deg, #fefde8 0%, #f9f9f9 100%);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #E5E7EB;
            box-shadow: 0 2px 8px rgba(26, 36, 46, 0.05);
        }
        .address-box h4 {
            margin-top: 0;
            color: #0F3460;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .address-box p {
            margin: 0;
            color: #1A242E;
            line-height: 1.6;
        }
        .thank-you-section {
            background: linear-gradient(135deg, #fefde8 0%, #ffffff 100%);
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            text-align: center;
            border: 2px solid #E40066;
        }
        .thank-you-section h3 {
            color: #E40066;
            font-size: 24px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .thank-you-section p {
            color: #1A242E;
            font-size: 16px;
            margin-bottom: 15px;
        }
        .contact-info {
            background-color: #0F3460;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .contact-info h4 {
            color: white;
            margin-top: 0;
            font-size: 20px;
            margin-bottom: 20px;
        }
        .contact-info p {
            margin: 8px 0;
            opacity: 0.9;
        }
        .contact-info a {
            color: #E40066;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            background-color: #1A242E;
            color: #9CA3AF;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
        }
        .footer p {
            margin: 5px 0;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #E40066 0%, #0F3460 100%);
            margin: 30px 0;
            border: none;
            border-radius: 2px;
        }
        .emoji {
            font-size: 20px;
            margin-right: 8px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 600px) {
            .container { margin: 0; border-radius: 0; box-shadow: none; }
            .content { padding: 30px 20px; }
            .address-section { flex-direction: column; gap: 15px; }
            .items-table th, .items-table td { padding: 12px 8px; font-size: 13px; }
            .header h1 { font-size: 24px; }
            .total-amount { font-size: 28px; }
            .store-logo { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="store-logo">{{storeSettings.shop-name}}</div>
                <h1>🎉 Cảm ơn bạn đã đặt hàng!</h1>
                <p class="subtitle">Chúng tôi rất vui khi được phục vụ bạn</p>
            </div>
        </div>
        <div class="content">
            <div class="greeting">Xin chào {{customer.fullName}}! 👋</div>
            <div class="message">
                <p>Chúng tôi xin chân thành cảm ơn bạn đã tin tưởng và lựa chọn <strong>{{storeSettings.shop-name}}</strong>! Đơn hàng của bạn đã được xác nhận thành công và đang được chuẩn bị với sự tận tâm nhất.</p>
                <p>Dưới đây là thông tin chi tiết về đơn hàng của bạn. Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng liên hệ với chúng tôi.</p>
            </div>
            <div class="order-summary">
                <h3><span class="emoji">📋</span>Thông Tin Đơn Hàng</h3>
                <div class="order-info">
                    <span class="label">Mã đơn hàng:</span>
                    <span class="value"><strong>{{order.code}}</strong></span>
                </div>
                {{#if customer.email}}
                <div class="order-info">
                    <span class="label">Email:</span>
                    <span class="value">{{customer.email}}</span>
                </div>
                {{/if}}
            </div>
            <hr class="divider">
            <h3><span class="emoji">🛍️</span>Sản Phẩm Đã Đặt</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each order.lines}}
                    <tr>
                        <td><strong>{{productVariant.name}}</strong></td>
                        <td>{{quantity}}</td>
                        <td>{{currency unitPriceWithTax ../order.currencyCode}}</td>
                        <td>{{currency linePriceWithTax ../order.currencyCode}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            <div class="total-section">
                <h3>Tổng Cộng</h3>
                <div class="total-amount">{{currency order.totalWithTax order.currencyCode}}</div>
            </div>
            <hr class="divider">
            {{#if order.shippingAddress}}
            <div class="address-section">
                <div class="address-box">
                    <h4><span class="emoji">📦</span>Địa Chỉ Giao Hàng</h4>
                    <p>{{order.shippingAddress.fullName}}<br>{{order.shippingAddress.streetLine1}}<br>{{#if order.shippingAddress.streetLine2}}{{order.shippingAddress.streetLine2}}<br>{{/if}}{{order.shippingAddress.city}}, {{order.shippingAddress.province}} {{order.shippingAddress.postalCode}}<br>{{order.shippingAddress.country}}</p>
                </div>
            </div>
            {{/if}}
            <hr class="divider">
            <div class="thank-you-section">
                <h3>💝 Cảm Ơn Bạn Rất Nhiều!</h3>
                <p>Chúng tôi rất trân trọng sự tin tưởng của bạn dành cho <strong>{{storeSettings.shop-name}}</strong>. Đây là động lực để chúng tôi không ngừng cải thiện chất lượng sản phẩm và dịch vụ.</p>
                <p>Chúng tôi sẽ liên hệ với bạn sớm nhất về việc xử lý đơn hàng. Cảm ơn bạn đã lựa chọn chúng tôi! 🌟</p>
            </div>
            <div class="message">
                <p><strong>Cần hỗ trợ?</strong> Đội ngũ chăm sóc khách hàng của chúng tôi luôn sẵn sàng hỗ trợ bạn. Vui lòng liên hệ với chúng tôi qua các kênh bên dưới.</p>
            </div>
        </div>
        <div class="contact-info">
            <h4><span class="emoji">🏪</span>{{storeSettings.shop-name}}</h4>
            <p>Chất lượng là ưu tiên hàng đầu</p>
            <p>📞 {{storeSettings.shop-phone}}</a></p>
            <p>🌐 <a href="{{storeSettings.shop-site}}">{{storeSettings.shop-site}}</a></p>
        </div>
        <div class="footer">
            <p><strong>{{storeSettings.shop-name}}</strong></p>
            <p>{{storeSettings.footer-address}}</p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">© 2024 {{storeSettings.shop-name}}. Tất cả quyền được bảo lưu.<br>Bạn nhận được email này vì đã đặt hàng tại cửa hàng của chúng tôi.</p>
        </div>
    </div>
</body>
</html>`,
        description:
          "Vietnamese email template sent when an order is created for 14Elevent store with store settings integration",
      },
      {
        name: "Default Telegram Order Created",
        type: NotificationType.TELEGRAM,
        event: NotificationEvent.ORDER_CREATED,
        subject: "New Order Notification",
        content: `🛍️ <b>New Order Received!</b>

📋 <b>Order:</b> {{order.code}}
👤 <b>Customer:</b> {{customer.fullName}}
💰 <b>Total:</b> {{currency order.totalWithTax order.currencyCode}}
📅 <b>Date:</b> {{formatDate order.createdAt}}

📦 <b>Items:</b>
{{#each order.lines}}
• {{quantity}}x {{productVariant.name}} - {{currency linePriceWithTax ../order.currencyCode}}
{{/each}}

{{#if order.shippingAddress}}
📍 <b>Shipping to:</b>
{{order.shippingAddress.formatted}}
{{/if}}`,
        description:
          "Default Telegram template for order creation notifications with Handlebars",
      },
      {
        name: "Default Email Order Confirmed",
        type: NotificationType.EMAIL,
        event: NotificationEvent.ORDER_CONFIRMED,
        subject:
          "✅ Đơn hàng {{order.code}} đã được xác nhận - {{storeSettings.shop-name}}",
        content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn hàng đã được xác nhận - {{storeSettings.shop-name}}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f9ff;
            line-height: 1.6;
            color: #1A242E;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 8px 24px rgba(26, 36, 46, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
            position: relative;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .store-logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            margin-bottom: 8px;
        }
        .header .subtitle {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
            background-color: #ffffff;
        }
        .greeting {
            font-size: 20px;
            color: #10B981;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            color: #1A242E;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .confirmation-badge {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
        .confirmation-badge h3 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }
        .confirmation-badge p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .order-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-left: 4px solid #10B981;
            padding: 25px;
            margin: 30px 0;
            border-radius: 0 12px 12px 0;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
        }
        .order-summary h3 {
            margin-top: 0;
            color: #059669;
            font-size: 18px;
            font-weight: 600;
        }
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E5E7EB;
        }
        .order-info:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .order-info .label {
            font-weight: 600;
            color: #059669;
        }
        .order-info .value {
            color: #1A242E;
            font-weight: 500;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(26, 36, 46, 0.1);
        }
        .items-table th {
            background: #10B981;
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #E5E7EB;
            color: #1A242E;
        }
        .items-table tr:last-child td {
            border-bottom: none;
        }
        .items-table tr:nth-child(even) {
            background-color: #f0f9ff;
        }
        .total-section {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
        .total-section h3 {
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .total-amount {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .next-steps {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #F59E0B;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
        }
        .next-steps h3 {
            color: #92400E;
            margin-top: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .next-steps ul {
            margin: 0;
            padding-left: 20px;
            color: #92400E;
        }
        .next-steps li {
            margin-bottom: 8px;
        }
        .contact-info {
            background-color: #059669;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .contact-info h4 {
            color: white;
            margin-top: 0;
            font-size: 20px;
            margin-bottom: 20px;
        }
        .contact-info p {
            margin: 8px 0;
            opacity: 0.9;
        }
        .contact-info a {
            color: #FEF3C7;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            background-color: #1A242E;
            color: #9CA3AF;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
        }
        .footer p {
            margin: 5px 0;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #10B981 0%, #059669 100%);
            margin: 30px 0;
            border: none;
            border-radius: 2px;
        }
        .emoji {
            font-size: 20px;
            margin-right: 8px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 600px) {
            .container { margin: 0; border-radius: 0; box-shadow: none; }
            .content { padding: 30px 20px; }
            .items-table th, .items-table td { padding: 12px 8px; font-size: 13px; }
            .header h1 { font-size: 24px; }
            .total-amount { font-size: 28px; }
            .store-logo { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="store-logo">{{storeSettings.shop-name}}</div>
                <h1>✅ Đơn hàng đã được xác nhận!</h1>
                <p class="subtitle">Thanh toán thành công - Đơn hàng đang được xử lý</p>
            </div>
        </div>
        <div class="content">
            <div class="greeting">Xin chào {{customer.fullName}}! 🎉</div>
            <div class="message">
                <p>Chúc mừng! Đơn hàng của bạn đã được <strong>xác nhận thành công</strong> và thanh toán đã được xử lý. Chúng tôi rất vui được thông báo rằng đơn hàng {{order.code}} hiện đang được chuẩn bị để giao hàng.</p>
                <p>Dưới đây là thông tin chi tiết về đơn hàng đã được xác nhận của bạn.</p>
            </div>
            
            <div class="confirmation-badge">
                <h3>🎯 Đơn Hàng Đã Được Xác Nhận</h3>
                <p>Thanh toán thành công • Đang chuẩn bị giao hàng</p>
            </div>

            <div class="order-summary">
                <h3><span class="emoji">📋</span>Thông Tin Đơn Hàng</h3>
                <div class="order-info">
                    <span class="label">Mã đơn hàng:</span>
                    <span class="value"><strong>{{order.code}}</strong></span>
                </div>
                <div class="order-info">
                    <span class="label">Trạng thái:</span>
                    <span class="value" style="color: #10B981; font-weight: 600;">{{formatStatus order.state}}</span>
                </div>
                <div class="order-info">
                    <span class="label">Ngày xác nhận:</span>
                    <span class="value">{{formatDate order.updatedAt}}</span>
                </div>
                {{#if customer.email}}
                <div class="order-info">
                    <span class="label">Email:</span>
                    <span class="value">{{customer.email}}</span>
                </div>
                {{/if}}
            </div>
            
            <hr class="divider">
            <h3><span class="emoji">🛍️</span>Sản Phẩm Đã Đặt</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each order.lines}}
                    <tr>
                        <td><strong>{{productVariant.name}}</strong></td>
                        <td>{{quantity}}</td>
                        <td>{{currency unitPriceWithTax ../order.currencyCode}}</td>
                        <td>{{currency linePriceWithTax ../order.currencyCode}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            
            <div class="total-section">
                <h3>Tổng Cộng</h3>
                <div class="total-amount">{{currency order.totalWithTax order.currencyCode}}</div>
            </div>
            
            <hr class="divider">
            {{#if order.shippingAddress}}
            <div class="address-section">
                <div class="address-box">
                    <h4><span class="emoji">📦</span>Địa Chỉ Giao Hàng</h4>
                    <p>{{order.shippingAddress.fullName}}<br>{{order.shippingAddress.streetLine1}}<br>{{#if order.shippingAddress.streetLine2}}{{order.shippingAddress.streetLine2}}<br>{{/if}}{{order.shippingAddress.city}}, {{order.shippingAddress.province}} {{order.shippingAddress.postalCode}}<br>{{order.shippingAddress.country}}</p>
                </div>
            </div>
            {{/if}}
            
            <hr class="divider">
            <div class="next-steps">
                <h3><span class="emoji">📋</span>Bước Tiếp Theo</h3>
                <ul>
                    <li>✅ <strong>Thanh toán đã được xác nhận</strong> - Giao dịch thành công</li>
                    <li>📦 <strong>Đang chuẩn bị hàng</strong> - Đơn hàng đang được đóng gói</li>
                    <li>🚚 <strong>Giao hàng</strong> - Chúng tôi sẽ thông báo khi hàng được gửi</li>
                    <li>📱 <strong>Theo dõi đơn hàng</strong> - Bạn sẽ nhận được thông tin vận chuyển</li>
                </ul>
            </div>
            
            <div class="message">
                <p><strong>Cần hỗ trợ?</strong> Nếu bạn có bất kỳ câu hỏi nào về đơn hàng, vui lòng liên hệ với chúng tôi. Chúng tôi luôn sẵn sàng hỗ trợ bạn!</p>
            </div>
        </div>
        <div class="contact-info">
            <h4><span class="emoji">🏪</span>{{storeSettings.shop-name}}</h4>
            <p>Chất lượng là ưu tiên hàng đầu</p>
            <p>📞 {{storeSettings.shop-phone}}</p>
            <p>🌐 <a href="{{storeSettings.shop-site}}">{{storeSettings.shop-site}}</a></p>
        </div>
        <div class="footer">
            <p><strong>{{storeSettings.shop-name}}</strong></p>
            <p>{{storeSettings.footer-address}}</p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">© 2024 {{storeSettings.shop-name}}. Tất cả quyền được bảo lưu.<br>Bạn nhận được email này vì đã đặt hàng tại cửa hàng của chúng tôi.</p>
        </div>
    </div>
</body>
</html>`,
        description:
          "Vietnamese email template sent when an order is confirmed (payment settled) for 14Elevent store with store settings integration",
      },
      {
        name: "Default Email Order Shipped",
        type: NotificationType.EMAIL,
        event: NotificationEvent.ORDER_SHIPPED,
        subject:
          "🚚 Đơn hàng {{order.code}} đã được gửi - {{storeSettings.shop-name}}",
        content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn hàng đã được gửi - {{storeSettings.shop-name}}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #fef3c7;
            line-height: 1.6;
            color: #1A242E;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 8px 24px rgba(26, 36, 46, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
            position: relative;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .store-logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
            margin-bottom: 8px;
        }
        .header .subtitle {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
            background-color: #ffffff;
        }
        .greeting {
            font-size: 20px;
            color: #F59E0B;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            color: #1A242E;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .shipped-badge {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
        }
        .shipped-badge h3 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }
        .shipped-badge p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .order-summary {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #F59E0B;
            padding: 25px;
            margin: 30px 0;
            border-radius: 0 12px 12px 0;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
        }
        .order-summary h3 {
            margin-top: 0;
            color: #D97706;
            font-size: 18px;
            font-weight: 600;
        }
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E5E7EB;
        }
        .order-info:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .order-info .label {
            font-weight: 600;
            color: #D97706;
        }
        .order-info .value {
            color: #1A242E;
            font-weight: 500;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(26, 36, 46, 0.1);
        }
        .items-table th {
            background: #F59E0B;
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #E5E7EB;
            color: #1A242E;
        }
        .items-table tr:last-child td {
            border-bottom: none;
        }
        .items-table tr:nth-child(even) {
            background-color: #fef3c7;
        }
        .total-section {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
        }
        .total-section h3 {
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .total-amount {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .tracking-info {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border: 2px solid #3B82F6;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
        }
        .tracking-info h3 {
            color: #1E40AF;
            margin-top: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .tracking-info p {
            color: #1E40AF;
            margin: 0;
            line-height: 1.6;
        }
        .delivery-timeline {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 2px solid #22C55E;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
        }
        .delivery-timeline h3 {
            color: #15803D;
            margin-top: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .timeline-item {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px 0;
        }
        .timeline-item:last-child {
            margin-bottom: 0;
        }
        .timeline-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #22C55E;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-weight: bold;
            font-size: 16px;
        }
        .timeline-content {
            flex: 1;
        }
        .timeline-title {
            font-weight: 600;
            color: #15803D;
            margin-bottom: 5px;
        }
        .timeline-description {
            color: #166534;
            font-size: 14px;
        }
        .contact-info {
            background-color: #D97706;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .contact-info h4 {
            color: white;
            margin-top: 0;
            font-size: 20px;
            margin-bottom: 20px;
        }
        .contact-info p {
            margin: 8px 0;
            opacity: 0.9;
        }
        .contact-info a {
            color: #FEF3C7;
            text-decoration: none;
            font-weight: 600;
        }
        .footer {
            background-color: #1A242E;
            color: #9CA3AF;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
        }
        .footer p {
            margin: 5px 0;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
            margin: 30px 0;
            border: none;
            border-radius: 2px;
        }
        .emoji {
            font-size: 20px;
            margin-right: 8px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 600px) {
            .container { margin: 0; border-radius: 0; box-shadow: none; }
            .content { padding: 30px 20px; }
            .items-table th, .items-table td { padding: 12px 8px; font-size: 13px; }
            .header h1 { font-size: 24px; }
            .total-amount { font-size: 28px; }
            .store-logo { font-size: 28px; }
            .timeline-item { flex-direction: column; text-align: center; }
            .timeline-icon { margin-right: 0; margin-bottom: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="store-logo">{{storeSettings.shop-name}}</div>
                <h1>🚚 Đơn hàng đã được gửi!</h1>
                <p class="subtitle">Hàng đang trên đường đến với bạn</p>
            </div>
        </div>
        <div class="content">
            <div class="greeting">Xin chào {{customer.fullName}}! 🎉</div>
            <div class="message">
                <p>Tin vui! Đơn hàng {{order.code}} của bạn đã được <strong>gửi thành công</strong> và đang trên đường đến với bạn. Chúng tôi rất vui được thông báo rằng hàng hóa đã được đóng gói cẩn thận và giao cho đơn vị vận chuyển.</p>
                <p>Dưới đây là thông tin chi tiết về đơn hàng đã được gửi của bạn.</p>
            </div>
            
            <div class="shipped-badge">
                <h3>🚚 Đơn Hàng Đã Được Gửi</h3>
                <p>Đang vận chuyển • Sẽ đến sớm nhất có thể</p>
            </div>

            <div class="order-summary">
                <h3><span class="emoji">📋</span>Thông Tin Đơn Hàng</h3>
                <div class="order-info">
                    <span class="label">Mã đơn hàng:</span>
                    <span class="value"><strong>{{order.code}}</strong></span>
                </div>
                <div class="order-info">
                    <span class="label">Trạng thái:</span>
                    <span class="value" style="color: #F59E0B; font-weight: 600;">{{formatStatus order.state}}</span>
                </div>
                <div class="order-info">
                    <span class="label">Ngày gửi:</span>
                    <span class="value">{{formatDate order.updatedAt}}</span>
                </div>
                {{#if customer.email}}
                <div class="order-info">
                    <span class="label">Email:</span>
                    <span class="value">{{customer.email}}</span>
                </div>
                {{/if}}
            </div>
            
            <hr class="divider">
            <h3><span class="emoji">🛍️</span>Sản Phẩm Đã Gửi</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each order.lines}}
                    <tr>
                        <td><strong>{{productVariant.name}}</strong></td>
                        <td>{{quantity}}</td>
                        <td>{{currency unitPriceWithTax ../order.currencyCode}}</td>
                        <td>{{currency linePriceWithTax ../order.currencyCode}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            
            <div class="total-section">
                <h3>Tổng Cộng</h3>
                <div class="total-amount">{{currency order.totalWithTax order.currencyCode}}</div>
            </div>
            
            <hr class="divider">
            {{#if order.shippingAddress}}
            <div class="address-section">
                <div class="address-box">
                    <h4><span class="emoji">📦</span>Địa Chỉ Giao Hàng</h4>
                    <p>{{order.shippingAddress.fullName}}<br>{{order.shippingAddress.streetLine1}}<br>{{#if order.shippingAddress.streetLine2}}{{order.shippingAddress.streetLine2}}<br>{{/if}}{{order.shippingAddress.city}}, {{order.shippingAddress.province}} {{order.shippingAddress.postalCode}}<br>{{order.shippingAddress.country}}</p>
                </div>
            </div>
            {{/if}}
            
            <hr class="divider">
            <div class="tracking-info">
                <h3><span class="emoji">📱</span>Theo Dõi Đơn Hàng</h3>
                <p>Bạn có thể theo dõi trạng thái giao hàng của đơn hàng này. Chúng tôi sẽ gửi thông tin vận chuyển chi tiết qua email hoặc SMS khi có cập nhật mới.</p>
                <p><strong>Lưu ý:</strong> Thời gian giao hàng có thể thay đổi tùy thuộc vào địa điểm và điều kiện thời tiết. Chúng tôi sẽ cố gắng giao hàng trong thời gian sớm nhất có thể.</p>
            </div>
            
            <div class="delivery-timeline">
                <h3><span class="emoji">📅</span>Lộ Trình Giao Hàng</h3>
                <div class="timeline-item">
                    <div class="timeline-icon">✅</div>
                    <div class="timeline-content">
                        <div class="timeline-title">Đơn hàng đã được xác nhận</div>
                        <div class="timeline-description">Thanh toán thành công và đơn hàng được xử lý</div>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon">📦</div>
                    <div class="timeline-content">
                        <div class="timeline-title">Đóng gói và chuẩn bị</div>
                        <div class="timeline-description">Hàng hóa được đóng gói cẩn thận</div>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon">🚚</div>
                    <div class="timeline-content">
                        <div class="timeline-title">Đã gửi hàng</div>
                        <div class="timeline-description">Đơn hàng đang được vận chuyển</div>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon">🏠</div>
                    <div class="timeline-content">
                        <div class="timeline-title">Giao hàng thành công</div>
                        <div class="timeline-description">Hàng sẽ được giao đến địa chỉ của bạn</div>
                    </div>
                </div>
            </div>
            
            <div class="message">
                <p><strong>Cần hỗ trợ?</strong> Nếu bạn có bất kỳ câu hỏi nào về việc giao hàng hoặc cần thay đổi địa chỉ giao hàng, vui lòng liên hệ với chúng tôi ngay lập tức. Chúng tôi luôn sẵn sàng hỗ trợ bạn!</p>
            </div>
        </div>
        <div class="contact-info">
            <h4><span class="emoji">🏪</span>{{storeSettings.shop-name}}</h4>
            <p>Chất lượng là ưu tiên hàng đầu</p>
            <p>📞 {{storeSettings.shop-phone}}</p>
            <p>🌐 <a href="{{storeSettings.shop-site}}">{{storeSettings.shop-site}}</a></p>
        </div>
        <div class="footer">
            <p><strong>{{storeSettings.shop-name}}</strong></p>
            <p>{{storeSettings.footer-address}}</p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">© 2024 {{storeSettings.shop-name}}. Tất cả quyền được bảo lưu.<br>Bạn nhận được email này vì đã đặt hàng tại cửa hàng của chúng tôi.</p>
        </div>
    </div>
</body>
</html>`,
        description:
          "Vietnamese email template sent when an order is shipped for 14Elevent store with store settings integration",
      },
    ]
  }
}
