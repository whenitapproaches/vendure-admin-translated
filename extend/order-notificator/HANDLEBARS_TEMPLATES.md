# Handlebars Email Templates

The notification system now uses **Handlebars** template engine for powerful, flexible email and Telegram message templates.

## Features

- **Variables**: Access order, customer, and additional data
- **Helpers**: Built-in formatting functions
- **Conditionals**: Show/hide content based on conditions
- **Loops**: Iterate over order items and other arrays
- **HTML Support**: Full HTML email templates with CSS

## Available Data

### Order Object
```handlebars
{{order.code}}              <!-- Order number (e.g., "ORD-001") -->
{{order.state}}             <!-- Order status (e.g., "PaymentSettled") -->
{{order.totalWithTax}}      <!-- Total amount in cents -->
{{order.currencyCode}}      <!-- Currency code (e.g., "USD") -->
{{order.createdAt}}         <!-- Order creation date -->
{{order.updatedAt}}         <!-- Last update date -->
```

### Customer Object
```handlebars
{{customer.firstName}}      <!-- Customer first name -->
{{customer.lastName}}       <!-- Customer last name -->
{{customer.fullName}}       <!-- Full name (first + last) -->
{{customer.email}}          <!-- Customer email -->
```

### Order Lines (Items)
```handlebars
{{#each order.lines}}
  {{quantity}}x {{productVariant.name}} - {{currency linePriceWithTax ../order.currencyCode}}
{{/each}}
```

### Addresses
```handlebars
{{#if order.shippingAddress}}
  {{#with order.shippingAddress}}
    {{fullName}}<br>
    {{streetLine1}}<br>
    {{#if streetLine2}}{{streetLine2}}<br>{{/if}}
    {{city}}, {{province}} {{postalCode}}<br>
    {{country}}
  {{/with}}
{{/if}}
```

## Built-in Helpers

### Currency Formatting
```handlebars
{{currency order.totalWithTax order.currencyCode}}
<!-- Output: $125.50 -->
```

### Date Formatting
```handlebars
{{formatDate order.createdAt}}
<!-- Output: January 15, 2024 at 2:30 PM -->

{{formatDate order.createdAt "short"}}
<!-- Output: 1/15/2024 -->
```

### Status Formatting
```handlebars
{{formatStatus order.state}}
<!-- Converts "PaymentSettled" to "Payment Settled" -->
```

### Conditionals
```handlebars
{{#ifEquals order.state "Shipped"}}
  <p>🚚 Your order is on its way!</p>
{{/ifEquals}}

{{#ifEquals order.state "Delivered"}}
  <p>🎉 Order delivered!</p>
{{/ifEquals}}
```

## Template Examples

### Email Order Confirmation
```handlebars
<h1>Thank you for your order, {{customer.fullName}}!</h1>
<p>Order #{{order.code}} placed on {{formatDate order.createdAt}}</p>
<p>Total: {{currency order.totalWithTax order.currencyCode}}</p>

<h2>Items:</h2>
<ul>
{{#each order.lines}}
  <li>{{quantity}}x {{productVariant.name}} - {{currency linePriceWithTax ../order.currencyCode}}</li>
{{/each}}
</ul>

{{#if order.shippingAddress}}
<h2>Shipping Address:</h2>
<p>{{order.shippingAddress.formatted}}</p>
{{/if}}
```

### Telegram Message
```handlebars
🛍️ <b>New Order!</b>

📋 Order: {{order.code}}
👤 Customer: {{customer.fullName}}
💰 Total: {{currency order.totalWithTax order.currencyCode}}

📦 Items:
{{#each order.lines}}
• {{quantity}}x {{productVariant.name}}
{{/each}}

{{#ifEquals order.state "Shipped"}}
🚚 Status: Order shipped!
{{/ifEquals}}
```

### Order Status Update
```handlebars
<h1>Order Status Update</h1>
<p>Dear {{customer.fullName}},</p>
<p>Your order {{order.code}} status: {{formatStatus order.state}}</p>

{{#ifEquals order.state "Shipped"}}
<div style="background: #d4edda; padding: 15px; border-radius: 8px;">
  <h3>🚚 Your order is on its way!</h3>
  <p>Expected delivery: 2-5 business days</p>
</div>
{{/ifEquals}}

{{#ifEquals order.state "Delivered"}}
<div style="background: #d1ecf1; padding: 15px; border-radius: 8px;">
  <h3>🎉 Order Delivered!</h3>
  <p>Thank you for your purchase!</p>
</div>
{{/ifEquals}}
```

## Best Practices

1. **Use HTML Structure**: Include proper DOCTYPE, head, and body tags for emails
2. **Inline CSS**: Email clients prefer inline styles
3. **Test Templates**: Use the preview feature to test your templates
4. **Handle Missing Data**: Use `{{#if}}` to check for optional data
5. **Format Currency**: Always use the `{{currency}}` helper for money amounts
6. **Format Dates**: Use `{{formatDate}}` for consistent date formatting

## Migration from Old Templates

Old syntax `{{order.total}}` becomes `{{currency order.totalWithTax order.currencyCode}}`
Old syntax `{{customer.firstName}} {{customer.lastName}}` becomes `{{customer.fullName}}`
Old syntax `{{order.items}}` becomes a loop:
```handlebars
{{#each order.lines}}
{{quantity}}x {{productVariant.name}} - {{currency linePriceWithTax ../order.currencyCode}}
{{/each}}
```

The new system provides much more flexibility and power for creating professional email templates!
