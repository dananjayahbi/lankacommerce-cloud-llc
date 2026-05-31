# Receipt Distribution & Channels Feature Specification

## Executive Summary

Receipt Distribution & Channels providing multi-channel receipt delivery (email, SMS, WhatsApp) with delivery tracking, channel preferences, and distribution history enabling customers to receive receipts through their preferred communication channels.

## Current State Analysis

### EXISTING IMPLEMENTATION

- WhatsApp receipt delivery (send_whatsapp_receipt_message function, SendReceiptView)
- WhatsAppReceiptPayload formatting (store_name, sale_reference, items_summary, total_amount)
- ReceiptPreviewDialog with WhatsApp UI (phone input, sending state)
- Email service (backend/apps/billing/services/email_service.py with send_email method)
- Notification infrastructure (backend/apps/notifications/models.py)
- Customer data (email, phone) linked to sales

### MISSING / INCOMPLETE IMPLEMENTATION

- Email receipt delivery for sales (only WhatsApp exists)
- SMS receipt delivery
- Multi-channel receipt delivery settings/preferences
- Receipt delivery channel UI selection
- Email receipt template (HTML email format)
- SMS receipt truncation/summary format
- Delivery tracking (status: pending, sent, delivered, failed)
- Delivery retry mechanism
- Receipt delivery history/logs
- Bulk receipt sending
- Scheduled receipt sending
- Delivery channel configuration (API keys, rates)
- Unsubscribe/opt-out management
- Delivery status notifications
- Failed delivery alerts
- Receipt delivery analytics
- Customer channel preferences storage
- Default delivery channel per customer
- Multi-recipient delivery (multiple emails/phones)
- Delivery confirmation via webhook (for email)
- Bounce/complaint handling
- Compliance/Privacy notices in emails

## Frontend Features

### Receipt Preview Dialog (Enhanced for Multi-Channel)

**Receipt display** (as before):
  - Complete receipt layout
  - All transaction details

**Send Receipt section** (tabs or buttons):

**Print button** (existing)

**Preview button** (existing)

**Email Receipt tab**:
  - Recipient email field (auto-populated from customer):
    - If no customer linked: "No customer linked - receipt cannot be emailed"
  - Subject line preview (e.g., "Your Receipt from [Store Name] - [Sale Date]")
  - Message body preview (customizable)
  - Send button
  - Success message: "Email sent to customer@example.com"
  - Error message with retry option
  - Loading state

**SMS Receipt tab**:
  - Recipient phone field (auto-populated from customer):
    - Phone number validation/formatting
  - SMS preview text (truncated summary):
    - Shows how SMS will appear (character count)
    - "1 SMS (160 chars)" or "3 SMS (480 chars)"
  - Send button
  - Success message: "SMS sent to +94XXXXXXXXX"
  - Error message with retry option
  - Loading state

**WhatsApp Receipt tab** (existing, enhanced):
  - Phone number field
  - Message preview with store name, sale reference, items, total
  - Send button
  - Success/error messages
  - Resend button (if already sent)

### Customer Delivery Preferences

**Customer profile preferences section**:
  - Preferred receipt channel selector (Email, SMS, WhatsApp, Print):
    - Radio buttons or dropdown
    - "Ask each time" option
    - Save preferences button
  
  - Opt-out checkboxes:
    - Opt out of email receipts
    - Opt out of SMS receipts
    - Opt out of WhatsApp receipts
  
  - Contact information:
    - Primary email
    - Secondary email
    - Primary phone
    - Secondary phone
    - Preference for which phone (mobile, home) for SMS

### Settings - Delivery Configuration Tab

#### Email Configuration Section

- Email service status (connected/not configured)
- From email address (system default display)
- From name (customizable)
- **Email template editor**:
  - Subject line template
  - HTML email body template
  - Template variables reference (STORE_NAME, SALE_ID, TOTAL_AMOUNT, etc.)
  - Preview email button
- Enable/disable email receipts toggle
- Bounce/complaint handling settings

#### SMS Configuration Section

- SMS service status (connected/not configured)
- SMS provider selector/display
- **SMS summary format selector**:
  - Short: "Receipt #[ID] - Rs. [TOTAL] - Thank you!"
  - Medium: "[STORE] Receipt #[ID]\n[ITEMS]\nTotal: Rs. [TOTAL]"
  - Full: (shows detailed breakdown if space allows)
