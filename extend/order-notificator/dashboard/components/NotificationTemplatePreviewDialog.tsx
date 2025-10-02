import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/vdb/components/ui/dialog.js';
import { Button } from '@/vdb/components/ui/button.js';
import { Badge } from '@/vdb/components/ui/badge.js';
import { Trans } from '@/vdb/lib/trans.js';
import { Input } from '@/vdb/components/ui/input.js';
import { Label } from '@/vdb/components/ui/label.js';
import { api } from '@/vdb/graphql/api.js';
import { X, Search, RefreshCw } from 'lucide-react';

interface NotificationTemplate {
  id: string
  name: string
  type: "email" | "telegram"
  event: "order_created" | "order_status_changed"
  subject: string
  content: string
  isActive: boolean
  description?: string
}

interface NotificationTemplatePreviewDialogProps {
  template: NotificationTemplate
  isOpen: boolean
  onClose: () => void
}

const getSampleOrderData = () => ({
  order: {
    code: "ORD-001",
    state: "PaymentSettled",
    totalWithTax: 12550, // in cents
    total: 12550,
    currencyCode: "USD",
    createdAt: new Date("2024-01-15T14:30:00Z"),
    updatedAt: new Date("2024-01-15T15:45:00Z"),
    lines: [
      {
        id: "1",
        quantity: 2,
        productVariant: { id: "1", name: "Chocolate Cake", sku: "CAKE-CHOC" },
        linePriceWithTax: 9000,
        unitPriceWithTax: 4500,
      },
      {
        id: "2",
        quantity: 1,
        productVariant: {
          id: "2",
          name: "Vanilla Cupcakes (6-pack)",
          sku: "CUP-VAN-6",
        },
        linePriceWithTax: 1850,
        unitPriceWithTax: 1850,
      },
      {
        id: "3",
        quantity: 1,
        productVariant: { id: "3", name: "Birthday Candles", sku: "CANDLE-BD" },
        linePriceWithTax: 500,
        unitPriceWithTax: 500,
      },
    ],
    shippingAddress: {
      fullName: "John Doe",
      streetLine1: "123 Main St",
      streetLine2: "Apt 4B",
      city: "Anytown",
      province: "ST",
      postalCode: "12345",
      country: "USA",
      formatted: "John Doe, 123 Main St, Apt 4B, Anytown, ST 12345, USA",
    },
    billingAddress: {
      fullName: "John Doe",
      streetLine1: "123 Main St",
      streetLine2: "Apt 4B",
      city: "Anytown",
      province: "ST",
      postalCode: "12345",
      country: "USA",
      formatted: "John Doe, 123 Main St, Apt 4B, Anytown, ST 12345, USA",
    },
  },
  customer: {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    email: "john.doe@example.com",
  },
  previousState: "PaymentAuthorized",
  newState: "PaymentSettled",
})

const ORDER_QUERY = `
  query GetOrderForPreview($code: String!) {
    orders(options: { 
      filter: { code: { eq: $code } }
      take: 1 
    }) {
      items {
        id
        code
        state
        totalWithTax
        currencyCode
        createdAt
        updatedAt
        customer {
          id
          firstName
          lastName
          emailAddress
        }
        lines {
          id
          quantity
          linePriceWithTax
          unitPriceWithTax
          productVariant {
            id
            name
            sku
          }
        }
        shippingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          country
        }
        billingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          country
        }
      }
    }
  }
`

