# Settings Page - Notifications Feature Specification

## Executive Summary

Notification Settings providing comprehensive configuration of email, SMS, in-app, and WhatsApp notifications including templates, preferences, frequency, scheduling, and delivery rules enabling administrators to manage system-wide communication channels.

## Current State Analysis

### EXISTING:
- Notification infrastructure exists (apps/notifications/)
- Email service configuration (apps/billing/services/email_service.py)
- Webhook system (settings webhooks page exists)
- Audit log page (for notification tracking)

### MISSING (Partially implemented or incomplete):
- Notification Settings Tab UI
- Email notification configuration UI
- SMS notification configuration UI
- In-app notification configuration UI
- WhatsApp notification configuration UI
- Notification recipient configuration
- Notification frequency settings
- Notification scheduling UI
- Notification templates management UI
- Email template editor
- SMS template editor
- WhatsApp template editor
- Test send functionality
- Notification preference management
- Notification logs display
- Failed notification retry UI
- Do-not-disturb settings
- Notification priority levels

## Frontend Features

### Page Structure
- Settings navigation (continues from Document 100):
  - Notification Settings (active)

### Email Notifications Section

#### Email Template Configuration
- Enable Email Notifications toggle
- Template selector (dropdown with predefined templates):
  - Order confirmation
  - Invoice email
  - Shipping notification
  - Delivery confirmation
  - Low stock alert
  - Payment reminder
  - Leave approval
  - Payslip notification
  - Custom templates

#### Template Editor
- Email subject line field (text input)
- Email body field (rich text editor)
- Merge fields helper (available variables list)
- Preview button
- Reset to default button
- Test Send button (sends to current user)
- Save template button

#### Email Recipient Configuration
- Primary recipient email field
- Multiple recipient management (add/remove)
- Recipient role selector (for role-based recipients)

#### Email Frequency Configuration
- Send frequency selector (immediate, daily digest, weekly digest)
- Digest time picker (for daily/weekly)

#### Email Settings
- Reply-to email field
- Sender name field
- Email footer text (optional)
- Logo in email toggle
- Branding color selector

### SMS Notifications Section

#### SMS Notification Toggle
- Enable SMS Notifications toggle (conditional: SMS service must be configured)

#### SMS Template Configuration
- Template selector (predefined SMS templates)
- Template editor (SMS text, character counter)
- Merge fields helper
- Preview button
- Reset to default button
- Test Send button

#### SMS Recipient Configuration
- Primary phone number field
- Multiple recipient management

#### SMS Frequency Configuration
- Send frequency selector
- Do-not-disturb hours (from/to time pickers)

### In-App Notifications Section

#### Notification Types Configuration
- Enable In-App Notifications toggle
- Notification Types Configuration (list):
  - Order updates (enable/disable)
  - Inventory alerts (enable/disable)
  - Payment reminders (enable/disable)
  - Staff alerts (enable/disable)
  - System notifications (enable/disable)

#### Notification Display Settings
- Sound alert toggle
- Desktop notification toggle (if browser supports)
- Notification duration (timeout in seconds)

#### Notification Center Settings
- Retention period (days before archiving)
- Max notifications display
- Email on failed notification (backup)

### WhatsApp Notifications Section
(If WhatsApp service enabled)

#### WhatsApp Notification Toggle
- Enable WhatsApp Notifications toggle

#### WhatsApp Configuration
- WhatsApp Business Account ID field
- Template Management:
  - Approved templates list
  - Template selector
  - Send test message button
  - Merge fields reference

#### WhatsApp Recipient Configuration
- Primary phone number
- Multiple recipients

#### WhatsApp Frequency
- Send frequency
- Do-not-disturb hours

### Notification Preferences Section

#### Global Notification Settings
- Mute all notifications toggle (for maintenance windows)
- Mute duration (from/to datetime pickers)

#### Opt-in/Opt-out Configuration
- Customer notification preferences (show template)
- Employee notification preferences (show template)
- Vendor notification preferences (show template)

#### Notification Priority Levels
- Critical notifications (always send)
- High priority (follow frequency rules)
- Normal priority (follow frequency rules)
- Low priority (daily digest only)

### Notification Logs Section (Read-only)

#### Recent Notifications Table
- Notification type, recipient, sent time, delivery status
- Filter by notification type
- Filter by date range
- Filter by delivery status (pending, sent, failed, bounced)
- View notification details (modal)
- Resend failed notification button

### Notification Errors & Retry Section (Admin Only)

#### Failed Notifications Management
- Failed notifications table
- View error details
- Manual retry button
- Bulk retry button
- Clear errors option

## Backend API Requirements

