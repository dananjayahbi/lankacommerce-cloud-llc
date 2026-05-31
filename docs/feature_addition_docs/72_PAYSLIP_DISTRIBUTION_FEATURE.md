# Payslip Distribution Feature

## Executive Summary

Payslip distribution and delivery management enabling automated and manual distribution of generated payslips through multiple channels (email, SMS, portal) with delivery tracking and retry logic.

## Current State Analysis

### EXISTING
- User notification system infrastructure
- Email service integration (Sentry email configs)
- Multi-channel notification capability

### GAPS
- No payslip distribution workflow implemented
- No batch payslip generation and distribution
- No email template for payslips
- No SMS notification for payslips
- No delivery status tracking (email bounces, failures)
- No retry logic for failed deliveries
- No delivery preference per employee
- No bulk distribution interface
- No distribution scheduling
- No delivery audit trail
- No opt-out mechanism
- No delivery statistics/reporting

## Frontend Features

### Payslip Distribution Dashboard
- **Distribution Status Overview**:
  - Total payslips generated
  - Total delivered
  - Total pending
  - Total failed
  - Delivery rate percentage
  - Average delivery time

- **Delivery Method Distribution**:
  - Pie/bar chart showing email vs SMS vs portal access
  - Count and percentage for each method

### Bulk Distribution Wizard (Step-by-Step)

**Step 1: Select Payslips**
- Payroll period selector
- Employee filter (all, department, specific)
- Select specific payslips (checkboxes)
- Count display (selected payslips)

**Step 2: Choose Delivery Method**
- Email checkbox (with preview template)
- SMS checkbox (with preview message)
- Portal notification checkbox (in-app only)
- Priority selector (normal, high, urgent)

**Step 3: Configure Settings**
- Send time selector (now, scheduled)
- Retry settings (enabled, retry count, retry interval)
- Include PDF attachment (email)
- Custom message (optional)
- Confirmation request (if enabled)

**Step 4: Review and Confirm**
- Summary display
- Recipients count per method
- Delivery estimate
- Confirm button

### Distribution History/Logs
- **Payslip Delivery Log Table**:
  - Payslip ID
  - Employee name
  - Delivery method
  - Sent date/time
  - Delivery status (pending, sent, delivered, failed, bounced)
  - Recipient contact (masked)
  - Retry count
  - Last error message
  - Resend button (per row)

- **Filters**:
  - Status filter (all, pending, sent, delivered, failed)
  - Date range filter
  - Delivery method filter
  - Employee filter

- **Sort Options**: By date, status, employee
- **Bulk Actions**:
  - Bulk retry button (for failed deliveries)
  - Bulk resend button (for sent)

### Delivery Preferences Per Employee
- **Delivery Method Preference**:
  - Preferred method selector (email, SMS, portal)
  - Fallback method selector
  - Contact information (email, phone)

- **Email Settings**:
  - Opt-in/opt-out toggle
  - Include PDF attachment toggle
  - Frequency preference (per payslip, monthly summary)

- **SMS Settings**:
  - Opt-in/opt-out toggle
  - Phone number (selectable)

- **Portal Access**:
  - Always enabled (read-only)

- **Additional Preferences**:
  - Notify on pay day toggle
  - Notify on correction toggle
  - Save preferences button

### Delivery Status Indicators
- Per payslip in list view:
  - Sent (checkmark)
  - Delivered (double checkmark)
  - Failed (X icon with tooltip)
  - Pending (hourglass)
  - Color-coded (green/yellow/red)

### Resend Individual Payslip Modal
- Select delivery method(s)
- Override recipient contact (if needed)
- Optional message
- Resend button

### Delivery Notifications
- Notification when payslip sent
- Notification when payslip accessed
- Bounce/failure notification (to HR)
- Delivery summary report

## Backend API Requirements

### Core Endpoints

