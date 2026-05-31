# Notification Preferences & Delivery Management Feature Specification
**Document ID:** 122  
**Feature Area:** Notification Management  
**Status:** Specification  
**Last Updated:** May 31, 2026

---

## Executive Summary

Notification Preferences & Delivery Management provides granular channel selection, recipient configuration, and scheduling enabling users to control how and when notifications are delivered. This feature allows tenants to configure notification delivery across email, SMS, WhatsApp, and in-app channels with support for delivery scheduling, frequency control, and recipient management.

---

## Current State Analysis

### EXISTING INFRASTRUCTURE

**Notification Model:**
- In-app notification storage (backend/apps/notifications/models.py)
- Stores title, body, related_entity_type, related_entity_id, is_read, created_at
- Notification display popover (NotificationPopover component)
- Mark as read functionality (MarkNotificationReadView, MarkAllReadView)
- Limited to in-app notifications only

**Email Service:**
- Email sending capability (backend/apps/billing/services/email_service.py)
- Sends to any configured email
- Email backend integration (Resend or Django email)
- Currently sends payment/billing emails only

**WhatsApp Service:**
- WhatsApp receipt notifications (backend/apps/pos/services/whatsapp_service.py)
- Limited to sales receipt delivery
- WhatsAppReceiptPayload structure

**User & Tenant Structure:**
- User management with email addresses
- Phone numbers stored on user or tenant
- Tenant isolation implemented
- User roles: Admin, Manager, Staff, Cashier, Stock Clerk, etc.

**Settings Infrastructure:**
- Settings page structure exists (hardware, webhooks, audit-log tabs)
- Multi-tab interface established

### MISSING OR INCOMPLETE

**Notification Preferences Model:**
- NO notification preferences stored in database
- NO channel selection configuration
- NO frequency control
- NO delivery scheduling
- NO recipient configuration

**Channel Selection Per Notification Type:**
- NO configuration to select which channels per notification type
- NO enable/disable toggles per notification type
- All channels hardcoded per notification

**Frequency Configuration:**
- NO frequency options (immediate, daily digest, weekly digest)
- NO digest compilation
- All notifications sent immediately

**Scheduling & Do Not Disturb:**
- NO do-not-disturb scheduling
- NO time-based delivery preferences
- NO delivery time scheduling

**Recipient Configuration:**
- NO recipient whitelist per notification type
- NO role-based recipients
- NO department-based recipients
- NO recipient override system

**Escalation Rules:**
- NO escalation rules implemented
- NO unread notification escalation
- NO multi-channel escalation

**SMS Integration:**
- NO SMS service implemented
- NO SMS templates
- NO SMS delivery

**Unsubscribe Management:**
- NO unsubscribe tracking
- NO whitelist/blacklist
- NO unsubscribe compliance

**Throttling & Rate Limiting:**
- NO rate limiting per recipient
- NO daily/hourly notification limits
- NO throttling strategy configuration

**Scheduled Notifications:**
- NO scheduling capability
- NO digest compilation
- NO batch processing

**Delivery Queue & Retry:**
- NO delivery queue
- NO retry mechanism
- NO failed delivery tracking

**Notification Preferences UI:**
- NO preferences configuration page
- NO settings UI
- NO role-based preference configuration
- NO department-based preference configuration

---

## Frontend Features

### Settings - Notification Preferences Tab

#### Notification Types Configuration

**Notification Types Table/Cards:**
- Columns: Type, Description, Channels, Frequency, Status, Actions
- Rows for each notification type:
  - Order confirmation
  - Invoice notification
  - Shipping/delivery notification
  - Payment notifications
  - Low stock alerts
  - Stock take approval
  - Payment overdue alert
  - Account suspension
  - Trial expiring soon
  - Payslip notification
  - Leave approval
  - System alerts
  - Custom notification types

**Per-Notification-Type Configuration:**

**Enable/Disable Toggle:**
- Toggle to enable/disable this notification type
- Save immediately (no submit needed)
- Visual indication of enabled/disabled state

**Channel Selection (Checkboxes):**
- Email checkbox (enabled by default if email configured)
- SMS checkbox (enabled if SMS service available)
- WhatsApp checkbox (enabled if WhatsApp service available)
- In-app checkbox (always available)
- At least one channel must be selected
- Save on toggle change

