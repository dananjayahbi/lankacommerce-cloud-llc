# 117: PAYMENT WEBHOOK MONITORING & CONFIGURATION FEATURE

**Executive Summary:** Payment Webhook Monitoring & Configuration providing webhook management, event logging, and failure retry ensuring reliable payment confirmation processing and webhook health monitoring.

---

## Current State Analysis

### EXISTING:
- PayHere webhook handling (PayHereWebhookView class)
- Stripe webhook handling (stripe_webhook_view.py)
- Webhook infrastructure (backend/apps/webhooks/)
- Event logging for payment events (InvoicePaymentEvent model)
- Webhook secret generation (secret_generator.py)
- Webhook dispatch service (dispatch_service.py)
- Raw payload capture and audit trail
- MD5 signature validation (for PayHere)

### MISSING (Partially implemented or incomplete):
- Webhook configuration UI (tenant admin)
- Webhook URL display/copy for setup
- Webhook test button (send test payload)
- Webhook event logs display (comprehensive history)
- Failed webhook retry mechanism UI
- Webhook secret regeneration UI
- Webhook event filtering/search
- Webhook delivery status tracking
- Webhook retry count display
- Webhook error message display
- Manual webhook retry UI
- Webhook event payload viewer
- Webhook authentication status indicator
- Webhook event statistics/analytics
- Webhook throttling/rate limit configuration
- Dead letter queue for failed webhooks
- Webhook signature validation UI testing
- Webhook certificate management (for HTTPS)
- Webhook delivery latency tracking
- Multiple webhook endpoints (advanced)
- Conditional webhook routing (by event type)

---

## Frontend Features

### Settings - Webhook Configuration Tab (Enhancement)

#### Payment Webhooks Section

##### PayHere Webhook Configuration
- Status indicator (green = connected, red = error)
- **Webhook URL display:**
  - Shows the tenant-specific webhook URL
  - Copy to clipboard button
- **Webhook Secret:**
  - Display (masked, like: ****...123abc)
  - Regenerate secret button (with confirmation)
  - Copy secret button
- Test webhook button:
  - Sends test payment notification
  - Shows result (success/failure)
- Last webhook received (timestamp)
- Connection status message

##### Stripe Webhook Configuration
- Status indicator
- Webhook URL display
- Webhook Secret display (masked)
- Regenerate secret button
- Test webhook button
- Last webhook received (timestamp)
- Events subscribed to (list of Stripe events)

#### Webhook Events History
- **Table with columns:** Date/Time, Event Type, Status, Details
- **Filter options:**
  - By event type (payment.authorized, payment.captured, payment.failed, refund.processed, etc.)
  - By status (received, processed, failed, retried)
  - By date range
- **Search:** by event ID or transaction ID
- **Pagination**
- **Each row shows:**
  - Event type with icon
  - Timestamp
  - Status (green checkmark, red X, yellow warning)
  - Brief details (transaction ID, amount, etc.)
  - Actions: View details, Retry, Export

#### Webhook Event Details (Modal)
- Event ID
- Event type
- Received timestamp
- Processed timestamp
- Processing status (success/failed)
- **Payload viewer:**
  - JSON formatted payload (syntax highlighted)
  - Copy JSON button
  - Download JSON button
- **Processing result:**
  - Status message
  - Error message (if failed)
  - Invoice updated (if applicable)
- **Retry history:**
  - If retried multiple times, show all attempts
  - Timestamp of each attempt
  - Status of each attempt
- **Manual actions:**
  - Retry button (if failed)
  - Mark as processed (if stuck)
  - Ignore/discard button (if spam)

#### Webhook Statistics
- **Last 24 hours:**
  - Total events: X
  - Successful: X (%)
  - Failed: X (%)
  - Processing time: avg X ms
- **Last 7 days:**
  - Total events: X
  - Success rate: X%
- **Health status indicator:**
  - Green: All webhooks processed successfully
  - Yellow: Some failures but retrying
  - Red: Critical webhook failures
- Status message with recommendations

#### Webhook Delivery Logs
- **Detailed log table:**
  - Event ID, Type, Received, Status, Delivery Status, Retries
  - Filter by status (delivered, failed, retrying)
  - Filter by delivery status (acknowledged, not acknowledged)
  - Export logs button
  - Each row has View details button

#### Failed Webhook Queue
- **Failed webhooks list (if any):**
  - Event ID, Type, Reason, Retries attempted
  - Retry button (for each)
  - Retry all button
  - Dismiss button
  - Auto-retry status (enabled/disabled toggle)