**POST /api/hr/payslips/bulk-distribute/**
- Bulk distribute payslips
- Request body: { payslip_ids: [...], delivery_methods: ['email', 'sms'], send_time (nullable), retry_config: {enabled, count, interval}, custom_message (nullable) }
- Response: { distribution_id, total_queued, success_count, failure_count, estimated_completion_time }

**GET /api/hr/payslips/delivery-logs/**
- Get delivery history
- Query params: status, date_from, date_to, delivery_method, employee_id, page, page_size
- Response: [{ id, payslip_id, employee_id, delivery_method, sent_at, delivered_at, status, error_message, retry_count }]

**POST /api/hr/payslips/{id}/resend/**
- Resend single payslip
- Request body: { delivery_methods: [...], recipient_contact (nullable) }

**PATCH /api/hr/payslips/{id}/delivery-preferences/**
- Set delivery preferences
- Request body: { preferred_method, email_opt_in, sms_opt_in, phone_number (nullable), notify_on_payday, include_attachment }

**GET /api/hr/payslips/{id}/delivery-preferences/**
- Get delivery preferences

**POST /api/hr/payslips/bulk-retry-failed/**
- Retry failed deliveries
- Request body: { delivery_log_ids: [...] }

**GET /api/hr/payslips/distribution-statistics/**
- Get distribution stats
- Response: { total_distributed, delivered, pending, failed, delivery_rate, by_method: {...}, average_delivery_time }

**POST /api/hr/payslips/mark-accessed/**
- Record payslip access

**GET /api/hr/payslips/delivery-report/**
- Generate distribution report

## Database Requirements

### PayslipDeliveryLog Model
- id
- tenant_id
- payslip_id
- employee_id
- delivery_method (email/sms/portal)
- recipient_contact (encrypted)
- sent_at
- delivered_at
- status
- error_message
- retry_count
- last_retry_at

### EmployeeDeliveryPreference Model
- id
- tenant_id
- employee_id
- preferred_method
- fallback_method
- email_opt_in
- sms_opt_in
- phone_number (encrypted)
- notify_on_payday
- include_attachment

### DistributionBatch Model
- id
- tenant_id
- created_by
- batch_start
- batch_completion
- status
- total_payslips
- success_count
- failure_count

### Indexes
- (tenant_id, payslip_id)
- (status, created_at)
- (employee_id, sent_at DESC)

## Current Implementation Status

- ❌ Payslip distribution NOT implemented
- ❌ Delivery logs NOT implemented
- ❌ Bulk distribution wizard NOT implemented
- ❌ Delivery preferences NOT implemented
- ❌ Email templates NOT created
- ❌ SMS templates NOT created
- ❌ Retry logic NOT implemented
- ❌ Distribution report NOT implemented
- ❌ Frontend distribution UI NOT created
- ❌ API endpoints NOT implemented

## Validation & Edge Cases

- Employee must be active
- Payslip must be finalized before distribution
- Contact information validation (email, phone)
- Do Not Call list compliance (SMS)
- GDPR compliance (consent tracking)
- Retry limits to prevent spam
- Bounce handling and cleanup
- Email delivery verification (read receipts)
- SMS delivery confirmation
- Failed delivery notifications to HR
- Concurrent distribution handling (prevent duplicates)
- Timezone-aware scheduled distribution
- Rate limiting (ISP constraints)
- Delivery method fallback (if primary fails)

## Testing Checklist

- [ ] Dashboard displays statistics correctly
- [ ] Distribution wizard step 1 works (select payslips)
- [ ] Distribution wizard step 2 works (choose methods)
- [ ] Distribution wizard step 3 works (configure settings)
- [ ] Distribution wizard step 4 displays summary correctly
- [ ] Bulk distribution confirms and queues
- [ ] Distribution history table displays
- [ ] Filters work (status, date, method, employee)
- [ ] Sort works (date, status, employee)
- [ ] Delivery log records created
- [ ] Email sends successfully
- [ ] SMS sends successfully (if enabled)
- [ ] Portal notification displays
- [ ] Delivery status updates (sent → delivered)
- [ ] Failed status displays with error
- [ ] Retry logic triggers for failed
- [ ] Bulk retry button works
- [ ] Individual resend works
- [ ] Delivery preferences modal works
- [ ] Email opt-in/opt-out works
- [ ] SMS opt-in/opt-out works
- [ ] Contact information updates
- [ ] Notification preferences save
- [ ] Status indicators display correctly
- [ ] Bounce handling removes bad emails
- [ ] Scheduled distribution queues
- [ ] Scheduled distribution executes on time
- [ ] Concurrent distributions prevent duplicates
- [ ] Delivery report generates correctly
- [ ] Statistics calculate correctly
- [ ] Responsive design works

## Implementation Checklist

- [ ] Distribution dashboard component
- [ ] Distribution statistics component
- [ ] Bulk distribution wizard (4 steps)
- [ ] Payslip selection component
- [ ] Delivery method selector component
- [ ] Distribution configuration component
- [ ] Delivery history table component
- [ ] Filters and sort component
- [ ] Delivery preferences modal component
- [ ] Status indicator components
- [ ] Resend modal component
- [ ] Distribution report component
- [ ] API client methods
- [ ] State management
- [ ] Email service integration
- [ ] SMS service integration
- [ ] Queue/task scheduler (for delayed distribution)
- [ ] Retry service (with exponential backoff)
- [ ] Bounce handling service
- [ ] Delivery verification service
- [ ] Audit logging service
- [ ] Permission checks
- [ ] Rate limiting
- [ ] Responsive layout
- [ ] Accessibility

## Deployment Strategy

- **Phase 1**: Deploy database models (PayslipDeliveryLog, EmployeeDeliveryPreference)
- **Phase 2**: Deploy API endpoints and services
- **Phase 3**: Deploy frontend distribution UI
- **Phase 4**: Deploy email and SMS templates
- **Phase 5**: Deploy retry and bounce handling
- **Testing**: Test with various delivery scenarios
- **Staff training**: Show distribution wizard, preferences, history
- **Rollback plan**: Maintain delivery logs, requeue failed

## Performance Targets

- Bulk distribution queuing: <2s (per 100 payslips)
- Delivery log API: <500ms (page_size=50)
- Email send: <5s per batch (100 emails)
- SMS send: <3s per batch (100 SMS)
- Report generation: <5s

## Monitoring & Alerting

- Track distribution success rate
- Monitor email bounce rate
- Alert on SMS delivery failures
- Track retry count trends
- Monitor queue depth
- Alert on stalled distributions

## Documentation Requirements

- Bulk distribution guide
- Delivery preferences guide
- Resend guide
- Delivery status explanation
- Bounce/failure handling
- Statistics interpretation
- Report guide

## Future Enhancements

- WhatsApp payslip delivery
- Telegram delivery
- Push notifications
- Payslip download links (instead of attachments)
- Digital signature verification on delivery
- Payslip read/access confirmation
- Advanced scheduling (cron-based)
- Delivery analytics dashboard
- A/B testing (different templates)
- Machine learning bounce prediction
- Compliance reporting (GDPR)
- Integration with payroll accounting