### General Notification Settings
- **GET /api/settings/notifications/** - Get notification settings
  - Response: { email_enabled, sms_enabled, inapp_enabled, whatsapp_enabled, templates, recipients, preferences }
  
- **PATCH /api/settings/notifications/** - Update notification settings
  - Request body: notification configuration updates
  - Response: updated settings

### Template Management
- **GET /api/settings/notifications/templates/** - Get templates
  - Response: [{ type, name, subject, body, merge_fields }]
  
- **PATCH /api/settings/notifications/templates/{type}/** - Update template
  - Request body: { subject, body }
  - Response: updated template

### Test Functionality
- **POST /api/settings/notifications/test-send/** - Send test notification
  - Request body: { type, recipient }
  - Response: { success, message_id }

### Notification Logs
- **GET /api/settings/notifications/logs/** - Get notification logs
  - Query params: type, date_range, status, limit, offset
  - Response: [{ id, type, recipient, sent_at, delivery_status, error }]

### Retry Management
- **POST /api/settings/notifications/retry/** - Retry failed notifications
  - Request body: { notification_ids }
  - Response: { success, retried_count }

## Database Requirements

### Core Models
- **NotificationTemplate model** (if not exists):
  - Fields: type, name, subject, body, merge_fields, created_at, updated_at
  
- **NotificationLog model** (if not exists):
  - Fields: type, recipient, content, sent_at, delivery_status, error_message

### Extensions
- Extend Tenant settings: notification preferences, templates, recipients
- Indexes: (type, created_at DESC), (delivery_status, created_at DESC)

### Data Storage
- Store notification templates with version history
- Archive old logs based on retention policy
- Track failed notifications for retry mechanism

## Current Implementation Status

- Notification infrastructure exists (partial)
- Email service exists (partial)
- Notification Settings UI NOT implemented
- Template management NOT implemented
- Recipient configuration NOT fully exposed
- Frequency configuration NOT implemented
- SMS/WhatsApp configuration NOT fully exposed
- Notification logs NOT fully exposed
- Retry functionality may be partial

## Validation & Edge Cases

### Input Validation
- Email addresses must be valid
- Phone numbers must be valid format
- SMS character limit (160 chars or 1530 with unicode)
- Merge fields must be valid for template type

### Template Management
- Templates cannot be deleted (only reset to default)
- Multiple recipients require at least one
- Frequency settings must be valid (immediate, daily, weekly)

### Scheduling & Timing
- Do-not-disturb times must be valid (end > start)
- Timezone affects scheduling
- Failed notifications require retention for retry

## Testing Checklist

### Email Notifications
- [ ] Email notifications enable/disable works
- [ ] Email template loads
- [ ] Template editing saves
- [ ] Merge fields display correctly
- [ ] Test send sends email
- [ ] Email recipients can be added/removed
- [ ] Email frequency settings save

### SMS Notifications
- [ ] SMS notifications enable/disable works
- [ ] SMS template works
- [ ] SMS character counter accurate
- [ ] Test send sends SMS
- [ ] SMS recipients work
- [ ] SMS do-not-disturb hours work

### In-App Notifications
- [ ] In-app notifications enable/disable
- [ ] Notification types toggle
- [ ] Sound alert works
- [ ] Desktop notification works
- [ ] Notification duration applies

### WhatsApp Integration
- [ ] WhatsApp section visible (if enabled)
- [ ] WhatsApp template loads
- [ ] Test send WhatsApp works

### Preferences & Logs
- [ ] Notification preferences save
- [ ] Global mute works
- [ ] Logs display correctly
- [ ] Log filters work
- [ ] Failed notifications appear in table
- [ ] Retry button works
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components
- [ ] Notification settings page component
- [ ] Email configuration section component
- [ ] SMS configuration section component
- [ ] In-app configuration section component
- [ ] WhatsApp configuration section component
- [ ] Template editor component
- [ ] Template list component
- [ ] Recipient management component
- [ ] Frequency configuration component
- [ ] Notification logs component
- [ ] Test send functionality
- [ ] Merge fields helper
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Validation service
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states

### Backend Implementation
- [ ] Backend API endpoints
- [ ] Notification template service
- [ ] Email service configuration
- [ ] SMS service configuration
- [ ] WhatsApp service configuration
- [ ] Notification log service
- [ ] Retry mechanism
- [ ] Permission checks

## Deployment Strategy

1. Deploy notification settings API endpoints
2. Deploy notification service configurations
3. Deploy frontend notification settings component
4. Testing: Send test notifications on all channels
5. Staff training: Template configuration
6. Rollback: Maintain notification service availability

## Performance Targets

- Settings load: <300ms
- Template save: <500ms
- Test send: <2s per channel
- Log queries: <500ms

## Monitoring & Alerting

- Track notification delivery rates
- Alert on high failure rate
- Monitor notification latency
- Log all template changes

## Documentation Requirements

- Notification configuration guide
- Email template guide
- SMS template guide
- WhatsApp setup guide
- Merge fields reference
- Troubleshooting guide

## Future Enhancements

- Notification scheduling (send at specific times)
- Conditional notifications (if-then rules)
- Notification analytics/reporting
- A/B testing for templates
- Notification template library
- Multi-language templates
- Notification batching
- Webhook notifications