- **Auto-retry configuration:**
  - Retry interval (seconds)
  - Max retry attempts
  - Save button

---

## Backend API Requirements

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/payment/` | GET | Get payment webhook configuration - Response: { payhere_url, stripe_url, last_received, status } |
| `/api/webhooks/payment/test/` | POST | Send test webhook - Request: { gateway } |
| `/api/webhooks/payment/regenerate-secret/` | POST | Regenerate webhook secret - Request: { gateway } |
| `/api/webhooks/payment/events/` | GET | Get webhook events log - Query params: type, status, date_range, limit, offset |
| `/api/webhooks/payment/events/{id}/` | GET | Get event details - Response: complete event with payload and audit trail |
| `/api/webhooks/payment/events/{id}/retry/` | POST | Retry failed webhook - Response: { success, result } |
| `/api/webhooks/payment/events/batch-retry/` | POST | Retry multiple failed webhooks - Request: { event_ids } |
| `/api/webhooks/payment/stats/` | GET | Get webhook statistics - Response: { total, successful, failed, success_rate, avg_processing_time } |
| `/api/webhooks/payment/auto-retry/` | PATCH | Configure auto-retry - Request: { enabled, retry_interval, max_attempts } |

---

## Database Requirements

### Models
- **WebhookEvent:** tenant_id, gateway, event_id, event_type, payload (JSON), received_at, processed_at, status, processing_result (JSON), retry_count
- **WebhookRetry:** event_id, retry_number, attempted_at, status, error_message
- **WebhookConfiguration:** tenant_id, gateway, secret (encrypted), last_received, status, auto_retry_enabled

### Indexes
- (tenant_id, event_type)
- (status, received_at DESC)
- (retry_count)

---

## Current Implementation Status

| Component | Status |
|-----------|--------|
| PayHere webhook handling | EXISTS |
| Stripe webhook handling | EXISTS |
| Webhook event logging | EXISTS |
| Webhook configuration storage | EXISTS |
| Test webhook button in UI | NOT exposed |
| Webhook events display in UI | NOT exposed |
| Webhook retry UI | NOT implemented |
| Secret regeneration UI | NOT implemented |
| Webhook statistics display | NOT displayed |
| Auto-retry configuration UI | NOT exposed |

---

## Validation & Edge Cases

- Webhook secret must be secure and unique
- Webhook signature must be validated before processing
- Failed webhooks must be retried with backoff
- Duplicate events must be handled idempotently
- Webhook processing must be atomic (all or nothing)
- Webhook events must not be lost
- Webhook delivery latency must be acceptable
- Secret regeneration should not interrupt webhook delivery
- Webhook payloads must be immutable for audit

---

## Testing Checklist

- [ ] Webhook URL displays correctly
- [ ] Test webhook sends successfully
- [ ] Webhook secret regenerates
- [ ] Webhook events log displays
- [ ] Event details display
- [ ] Failed webhook retries
- [ ] Batch retry works
- [ ] Webhook statistics display
- [ ] Auto-retry configuration works
- [ ] Webhook payload viewer displays
- [ ] Event export works
- [ ] Responsive design works

---

## Implementation Checklist

- [ ] Webhook configuration section component
- [ ] Webhook event log component
- [ ] Event details modal component
- [ ] Failed webhook queue component
- [ ] Webhook statistics component
- [ ] API client methods
- [ ] Backend webhook API endpoints
- [ ] Auto-retry processor/background task
- [ ] Webhook retry service
- [ ] Event payload storage and retrieval
- [ ] Audit logging

---

## Deployment Strategy

1. Deploy webhook API endpoints
2. Deploy webhook event logging
3. Deploy retry processor
4. Deploy frontend webhook monitoring
5. Testing: Send test webhooks, verify logs
6. Staff training: Webhook monitoring
7. Rollback: Maintain webhook event history

---

## Performance Targets

- Webhook event processing: <500ms
- Webhook events list load: <500ms
- Event details load: <300ms
- Test webhook response: <2s

---

## Monitoring & Alerting

- Track webhook delivery success rate
- Alert on webhook failures
- Monitor processing latency
- Alert on duplicate events
- Track retry attempts

---

## Documentation Requirements

- Webhook setup guide
- Webhook event reference
- Webhook troubleshooting guide
- Webhook payload format guide
- Webhook security guide

---

## Future Enhancements

- Webhook payload transformation
- Event filtering by business rules
- Multi-tenant webhook isolation
- Webhook encryption
- Advanced webhook routing
- Webhook monitoring dashboard (separate)
- Webhook analytics
- Webhook replay functionality