- Enable/disable SMS receipts toggle
- SMS character limit indicator

#### WhatsApp Configuration Section (Enhanced)

- WhatsApp Business API status (connected/not configured)
- **Template message format**:
  - Variable mapping (store_name, sale_reference, items_summary, total_amount)
  - Preview message
- Enable/disable WhatsApp receipts toggle
- Message retry settings

#### Delivery Logs Section

**Recent delivery attempts table**:
  - Date/time
  - Sale ID
  - Customer (email/phone)
  - Channel (Email/SMS/WhatsApp)
  - Status (Pending, Sent, Delivered, Failed)
  - Attempts count
  - Last error message (if failed)
  - Actions: Retry, View details

**Filtering and management**:
  - Filter by channel
  - Filter by status
  - Filter by date range
  - Export delivery logs

#### Delivery Statistics Section

**Charts/metrics**:
  - Receipts delivered today/week/month
  - Delivery rate by channel (%)
  - Failed delivery rate (%)
  - Average delivery time

**Channel breakdown**:
  - Email: X receipts sent, Y% success rate
  - SMS: X receipts sent, Y% success rate
  - WhatsApp: X receipts sent, Y% success rate
  - Print: X receipts printed

### Delivery Failure Notifications

**Alert if delivery fails**:
  - "Failed to send receipt via email"
  - Show reason (invalid email, service unavailable, etc.)
  - Retry button
  - Alternative channels suggestion ("Try sending via SMS")

**Manual retry UI**:
  - In receipt history page
  - Retry button on failed delivery
  - Option to select different channel

### Bulk Receipt Delivery

**Send receipts to multiple customers**:
  - Customer list with checkboxes
  - Select delivery channel
  - Preview message
  - Send all button
  - Progress indicator
  - Completion summary

### Scheduled Delivery

**Schedule receipt sending**:
  - Date/time picker
  - Select delivery channel
  - Schedule button
  - Scheduled deliveries list (pending)
  - Cancel scheduled delivery option

## Backend API Requirements

### Receipt Delivery Endpoints

