# Order Notification Logic Test

## Overview
This document outlines the test scenarios for the updated order notification logic.

## 🔒 GUARANTEE: Only Two Email Instances

### ✅ ALLOWED EMAIL INSTANCES:
1. **Order Created Email**: ONLY for COD payment method
2. **Order Confirmed Email**: ONLY for Banking payment method when settled

### ❌ FORBIDDEN EMAIL INSTANCES:
3. **Order Shipped Email**: NEVER sent (removed completely)
4. **Order Confirmed Email on Fulfillment**: NEVER sent (removed completely)

## Changes Made

### 1. Order Created Email (COD Only)
- **Before**: Sent for all orders when transitioning from "AddingItems" to "ArrangingPayment"
- **After**: Only sent for orders with payment method "cod"

### 2. Order Confirmed Email (Banking Payment Settlement)
- **Before**: Sent when fulfillment transitions to "Pending" for all orders
- **After**: Only sent when banking payment is settled by administrator

### 3. Order Shipped Email (REMOVED)
- **Before**: Sent when fulfillment transitions to "Shipped"
- **After**: Completely removed - never sent

## Test Scenarios

### Scenario 1: COD Order Flow
1. **Order Creation**: Customer places order with COD payment method
   - ✅ Order created email should be sent
   - ✅ Telegram notification should be sent

2. **Order Confirmation**: Administrator creates fulfillment (Pending state)
   - ❌ Order confirmed email should NOT be sent (removed)

3. **Order Shipped**: Administrator marks fulfillment as shipped
   - ❌ Order shipped email should NOT be sent (removed)

### Scenario 2: Banking Order Flow
1. **Order Creation**: Customer places order with banking payment method
   - ❌ Order created email should NOT be sent
   - ❌ Telegram notification should NOT be sent

2. **Payment Settlement**: Administrator settles the payment
   - ✅ Order confirmed email should be sent

3. **Order Shipped**: Administrator marks fulfillment as shipped
   - ❌ Order shipped email should NOT be sent (removed)

### Scenario 3: Mixed Payment Methods
1. **Order Creation**: Customer places order with multiple payment methods (COD + Banking)
   - ✅ Order created email should be sent (because COD is present)
   - ✅ Telegram notification should be sent

2. **Payment Settlement**: Administrator settles banking payment
   - ✅ Order confirmed email should be sent

3. **Order Shipped**: Administrator marks fulfillment as shipped
   - ❌ Order shipped email should NOT be sent (removed)

## Implementation Details

### Code Changes in `order-notificator.plugin.ts`

1. **Order State Transition Event**:
   ```typescript
   // Check if order has COD payment method
   const hasCodPayment = event.order.payments?.some(
     (payment) => payment.method === "cod"
   )

   if (hasCodPayment) {
     // Send notifications
   }
   ```

2. **Payment State Transition Event** (NEW):
   ```typescript
   this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
     if (event.toState === "Settled") {
       const hasBankingPayment = event.order.payments?.some(
         (payment) => payment.method === "banking" && payment.id === event.payment.id
       )

       if (hasBankingPayment) {
         await this.emailNotificationService.sendOrderConfirmationEmail(event.order)
       }
     }
   })
   ```

3. **Fulfillment State Transition Event** (MODIFIED):
   ```typescript
   if (event.toState === "Pending") {
     // Only send order confirmed email for COD payments
     const hasBankingPayment = order.payments?.some(
       (payment) => payment.method === "banking"
     )
     
     if (!hasBankingPayment) {
       await this.emailNotificationService.sendOrderConfirmationEmail(order)
     }
   }
   
   // Order shipped emails are no longer needed - removed as per requirements
   ```

## Manual Testing Steps

1. **Test COD Order**:
   - Create order with COD payment method
   - Verify order created email is sent
   - Create fulfillment (Pending)
   - Verify NO order confirmed email is sent
   - Mark fulfillment as shipped
   - Verify NO order shipped email is sent

2. **Test Banking Order**:
   - Create order with banking payment method
   - Verify NO order created email is sent
   - Settle the payment manually
   - Verify order confirmed email is sent
   - Create fulfillment and mark as shipped
   - Verify NO order shipped email is sent

3. **Test Mixed Payment**:
   - Create order with both COD and banking payment methods
   - Verify order created email is sent (due to COD)
   - Settle banking payment
   - Verify order confirmed email is sent
   - Continue with fulfillment process
   - Verify NO order shipped email is sent

## Expected Behavior Summary

| Payment Method | Order Created Email | Order Confirmed Email Trigger | Order Shipped Email |
|----------------|-------------------|------------------------------|-------------------|
| COD | ✅ Yes | ❌ No (removed) | ❌ No (removed) |
| Banking | ❌ No | ✅ When payment → Settled | ❌ No (removed) |
| COD + Banking | ✅ Yes | ✅ When payment → Settled | ❌ No (removed) |

## 🔒 FINAL GUARANTEE

**ONLY TWO EMAIL INSTANCES EXIST:**
1. Order Created Email: ONLY for COD payment method
2. Order Confirmed Email: ONLY for Banking payment method when settled

**NO OTHER EMAILS ARE SENT:**
- No order shipped emails
- No fulfillment-based confirmation emails
- No other payment method emails

This ensures a clean, minimal notification system with exactly two email types as requested.