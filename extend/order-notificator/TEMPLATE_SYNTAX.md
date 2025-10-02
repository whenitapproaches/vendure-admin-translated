# Notification Template Syntax

This document describes the syntax for customizing email and Telegram notification templates in the Order Notificator plugin.

## Template Variables

Templates support dynamic placeholders that are replaced with actual order data when notifications are sent. All variables use the double curly brace syntax: `{{variable.name}}`

### Order Information
- `{{order.code}}` - Order code (e.g., "ORD-001")
- `{{order.total}}` - Order total with currency formatting (e.g., "$125.50")
- `{{order.state}}` - Current order state (e.g., "PaymentSettled")
- `{{order.createdAt}}` - Order creation date (formatted as "January 15, 2024 at 2:30 PM")

### Customer Information
- `{{customer.firstName}}` - Customer's first name
- `{{customer.lastName}}` - Customer's last name
- `{{customer.email}}` - Customer's email address

### Order Details
- `{{order.items}}` - Formatted list of order items with quantities and prices
- `{{order.shippingAddress}}` - Complete shipping address (formatted)
- `{{order.billingAddress}}` - Complete billing address (formatted)

### Additional Variables (for status change events)
- `{{previousState}}` - Previous order state
- `{{newState}}` - New order state

## Email Templates

Email templates support full HTML markup for rich formatting.

### Example Email Template:
```html
<h2>Thank you for your order!</h2>
<p>Dear {{customer.firstName}} {{customer.lastName}},</p>
<p>We have received your order <strong>{{order.code}}</strong> placed on {{order.createdAt}}.</p>

<h3>Order Details:</h3>
<p><strong>Total:</strong> {{order.total}}</p>
<p><strong>Status:</strong> {{order.state}}</p>

<h3>Items Ordered:</h3>
<pre>{{order.items}}</pre>

<h3>Shipping Address:</h3>
<p>{{order.shippingAddress}}</p>

<p>Thank you for your business!</p>
```

### Email Best Practices:
- Use semantic HTML tags (`<h1>`, `<h2>`, `<p>`, etc.)
- Include inline CSS for better email client compatibility
- Keep the layout simple and responsive
- Test with different email clients

## Telegram Templates

Telegram templates support HTML formatting tags and emoji for enhanced messaging.

### Supported HTML Tags:
- `<b>text</b>` or `<strong>text</strong>` - Bold text
- `<i>text</i>` or `<em>text</em>` - Italic text
- `<u>text</u>` - Underlined text
- `<s>text</s>` or `<strike>text</strike>` - Strikethrough text
- `<code>text</code>` - Monospace text
- `<pre>text</pre>` - Preformatted text

### Example Telegram Template:
```
🛍️ <b>New Order Received!</b>

📋 <b>Order:</b> {{order.code}}
👤 <b>Customer:</b> {{customer.firstName}} {{customer.lastName}}
💰 <b>Total:</b> {{order.total}}
📅 <b>Date:</b> {{order.createdAt}}

📦 <b>Items:</b>
{{order.items}}

📍 <b>Shipping to:</b>
{{order.shippingAddress}}
```

### Telegram Best Practices:
- Use emoji to make messages more visually appealing
- Keep messages concise but informative
- Use HTML formatting for emphasis
- Break up long text with line breaks and sections

## Template Types and Events

### Template Types:
- **Email** - Rich HTML email notifications
- **Telegram** - Formatted text messages with emoji support

### Notification Events:
- **Order Created** - Triggered when a new order is placed
- **Order Status Changed** - Triggered when an order's status is updated

## Variable Processing

Variables are processed in the following order:
1. Order data is extracted from the Order entity
2. Customer information is retrieved from the associated Customer
3. Additional context data (like previous/new states) is included
4. All placeholders are replaced with formatted values
5. The final message is sent to the notification service

## Error Handling

- If a variable is not found, it will be replaced with an empty string
- Invalid HTML in email templates will be sent as-is (may cause rendering issues)
- Telegram messages with invalid HTML tags may not format correctly
- Missing templates will fall back to default formatting

## Default Templates

The plugin includes default templates for all combinations of types and events:
- Default Email Order Created
- Default Email Order Status Changed  
- Default Telegram Order Created
- Default Telegram Order Status Changed

You can initialize these defaults through the dashboard or customize them as needed.

## Testing Templates

Use the preview functionality in the dashboard to test your templates with sample data before activating them. The preview shows how your template will look with realistic order information.