**Recipient Configuration:**
- Select recipients button (opens modal)
- Display currently selected recipients
- Override default recipients toggle
- Custom recipients list display:
  - User name, email, phone
  - Remove button (per recipient)
- Clear all recipients button (with confirmation)

**Frequency Selector (Radio Buttons or Dropdown):**
- Immediate: Send as soon as event occurs
- Daily digest: Compile all notifications, send once daily
- Weekly digest: Compile all notifications, send once weekly
- Save on change

**Scheduling Section:**
- Do not disturb toggle
- Do not disturb start time (time picker, HH:MM format)
- Do not disturb end time (time picker, HH:MM format)
- Start time must be before end time
- Delivery time preference:
  - ASAP: Send immediately when outside do not disturb
  - Specific time: Delivery time selector (HH:MM)
- Save on change

**Save Button:**
- Save preferences button (confirms all settings for this type)
- Success message on save
- Error handling if save fails

---

#### Global Notification Settings

**Default Channels (Global):**
- Email enabled toggle (system-wide)
- SMS enabled toggle (system-wide)
- WhatsApp enabled toggle (system-wide)
- In-app enabled toggle (always enabled)
- Description: "These settings apply to all notification types unless overridden"

**Default Frequency (Global):**
- Default frequency selector (immediate/digest/weekly digest)
- Applies to all notification types using default

**Do Not Disturb Schedule (Global):**
- Enable global do not disturb
- Start time (time picker)
- End time (time picker)
- Day of week selection (Mon-Sun checkboxes)
- Description: "Applies to all users in tenant"

**Enable/Disable All Notifications:**
- Master toggle to disable all notifications
- Warning message if disabled: "All notifications will be paused"
- Override individual settings
- Enable/disable button

**Save Global Settings Button:**
- Saves all global preferences
- Success confirmation
- Propagates to all users (or shows impact count)

---

#### Role-Based Preferences

**Role Selector (Dropdown):**
- Admin
- Manager
- Staff
- Cashier
- Stock Clerk
- Custom roles
- Preview: "Preferences for [Role] users"

**Notification Types Table (for Selected Role):**
- Same as global, but role-specific
- Rows for each notification type
- Enable/disable per role toggle
- Channel selection per role
- Frequency per role
- Do not disturb schedule per role

**Save Role Preferences Button:**
- Saves all settings for this role
- Confirmation: "Saved preferences for [Role] users"
- Shows which notifications will be sent to role members

---

#### Department-Based Preferences (if Applicable)

**Department Selector (Dropdown):**
- List of departments (from HR module)
- Preview selected department

**Notification Types Table (for Selected Department):**
- Same configuration as role-based
- Enable/disable per department
- Channel selection per department
- Frequency per department

**Save Department Preferences Button:**
- Saves department-specific settings
- Confirmation message

---

#### Recipient Management

**Current Recipients Section:**
- Recipients list (table or cards):
  - User name
  - Email address
  - Phone number (if WhatsApp/SMS enabled)
  - WhatsApp number (if different from phone)
  - Actions: Edit, Remove
- Filtering: By role, by department
- Search: By name, email, phone

**Add Recipient Button:**
- Opens modal to add single recipient
- User selector (autocomplete or dropdown)
- Email verification (auto-populated)
- Phone number input (for SMS/WhatsApp)
- WhatsApp number input (optional, if different)
- Add recipient button
- Added to current recipients list

**Bulk Add Recipients Button:**
- Upload CSV/Excel file
- Format: email, phone, name (columns)
- Preview: Show parsed recipients
- Conflict detection: If user already exists
- Confirm bulk add button
- Results: Added count, skipped count

**Remove All Recipients Button:**
- Confirmation dialog: "Remove all recipients?"
- Effect: All notifications stop being sent to current recipients
- Remove all button (confirms)
- Undo option (24-hour window)

**Export Recipients List Button:**
- Download as CSV
- Columns: Name, Email, Phone, Role, Department
- Filename: recipients_export_[date].csv

---

#### Notification Escalation

**Escalation Rules Section:**
- Rules list (table):
  - Trigger: "If notification not read in X hours"
  - Action: "Escalate to email/SMS/WhatsApp"
  - Enabled toggle (per rule)
  - Actions: Edit, Delete