- **POST /api/receipts/{id}/send-email/**
  - Send receipt via email
  - Request body: `{ recipient_email }`
  - Response: `{ success, delivery_id, status }`

- **POST /api/receipts/{id}/send-sms/**
  - Send receipt via SMS
  - Request body: `{ recipient_phone }`
  - Response: `{ success, delivery_id, status }`

- **POST /api/receipts/{id}/send-whatsapp/**
  - Send receipt via WhatsApp
  - Request body: `{ recipient_phone }`
  - Response: `{ success, delivery_id, status }`

### Delivery History & Tracking Endpoints

- **GET /api/receipts/delivery-history/**
  - Get delivery history
  - Query params: date_range, channel, status, limit, offset
  - Response: `[{ id, sale_id, channel, recipient, status, sent_at, delivered_at }]`

- **PATCH /api/receipts/delivery/{id}/retry/**
  - Retry failed delivery
  - Response: `{ success, new_delivery_id }`

- **GET /api/receipts/delivery-stats/**
  - Get delivery statistics
  - Response: `{ total_sent, by_channel: {...}, success_rate, avg_delivery_time }`

### Customer Preference Endpoints

- **GET /api/customers/{id}/preferences/**
  - Get customer delivery preferences
  - Response: `{ preferred_channel, opt_outs: [...], contact_info: {...} }`

- **PATCH /api/customers/{id}/preferences/**
  - Update delivery preferences
  - Request body: `{ preferred_channel, opt_outs, contact_info }`
  - Response: updated preferences

### Template Configuration Endpoints

- **PATCH /api/receipts/config/email-template/**
  - Update email template
  - Request body: `{ subject, body_html }`
  - Response: updated template

- **PATCH /api/receipts/config/sms-format/**
  - Update SMS format
  - Request body: `{ format_type }`
  - Response: updated format

## Database Requirements

### Models

- **DeliveryLog**
  - sale_id
  - customer_id
  - channel
  - recipient
  - status
  - sent_at
  - delivered_at
  - attempts
  - last_error
  - delivery_method

- **DeliveryPreference**
  - customer_id
  - preferred_channel
  - opt_out_email
  - opt_out_sms
  - opt_out_whatsapp
  - created_at
  - updated_at

- **EmailTemplate**
  - tenant_id
  - subject
  - body_html
  - created_at
  - updated_at

- **ScheduledDelivery**
  - sale_id
  - customer_id
  - channel
  - scheduled_time
  - status
  - created_at

### Database Indexes

- `(sale_id)`
- `(customer_id, channel)`
- `(status, created_at DESC)`
- `(scheduled_time)`

## Current Implementation Status

- WhatsApp receipt delivery EXISTS (send_whatsapp_receipt_message)
- Email service EXISTS (general, not receipt-specific)
- Email receipt delivery NOT implemented (for sales)
- SMS receipt delivery NOT implemented
- Delivery tracking NOT implemented
- Delivery retry mechanism NOT implemented
- Delivery history NOT implemented
- Customer delivery preferences NOT implemented
- Email receipt template NOT implemented
- SMS receipt template NOT implemented
- Delivery configuration UI NOT implemented
- Bulk delivery NOT implemented
- Scheduled delivery NOT implemented
- Delivery statistics NOT implemented
- Delivery logs NOT implemented

## Validation & Edge Cases

- Email must be valid email format
- Phone must be valid format for SMS/WhatsApp
- Delivery channel must respect customer opt-out preferences
- Failed deliveries must be retried (configurable retry count)
- Bulk delivery must handle partial failures
- SMS character limits must be enforced
- Email delivery must handle bounce/complaint (ISP feedback)
- WhatsApp delivery must respect rate limits
- Scheduled delivery must execute at correct time
- Delivery status must be tracked accurately
- Customer opt-out must be respected across all channels
- Email unsubscribe link must be included (legal requirement)

## Testing Checklist

- [ ] Email receipt sends successfully
- [ ] SMS receipt sends successfully
- [ ] WhatsApp receipt sends successfully
- [ ] Invalid email rejected
- [ ] Invalid phone rejected
- [ ] Delivery status tracked correctly
- [ ] Failed delivery logged
- [ ] Retry mechanism works
- [ ] Customer preferences respected
- [ ] Opt-out respected
- [ ] Email template renders correctly
- [ ] SMS text displays within char limit
- [ ] Bulk delivery works
- [ ] Scheduled delivery executes
- [ ] Delivery logs are complete
- [ ] Delivery statistics accurate
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components

- [ ] Receipt send dialog (enhanced)
- [ ] Email send component
- [ ] SMS send component
- [ ] WhatsApp send component (enhanced)
- [ ] Customer preferences component
- [ ] Delivery configuration page
- [ ] Email template editor component
- [ ] SMS format selector component
- [ ] Delivery history component
- [ ] Delivery statistics component
- [ ] Bulk delivery component
- [ ] Scheduled delivery component
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Error handling
- [ ] Loading states

### Backend Implementation

- [ ] Backend email receipt API endpoints
- [ ] Backend SMS receipt API endpoints
- [ ] Backend WhatsApp API (enhanced)
- [ ] Email delivery service
- [ ] SMS delivery service
- [ ] Delivery tracking service
- [ ] Delivery retry service
- [ ] Email template service
- [ ] Customer preference service
- [ ] Audit logging

## Deployment Strategy

- Configure email service (SMTP/SendGrid/AWS SES)
- Configure SMS service (Twilio/AWS SNS)
- Configure WhatsApp Business API
- Deploy receipt delivery API endpoints
- Deploy frontend receipt distribution pages
- Testing: Send receipts via all channels
- Staff training: Receipt delivery setup
- Rollback: Maintain delivery logs

## Performance Targets

- Email send: <2s
- SMS send: <2s
- WhatsApp send: <2s
- Delivery tracking: <500ms
- Bulk delivery (100 recipients): <30s

## Monitoring & Alerting

- Track delivery success/failure rates by channel
- Alert on high failure rates
- Monitor email bounce/complaint rates
- Monitor SMS rejection rates
- Alert on service unavailability
- Track delivery cost (if applicable)

## Documentation Requirements

- Email receipt setup guide
- SMS receipt setup guide
- WhatsApp Business API setup
- Customer delivery preferences guide
- Delivery troubleshooting guide
- Delivery analytics guide

## Future Enhancements

- Push notifications for app users
- Telegram receipt delivery
- WeChat receipt delivery (for international)
- In-app receipt delivery/archival
- Receipt signing/digital signature
- Blockchain receipt verification
- AI-powered delivery optimization
- Predictable delivery failures (before they happen)
- Receipt categorization for tax/expense tracking
- Receipt OCR for expense reporting