export function NotificationTemplatePreviewDialog({
  template,
  isOpen,
  onClose,
}: NotificationTemplatePreviewDialogProps) {
  const [previewContent, setPreviewContent] = useState("")
  const [previewSubject, setPreviewSubject] = useState("")
  const [orderCode, setOrderCode] = useState("")
  const [realOrderData, setRealOrderData] = useState<any>(null)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)
  const [orderError, setOrderError] = useState("")
  const [useRealData, setUseRealData] = useState(false)

  useEffect(() => {
    if (template) {
      updatePreview()
    }
  }, [template, useRealData, realOrderData])

  // Simple string replacement function
  const replaceTemplateVariables = (template: string, data: any) => {
    return template
      .replace(/\[ORDER_CODE\]/g, data.order?.code || 'N/A')
      .replace(/\[ORDER_TOTAL\]/g, data.order?.totalWithTax ? `$${(data.order.totalWithTax / 100).toFixed(2)}` : 'N/A')
      .replace(/\[ORDER_STATUS\]/g, data.order?.state || 'N/A')
      .replace(/\[CUSTOMER_NAME\]/g, data.customer?.fullName || 'N/A')
      .replace(/\[CUSTOMER_EMAIL\]/g, data.customer?.email || 'N/A')
      .replace(/\[ORDER_DATE\]/g, data.order?.createdAt ? new Date(data.order.createdAt).toLocaleDateString() : 'N/A')
      .replace(/\[ORDER_ITEMS\]/g, data.order?.lines ? data.order.lines.map((line: any) => `${line.quantity}x ${line.productVariant?.name || 'Unknown'}`).join(', ') : 'N/A')
      .replace(/\[SHIPPING_ADDRESS\]/g, data.order?.shippingAddress?.formatted || 'N/A')
      .replace(/\[BILLING_ADDRESS\]/g, data.order?.billingAddress?.formatted || 'N/A')
  }

  const fetchOrderData = async (code: string) => {
    if (!code.trim()) {
      setOrderError("Please enter an order code")
      return
    }

    setIsLoadingOrder(true)
    setOrderError("")

    try {
      const result: any = await api.query(ORDER_QUERY, { code: code.trim() })

      if (result.orders?.items?.length > 0) {
        const order = result.orders.items[0]
        // Transform the data to match our template structure
        const transformedData = {
          order: {
            code: order.code,
            state: order.state,
            totalWithTax: order.totalWithTax,
            total: order.totalWithTax,
            currencyCode: order.currencyCode,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
            lines:
              order.lines?.map((line: any) => ({
                id: line.id,
                quantity: line.quantity,
                productVariant: {
                  id: line.productVariant?.id,
                  name: line.productVariant?.name || "Unknown item",
                  sku: line.productVariant?.sku,
                },
                linePriceWithTax: line.linePriceWithTax,
                unitPriceWithTax: line.unitPriceWithTax,
              })) || [],
            shippingAddress: order.shippingAddress
              ? {
                  fullName: order.shippingAddress.fullName || "",
                  streetLine1: order.shippingAddress.streetLine1 || "",
                  streetLine2: order.shippingAddress.streetLine2 || "",
                  city: order.shippingAddress.city || "",
                  province: order.shippingAddress.province || "",
                  postalCode: order.shippingAddress.postalCode || "",
                  country: order.shippingAddress.country || "",
                  formatted: [
                    order.shippingAddress.fullName,
                    order.shippingAddress.streetLine1,
                    order.shippingAddress.streetLine2,
                    order.shippingAddress.city,
                    order.shippingAddress.province,
                    order.shippingAddress.postalCode,
                    order.shippingAddress.country,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }
              : null,
            billingAddress: order.billingAddress
              ? {
                  fullName: order.billingAddress.fullName || "",
                  streetLine1: order.billingAddress.streetLine1 || "",
                  streetLine2: order.billingAddress.streetLine2 || "",
                  city: order.billingAddress.city || "",
                  province: order.billingAddress.province || "",
                  postalCode: order.billingAddress.postalCode || "",
                  country: order.billingAddress.country || "",
                  formatted: [
                    order.billingAddress.fullName,
                    order.billingAddress.streetLine1,
                    order.billingAddress.streetLine2,
                    order.billingAddress.city,
                    order.billingAddress.province,
                    order.billingAddress.postalCode,
                    order.billingAddress.country,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }
              : null,
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
        }

        setRealOrderData(transformedData)
        setUseRealData(true)
        setOrderError("")
      } else {
        setOrderError(`Order with code "${code}" not found`)
        setRealOrderData(null)
        setUseRealData(false)
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      setOrderError(
        `Error fetching order: ${error instanceof Error ? error.message : "Unknown error"}`
      )
      setRealOrderData(null)
      setUseRealData(false)
    } finally {
      setIsLoadingOrder(false)
    }
  }

  const handleOrderCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrderData(orderCode)
  }

  const resetToSampleData = () => {
    setUseRealData(false)
    setRealOrderData(null)
    setOrderCode("")
    setOrderError("")
  }

  const updatePreview = () => {
    try {
      // Use real order data if available, otherwise use sample data
      let templateData
      if (useRealData && realOrderData) {
        templateData = realOrderData
      } else {
        templateData = getSampleOrderData()
      }

      // Process templates with simple string replacement
      const processedContent = replaceTemplateVariables(template.content, templateData)
      const processedSubject = replaceTemplateVariables(template.subject, templateData)

      setPreviewContent(processedContent)
      setPreviewSubject(processedSubject)
    } catch (error) {
      console.error("Error processing template:", error)
      setPreviewContent(
        `Template processing error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
      setPreviewSubject("Template Error")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              <Trans>
                Template Preview
              </Trans>
            </DialogTitle>
            <div className="flex gap-2">
              <Badge
                variant={template.type === "email" ? "secondary" : "default"}
              >
                {template.type === "email" ? "📧 Email" : "📱 Telegram"}
              </Badge>
              <Badge variant="outline">
                {template.event === "order_created"
                  ? "Order Created"
                  : "Status Changed"}
              </Badge>
              <Badge variant={template.isActive ? "success" : "secondary"}>
                {template.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Order Code Input Section - DEBUGGING: This should be visible */}
        <div
          className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mb-4"
          style={{ backgroundColor: "#eff6ff", borderColor: "#3b82f6" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-900">
              Preview with Real Order Data
            </h3>
            {useRealData && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToSampleData}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Use Sample Data
              </Button>
            )}
          </div>

          <form onSubmit={handleOrderCodeSubmit} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="orderCode" className="text-sm text-blue-700">
                Enter Order Code (e.g., ORD-001)
              </Label>
              <Input
                id="orderCode"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="ORD-001"
                className="mt-1 text-blue-700"
                disabled={isLoadingOrder}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button
                type="submit"
                disabled={isLoadingOrder || !orderCode.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoadingOrder ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {orderError && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {orderError}
            </div>
          )}

          {useRealData && realOrderData && (
            <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
              ✅ Using real data from order:{" "}
              <strong>{realOrderData.order.code}</strong>
              {realOrderData.customer.fullName && (
                <span> • Customer: {realOrderData.customer.fullName}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Template Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg">{template.name}</h3>
            {template.description && (
              <p className="text-gray-600 text-sm mt-1">
                {template.description}
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="border rounded-lg bg-white">
            {template.type === "email" ? (
              <div>
                {/* Email Header */}
                <div className="bg-gray-100 px-4 py-3 border-b rounded-t-lg">
                  <div className="text-sm text-gray-600 mb-2">
                    📧 Email Preview
                  </div>
                  <div className="bg-white p-3 rounded border mb-2">
                    <div className="text-sm text-gray-500 mb-1">
                      Subject Line:
                    </div>
                    <div className="font-medium text-lg text-gray-900">
                      {previewSubject || "(No subject)"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>
                      <strong>From:</strong> Cake Store
                      &lt;noreply@cakestore.com&gt;
                    </div>
                    <div>
                      <strong>To:</strong> {getSampleOrderData().customer.email}
                    </div>
                  </div>
                </div>

                {/* Email Content */}
                <div className="p-0">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>Email Preview</title>
                          <style>
                            body {
                              margin: 0;
                              padding: 20px;
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                              line-height: 1.6;
                              color: #333;
                              background-color: #ffffff;
                            }
                            /* Reset any inherited styles */
                            * {
                              box-sizing: border-box;
                            }
                            /* Ensure email content renders properly */
                            img {
                              max-width: 100%;
                              height: auto;
                            }
                            table {
                              border-collapse: collapse;
                              width: 100%;
                            }
                            td, th {
                              text-align: left;
                              padding: 8px;
                            }
                          </style>
                        </head>
                        <body>
                          ${previewContent}
                        </body>
                      </html>
                    `}
                    style={{
                      width: "100%",
                      minHeight: "400px",
                      border: "none",
                      backgroundColor: "#ffffff",
                    }}
                    title="Email Preview"
                  />
                </div>
              </div>
            ) : (
              <div>
                {/* Telegram Header */}
                <div className="bg-blue-100 px-4 py-3 border-b rounded-t-lg">
                  <div className="text-sm text-blue-700 mb-2">
                    📱 Telegram Message Preview
                  </div>
                  <div className="bg-white p-3 rounded border mb-2">
                    <div className="text-sm text-gray-500 mb-1">
                      Message Title:
                    </div>
                    <div className="font-medium text-base text-blue-900">
                      {previewSubject || "(No title)"}
                    </div>
                  </div>
                </div>

                {/* Telegram Content */}
                <div className="p-6 bg-gradient-to-b from-blue-50 to-white">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200 max-w-md">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: previewContent
                          .replace(/\n/g, "<br>")
                          .replace(/<b>/g, "<strong>")
                          .replace(/<\/b>/g, "</strong>")
                          .replace(
                            /🛍️|📋|👤|💰|📅|📦|📍|🆔|🔄/g,
                            '<span class="text-lg">$&</span>'
                          ),
                      }}
                      className="whitespace-pre-wrap text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Source Notice */}
          <div
            className={`border rounded-lg p-4 ${
              useRealData && realOrderData
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            {useRealData && realOrderData ? (
              <div>
                <div className="text-sm text-green-800">
                  <strong>✅ Real Order Data:</strong> This preview shows how
                  the template will look with actual order data.
                </div>
                <div className="text-xs text-green-700 mt-2">
                  Order: {realOrderData.order.code} • Customer:{" "}
                  {realOrderData.customer.fullName} • Total: $
                  {(realOrderData.order.totalWithTax / 100).toFixed(2)}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-yellow-800">
                  <strong>📋 Sample Data:</strong> This preview uses sample
                  data. Enter an order code above to test with real data.
                </div>
                <div className="text-xs text-yellow-700 mt-2">
                  Sample Order: {getSampleOrderData().order.code} • Customer:{" "}
                  {getSampleOrderData().customer.fullName} • Total: $
                  {(getSampleOrderData().order.totalWithTax / 100).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            <Trans>Close</Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