**Add Escalation Rule Button:**
- Opens form to create rule
- Trigger type selector:
  - Unread for X hours (text input, hours)
  - Unread for X days (text input, days)
- Action selector (dropdown):
  - Send as email
  - Send as SMS
  - Send as WhatsApp
  - Send as all channels
- Notification types to apply (multi-select)
- Create rule button
- Added to rules list

**Edit Escalation Button (per Rule):**
- Opens form to edit rule
- Same fields as create
- Save button
- Cancel button

**Delete Escalation Button (per Rule):**
- Confirmation: "Delete this escalation rule?"
- Delete button (confirms)
- Rule removed from list

---

#### Unsubscribe Management

**Unsubscribed Users Section:**
- Unsubscribed users list (table):
  - User email/name
  - Notification type (if type-specific unsubscribe)
  - Unsubscribe date
  - Reason (if provided)
  - Actions: Re-subscribe, View details
- Filter by notification type
- Search by email
- Total unsubscribed count

**Re-Subscribe Button (per User):**
- Confirmation: "Re-subscribe [user] to [notification_type]?"
- Re-subscribe button (confirms)
- User moved back to recipients
- Confirmation message

**Unsubscribe Request Handling:**
- Honor unsubscribe links from email (backend)
- Display in UI when user unsubscribes
- Show message: "User [email] has unsubscribed from [type]"
- Manual re-subscribe option (above)

---

#### Notification Throttling

**Rate Limiting Configuration:**
- Max notifications per user per day (number input)
  - Default: 50
  - Min: 1
  - Max: 999
  - Help text: "Maximum notifications any single user receives per day"
- Max notifications per user per hour (number input)
  - Default: 10
  - Min: 1
  - Max: 999
  - Help text: "Maximum notifications any single user receives per hour"

**Throttling Strategy Selector (Dropdown):**
- Drop: Discard excess notifications
- Queue: Hold in queue for later delivery
- Digest: Compile excess into digest
- Strategy description display

**Save Throttling Settings Button:**
- Saves configuration
- Confirmation: "Throttling settings updated"
- Shows impact: "Will affect [X] active notification types"

---

#### Delivery Retry Configuration

**Failed Delivery Retry Settings:**
- Enable retry toggle (checkbox)
- Retry delay (minutes input)
  - Default: 5 minutes
  - Min: 1
  - Max: 1440 (24 hours)
- Max retry attempts (number input)
  - Default: 3
  - Min: 1
  - Max: 10

**Backoff Strategy Selector (Dropdown):**
- Fixed: Retry after fixed interval
- Exponential: Increase delay exponentially
  - Formula: delay * (2 ^ attempt_number)
- Linear: Increase delay linearly
  - Formula: delay * (attempt_number + 1)

**Save Retry Settings Button:**
- Saves configuration
- Confirmation message

---

#### SMS Configuration (if SMS Enabled)

**SMS Provider Selector (Dropdown):**
- Twilio
- AWS SNS
- Vonage
- Custom provider
- Help text: "Select your SMS service provider"

**SMS Sender ID Field (Text Input):**
- Sender ID (alphanumeric, max 11 characters)
- Help text: "The name displayed on SMS"
- Validation: Only alphanumeric characters

**SMS API Credentials (if Not Global):**
- API key field (password input)
- API secret field (password input)
- Account ID field
- Save credentials button
- Test credentials button
- Connection status indicator

**Test SMS Send Button:**
- Opens modal
- Test phone number input
- Send test SMS button
- Delivery status: "Sent successfully to [phone]"
- Error handling: Show error message if fails

**SMS Delivery Reports Toggle:**
- Enable delivery report tracking
- Shows delivery status updates
- Help text: "Track when SMS messages are delivered"

---

#### WhatsApp Configuration (if WhatsApp Enabled)

**WhatsApp Business Account ID (Readonly):**
- Display current account ID
- Edit button (if multiple accounts available)
- Account name display

**WhatsApp API Credentials:**
- API key field (password input)
- Business account number
- Save credentials button
- Test credentials button
- Status indicator (Connected/Not connected)

**WhatsApp Template Approval Status Display:**
- List of templates
- For each: Name, status (Approved/Pending/Rejected)
- Rejected templates show rejection reason
- Resubmit button (for rejected)

**Test WhatsApp Send Button:**
- Opens modal
- Test WhatsApp number input
- Test template selector
- Send test button
- Delivery confirmation: "Message sent to [number]"

---

## Backend API Requirements

### Notification Preferences

**GET /api/notifications/preferences/**
- Query params: tenant_id (from context)
- Response:
  ```json
  {
    "global_settings": {
      "email_enabled": true,
      "sms_enabled": true,
      "whatsapp_enabled": true,
      "inapp_enabled": true,
      "default_frequency": "immediate",
      "do_not_disturb": {
        "enabled": true,
        "start_time": "22:00",
        "end_time": "08:00",
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      },
      "all_notifications_disabled": false
    },
    "notification_types": {
      "order_confirmation": {
        "enabled": true,
        "channels": ["email", "whatsapp", "inapp"],
        "frequency": "immediate",
        "recipients": ["user_id_1", "user_id_2"],
        "schedule": {
          "do_not_disturb": false,
          "delivery_time_preference": "asap"
        }
      }
    },
    "role_preferences": {...},
    "department_preferences": {...}
  }
  ```

**PATCH /api/notifications/preferences/**
- Request body: Partial update
- Response: Updated full preferences object

**POST /api/notifications/preferences/notification-type/{type}/**
- Request body:
  ```json
  {
    "enabled": true,
    "channels": ["email", "whatsapp"],
    "frequency": "immediate",
    "recipients": ["user_id_1", "user_id_2"],
    "schedule": {
      "do_not_disturb": true,
      "start_time": "22:00",
      "end_time": "08:00",
      "delivery_time": "09:00"
    }
  }
  ```
- Response: Saved preferences for notification type
- Status code: 200 OK

---

### Recipients Management

**GET /api/notifications/preferences/recipients/**
- Query params: limit, offset, role, department
- Response:
  ```json
  {
    "count": 15,
    "results": [
      {
        "user_id": "uuid",
        "name": "John Manager",
        "email": "john@company.com",
        "phone": "+1234567890",
        "whatsapp": "+1234567890",
        "role": "Manager",
        "department": "Sales"
      }
    ]
  }
  ```

**POST /api/notifications/preferences/recipients/**
- Request body:
  ```json
  {
    "user_id": "uuid"
  }
  ```
- Response: { "success": true, "user": {...} }
- Status code: 201 Created

**DELETE /api/notifications/preferences/recipients/{user_id}/**
- Response: { "success": true }
- Status code: 204 No Content

**POST /api/notifications/preferences/recipients/bulk-add/**
- Request: multipart/form-data with CSV file
- Response:
  ```json
  {
    "added_count": 10,
    "skipped_count": 2,
    "errors": [
      {"row": 3, "error": "Invalid email format"}
    ]
  }
  ```

---

### Role-Based Preferences

**POST /api/notifications/preferences/role/{role}/**
- Request body:
  ```json
  {
    "notification_types": {
      "order_confirmation": {
        "enabled": true,
        "channels": ["email"],
        "frequency": "immediate"
      }
    }
  }
  ```
- Response: Saved role preferences
- Status code: 200 OK

**GET /api/notifications/preferences/role/{role}/**
- Response: Role-specific preferences

---

### Department-Based Preferences

**POST /api/notifications/preferences/department/{department_id}/**
- Request body: Same as role
- Response: Saved department preferences

**GET /api/notifications/preferences/department/{department_id}/**
- Response: Department-specific preferences

---

### Unsubscribe Management

**GET /api/notifications/preferences/unsubscribed/**
- Query params: limit, offset, type
- Response:
  ```json
  {
    "count": 5,
    "results": [
      {
        "user_id": "uuid",
        "email": "user@example.com",
        "notification_type": "order_confirmation",
        "unsubscribe_date": "2026-05-30T15:00:00Z",
        "reason": "Too many emails"
      }
    ]
  }
  ```

**POST /api/notifications/preferences/unsubscribed/{user_id}/resubscribe/**
- Request body:
  ```json
  {
    "notification_type": "order_confirmation"
  }
  ```
- Response: { "success": true }

**POST /api/notifications/unsubscribe/{token}/**
- Public endpoint (from email unsubscribe link)
- No auth required (token-based)
- Response: { "success": true }

---

### Throttling & Retry Settings

**PATCH /api/notifications/preferences/throttling/**
- Request body:
  ```json
  {
    "max_per_day": 50,
    "max_per_hour": 10,
    "strategy": "queue"
  }
  ```
- Response: Updated throttling settings

**PATCH /api/notifications/preferences/retry/**
- Request body:
  ```json
  {
    "enabled": true,
    "retry_delay_minutes": 5,
    "max_attempts": 3,
    "backoff_strategy": "exponential"
  }
  ```
- Response: Updated retry settings

---

### Scheduled Notifications

**POST /api/notifications/schedule-notification/**
- Request body:
  ```json
  {
    "template_id": "uuid",
    "recipient_id": "uuid",
    "scheduled_time": "2026-06-01T10:00:00Z",
    "data": {
      "order_id": "ORD-123",
      "customer_name": "John Doe"
    },
    "notification_type": "order_confirmation"
  }
  ```
- Response:
  ```json
  {
    "scheduled_notification_id": "uuid",
    "scheduled_time": "2026-06-01T10:00:00Z",
    "status": "scheduled"
  }
  ```

**GET /api/notifications/scheduled/**
- Query params: limit, offset, status
- Response: List of scheduled notifications

**DELETE /api/notifications/scheduled/{notification_id}/**
- Cancel a scheduled notification
- Response: { "success": true }

---

### Digest Compilation

**GET /api/notifications/digest/{period}/**
- Query params: period (daily/weekly), user_id
- Response:
  ```json
  {
    "period": "daily",
    "start_date": "2026-05-31",
    "end_date": "2026-05-31",
    "notifications": [
      {
        "id": "uuid",
        "title": "Order Confirmation",
        "body": "Your order #ORD-123 is confirmed",
        "created_at": "2026-05-31T14:00:00Z"
      }
    ],
    "total_count": 15
  }
  ```

**POST /api/notifications/digest/compile/**
- Trigger digest compilation (background job)
- Request body:
  ```json
  {
    "period": "daily",
    "send_to_all": true
  }
  ```
- Response: { "job_id": "uuid", "notifications_to_compile": 1250 }

---

## Database Requirements

### Core Models

**NotificationPreference:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- notification_type: VARCHAR(100) (e.g., order_confirmation)
- enabled: BOOLEAN (default: true)
- channels: JSONB array (email, sms, whatsapp, inapp)
- frequency: ENUM(immediate, daily_digest, weekly_digest)
- recipients: JSONB array of user IDs
- recipients_override: BOOLEAN (true if custom recipients, false if use defaults)
- created_at: DATETIME
- updated_at: DATETIME
- Indexes:
  - (tenant_id, notification_type) unique
  - (tenant_id, enabled)

**NotificationSchedule:**
- id: UUID (primary key)
- notification_preference_id: UUID (foreign key)
- start_time: TIME
- end_time: TIME
- do_not_disturb_enabled: BOOLEAN
- delivery_time_preference: ENUM(asap, specific_time)
- delivery_time: TIME (if specific_time)
- Indexes:
  - (notification_preference_id)

**RoleNotificationPreference:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- role: VARCHAR(100)
- notification_type: VARCHAR(100)
- enabled: BOOLEAN
- channels: JSONB array
- frequency: ENUM(immediate, daily_digest, weekly_digest)
- created_at: DATETIME
- updated_at: DATETIME
- Indexes:
  - (tenant_id, role, notification_type) unique

**DepartmentNotificationPreference:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- department_id: UUID (foreign key)
- notification_type: VARCHAR(100)
- enabled: BOOLEAN
- channels: JSONB array
- frequency: ENUM(immediate, daily_digest, weekly_digest)
- created_at: DATETIME
- updated_at: DATETIME
- Indexes:
  - (tenant_id, department_id, notification_type) unique

**UnsubscribedUser:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- user_id: UUID (foreign key)
- notification_type: VARCHAR(100) (null if unsubscribed from all)
- unsubscribe_date: DATETIME
- reason: TEXT (optional)
- unsubscribe_token: VARCHAR(500) (for unsubscribe link)
- Indexes:
  - (tenant_id, user_id, notification_type) unique
  - (unsubscribe_token)

**NotificationThrottling:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, unique)
- max_per_day: INTEGER (default: 50)
- max_per_hour: INTEGER (default: 10)
- throttling_strategy: ENUM(drop, queue, digest)
- updated_at: DATETIME

**ScheduledNotification:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- template_id: UUID (foreign key)
- recipient_id: UUID (foreign key)
- scheduled_time: DATETIME (indexed)
- notification_data: JSONB
- status: ENUM(scheduled, sent, failed, cancelled)
- created_at: DATETIME
- sent_at: DATETIME (nullable)
- Indexes:
  - (tenant_id, scheduled_time)
  - (status, scheduled_time)

**NotificationEscalationRule:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- trigger_type: ENUM(unread_hours, unread_days)
- trigger_value: INTEGER (hours or days)
- action: ENUM(escalate_email, escalate_sms, escalate_whatsapp, escalate_all)
- notification_types: JSONB array (null for all types)
- enabled: BOOLEAN
- created_at: DATETIME
- updated_at: DATETIME

---

## Current Implementation Status

### NOT IMPLEMENTED
- ✗ NotificationPreference model
- ✗ Preference configuration UI
- ✗ Channel selection UI
- ✗ Frequency configuration UI
- ✗ Scheduling UI (do not disturb, delivery time)
- ✗ Recipient configuration UI
- ✗ Role-based preferences UI
- ✗ Department-based preferences UI
- ✗ Unsubscribe management UI
- ✗ Escalation rules UI
- ✗ Throttling configuration UI
- ✗ SMS service and configuration
- ✗ Preference API endpoints
- ✗ Digest compilation service
- ✗ Scheduled notification processing
- ✗ Throttling service
- ✗ Escalation service

### PARTIALLY IMPLEMENTED
- Email and WhatsApp sending (exist, but not preference-driven)
- Recipient tracking (exists, not configurable)
- In-app notification storage (exists)

### FULLY IMPLEMENTED
- Tenant isolation
- User management

---

## Validation & Edge Cases

**Channel Validation:**
- At least one channel must be selected
- SMS channel requires SMS service to be enabled
- WhatsApp channel requires WhatsApp service to be enabled
- Email channel requires email service to be configured

**Recipient Validation:**
- Recipient list cannot be empty if notification enabled
- User IDs must exist in system
- Duplicate recipients not allowed
- Email/phone must be valid format (if SMS/WhatsApp)

**Scheduling Validation:**
- Start time must be before end time
- Time format must be HH:MM (24-hour)
- Days must be valid (Mon-Sun)
- Delivery time must be within 24 hours

**Frequency & Digest:**
- Digest frequency must have recipients configured
- Digest compilation must run at correct schedule
- Digest must include all notifications for period
- Digest email must be formatted correctly

**Throttling Validation:**
- Max per day must be > 0
- Max per hour must be > 0
- Max per day must be >= max per hour
- Strategy must be valid (drop/queue/digest)

**Retry Configuration:**
- Retry delay must be >= 1 minute
- Retry delay must be <= 24 hours
- Max attempts must be >= 1
- Max attempts must be <= 10

**Escalation Rules:**
- Trigger value must be > 0
- Action must be valid
- Notification types (if specified) must exist
- Only one rule per trigger per notification type

**Unsubscribe Compliance:**
- Unsubscribe requests must be honored immediately
- Unsubscribe token must be unique
- Unsubscribe token must be long enough for security
- Resubscribe must be allowed (no permanent unsubscribe)

**Preference Override:**
- Role preferences override global if both set
- Department preferences override global if both set
- User-specific preferences override role/department (future)
- Clear precedence hierarchy maintained

---

## Testing Checklist

**Preference CRUD:**
- [ ] Get notification preferences
- [ ] Update global preferences
- [ ] Set notification type preferences
- [ ] Get role-based preferences
- [ ] Set role-based preferences
- [ ] Get department-based preferences
- [ ] Set department-based preferences

**Channel Configuration:**
- [ ] Select multiple channels
- [ ] At least one channel required validation
- [ ] Channel availability checked
- [ ] Save channel selection

**Recipient Management:**
- [ ] Add single recipient
- [ ] Remove recipient
- [ ] Bulk add recipients via CSV
- [ ] Recipient validation (email/phone format)
- [ ] Empty recipient list validation

**Frequency Configuration:**
- [ ] Set immediate frequency
- [ ] Set daily digest frequency
- [ ] Set weekly digest frequency
- [ ] Frequency affects delivery

**Do Not Disturb:**
- [ ] Configure start/end times
- [ ] Start time before end time validation
- [ ] Do not disturb prevents delivery
- [ ] Delivery queued during do not disturb
- [ ] Delivery sent after do not disturb ends

**Unsubscribe:**
- [ ] User can unsubscribe via email link
- [ ] Unsubscribe tracked in database
- [ ] Unsubscribed users don't receive notifications
- [ ] Resubscribe works
- [ ] Resubscribe restores delivery

**Escalation:**
- [ ] Create escalation rule
- [ ] Edit escalation rule
- [ ] Delete escalation rule
- [ ] Unread notification triggers escalation
- [ ] Escalation sends to correct channel

**Throttling:**
- [ ] Throttling limits applied
- [ ] Excess notifications handled (dropped/queued)
- [ ] Rate per hour and per day enforced
- [ ] Throttling strategy works (drop/queue/digest)

**Scheduled Notifications:**
- [ ] Schedule notification for future time
- [ ] Cancel scheduled notification
- [ ] Scheduled notification sends at correct time
- [ ] Scheduled notification doesn't send before time

**Digest Compilation:**
- [ ] Daily digest compiles all notifications
- [ ] Weekly digest compiles all notifications
- [ ] Digest sent at correct time
- [ ] Digest formatted correctly
- [ ] Digest includes all notification details

**Retry Configuration:**
- [ ] Failed delivery retries
- [ ] Retry delay respected
- [ ] Max attempts enforced
- [ ] Backoff strategy applied (fixed/exponential)
- [ ] Retry stops after max attempts

**Responsive Design:**
- [ ] Mobile responsive layout
- [ ] All controls accessible on mobile
- [ ] Forms responsive
- [ ] Tables responsive

---

## Implementation Checklist

**Backend Models:**
- [ ] Create NotificationPreference model
- [ ] Create RoleNotificationPreference model
- [ ] Create DepartmentNotificationPreference model
- [ ] Create UnsubscribedUser model
- [ ] Create NotificationThrottling model
- [ ] Create ScheduledNotification model
- [ ] Create NotificationEscalationRule model
- [ ] Database migrations
- [ ] Create indexes

**Backend Services:**
- [ ] Preference retrieval service
- [ ] Preference update service
- [ ] Recipient management service
- [ ] Throttling service
- [ ] Escalation service
- [ ] Digest compilation service
- [ ] Scheduled notification processor (background task)
- [ ] Unsubscribe token generation/validation
- [ ] Preference override/inheritance service

**Backend API:**
- [ ] GET /api/notifications/preferences/
- [ ] PATCH /api/notifications/preferences/
- [ ] POST /api/notifications/preferences/notification-type/{type}/
- [ ] GET /api/notifications/preferences/recipients/
- [ ] POST /api/notifications/preferences/recipients/
- [ ] DELETE /api/notifications/preferences/recipients/{user_id}/
- [ ] POST /api/notifications/preferences/recipients/bulk-add/
- [ ] POST /api/notifications/preferences/role/{role}/
- [ ] GET /api/notifications/preferences/role/{role}/
- [ ] POST /api/notifications/preferences/department/{department_id}/
- [ ] GET /api/notifications/preferences/department/{department_id}/
- [ ] GET /api/notifications/preferences/unsubscribed/
- [ ] POST /api/notifications/preferences/unsubscribed/{user_id}/resubscribe/
- [ ] PATCH /api/notifications/preferences/throttling/
- [ ] PATCH /api/notifications/preferences/retry/
- [ ] POST /api/notifications/schedule-notification/
- [ ] GET /api/notifications/scheduled/
- [ ] DELETE /api/notifications/scheduled/{notification_id}/
- [ ] GET /api/notifications/digest/{period}/
- [ ] POST /api/notifications/digest/compile/

**Frontend Components:**
- [ ] Notification preferences page
- [ ] Global settings section
- [ ] Notification type configuration component
- [ ] Channel selector component
- [ ] Frequency selector component
- [ ] Scheduling component (do not disturb)
- [ ] Recipient selector modal
- [ ] Role preferences component
- [ ] Department preferences component
- [ ] Unsubscribe management component
- [ ] Escalation rules component
- [ ] Throttling configuration component
- [ ] SMS configuration component
- [ ] WhatsApp configuration component
- [ ] Test send component

**Frontend Pages:**
- [ ] Settings - Notification Preferences tab

**Integration:**
- [ ] SMS service integration (Twilio/AWS SNS/Vonage)
- [ ] WhatsApp service expansion (general notifications)
- [ ] Email service integration (unsubscribe links)
- [ ] Background job processing (digest, scheduled, retry)
- [ ] Notification delivery logic (respect preferences)
- [ ] Escalation rule enforcement

**Data:**
- [ ] Create default preferences for new tenants
- [ ] Migrate existing notification configurations
- [ ] Seed escalation rules if applicable

**Configuration:**
- [ ] SMS provider setup (API keys, credentials)
- [ ] WhatsApp provider setup
- [ ] Background job scheduler configuration
- [ ] Retry policy configuration

---

## Deployment Strategy

**Phase 1: Backend Infrastructure**
- Deploy preference models and migrations
- Deploy preference API endpoints
- Deploy services (throttling, escalation, digest)

**Phase 2: Integration**
- Integrate SMS provider
- Expand WhatsApp service for general notifications
- Integrate preference checks into notification delivery
- Set up background job processing

**Phase 3: Frontend**
- Deploy notification preferences page
- Deploy all configuration components
- Deploy channel/provider configuration UI

**Phase 4: Testing & Validation**
- Test preference configuration
- Test notification delivery with preferences
- Test SMS/WhatsApp integration
- Test digest compilation
- Test escalation rules

**Phase 5: Rollout**
- Enable for pilot users
- Monitor delivery and preferences
- Collect feedback
- General rollout

**Phase 6: Staff Training**
- Train staff on preference configuration
- Document best practices
- Setup support documentation

---

## Performance Targets

- Preference load: < 300ms
- Preference save: < 500ms
- Recipient list load (1000 users): < 500ms
- Digest compilation (10000 notifications): < 1s
- Throttling check: < 10ms
- Escalation rule check: < 20ms
- Scheduled notification query: < 200ms

---

## Monitoring & Alerting

**Key Metrics:**
- Preference configuration changes (by user, type)
- Channel selection distribution
- Digest compilation success rate
- Failed delivery retry count
- Escalation rule triggers
- Throttling triggers (how often limit reached)
- Unsubscribe rate
- Scheduled notification delivery rate

**Alerts:**
- Alert if digest compilation fails
- Alert if scheduled notification delayed > 5min
- Alert if throttling triggered frequently
- Alert if escalation rule triggered excessively
- Alert on high unsubscribe rate
- Alert on retry failures

---

## Documentation Requirements

**User Documentation:**
- Notification preferences configuration guide
- Channel setup guide (SMS, WhatsApp, Email)
- Role-based preference setup
- Department-based preference setup
- Digest configuration guide
- Do not disturb scheduling guide
- Recipient management guide
- Escalation rules setup guide
- Throttling configuration best practices
- SMS provider setup guide
- WhatsApp provider setup guide
- Troubleshooting guide

**Technical Documentation:**
- API endpoint documentation
- Database schema documentation
- Service documentation (digest, throttling, escalation)
- Preference override/inheritance logic
- Background job configuration
- SMS/WhatsApp provider integration guide
- Deployment guide

---

## Future Enhancements

**Advanced Preferences:**
- User-specific preferences (individual user overrides)
- Preference templates (save and reuse configurations)
- Preference inheritance hierarchy (global → role → department → user)
- Context-based preferences (adjust based on tenant activity)

**Behavioral Analytics:**
- Machine learning-based optimal delivery time prediction
- Engagement pattern analysis (when users open emails/messages)
- Personalized frequency recommendations
- Preference optimization suggestions

**Multi-Channel Orchestration:**
- Intelligent channel selection based on user behavior
- Fallback channel if primary fails
- Channel preference learning (track which channels user engages)
- Cross-channel conversation threading

**Advanced Scheduling:**
- Time zone-based scheduling (send in user's timezone)
- Business hours configuration (only during business hours)
- Blackout periods (holidays, maintenance windows)
- Dynamic scheduling based on user activity

**Enterprise Features:**
- Preference approval workflow
- Compliance checking (CAN-SPAM, GDPR)
- Audit logging for all preference changes
- Preference versioning and change history
- Bulk preference distribution

**Integration:**
- Preference sync with CRM systems
- Webhook triggers for preference changes
- Third-party preference management integration
- External do-not-disturb list imports
