# Notification Logs & Reporting Feature Specification
**Document ID:** 123  
**Feature Area:** Notification Management  
**Status:** Specification  
**Last Updated:** May 31, 2026

---

## Executive Summary

Notification Logs & Reporting provides comprehensive delivery status tracking, resend capabilities, and analytics enabling businesses to monitor notification delivery, troubleshoot failures, and analyze notification performance. This feature creates an audit trail of all notifications sent, tracks delivery status across channels, and provides detailed analytics and reporting capabilities.

---

## Current State Analysis

### EXISTING INFRASTRUCTURE

**Notification Model:**
- Stores in-app notifications (backend/apps/notifications/models.py)
- Fields: title, body, related_entity_type, related_entity_id, is_read, created_at
- In-app notification display (NotificationPopover)
- Mark as read tracking

**Email Service:**
- Email sending capability (backend/apps/billing/services/email_service.py)
- Sends emails successfully
- No delivery tracking
- No failure logging
- No retry mechanism

**WhatsApp Service:**
- WhatsApp receipt notifications (backend/apps/pos/services/whatsapp_service.py)
- Sends messages successfully
- No delivery tracking
- No failure logging

**Notification Views:**
- NotificationListView (retrieves in-app notifications)
- MarkNotificationReadView (marks in-app as read)
- MarkAllReadView (marks all as read)

### MISSING OR INCOMPLETE

**Delivery Logging:**
- NO delivery log storage (no model)
- NO delivery status tracking (sent, delivered, opened, failed, bounced)
- NO delivery timestamp recording
- NO error/failure reason logging
- NO delivery metrics (delivery time, bounce reason, etc.)

**Failed Notifications:**
- NO failed notification queue
- NO retry attempt tracking
- NO retry history
- NO manual resend capability
- NO dead letter queue for undeliverable messages

**Notification Status:**
- NO delivery status per notification
- NO status change history
- NO status transitions

**Email Delivery Tracking:**
- NO bounce tracking (hard/soft bounces)
- NO email open tracking
- NO email click tracking
- NO engagement metrics

**SMS/WhatsApp Delivery:**
- NO delivery reports from providers
- NO status callbacks/webhooks
- NO delivery confirmation

**Resend Functionality:**
- NO resend capability
- NO bulk resend
- NO retry logic

**Search & Filtering:**
- NO search/filter UI for notifications
- NO advanced search
- NO filters by type, status, recipient, date

**Analytics & Reporting:**
- NO analytics dashboard
- NO performance metrics
- NO trend analysis
- NO channel performance comparison
- NO notification type performance analysis
- NO scheduled reports
- NO export functionality

**Compliance & Audit:**
- NO compliance logging
- NO audit trail for regulations (GDPR, CAN-SPAM)
- NO consent tracking
- NO data retention policies

**Webhook Handling:**
- NO webhook delivery status updates
- NO webhook payload parsing
- NO webhook validation
- NO webhook retry logic

---

## Frontend Features

### Settings - Notification Logs Tab

#### Sent Notifications History

**Notifications Table:**
- Columns (responsive):
  - Date/Time (sortable, default DESC)
  - Recipient (email/phone/name)
  - Type (Order Confirmation, Invoice, etc.)
  - Subject/Title (preview text)
  - Status (badge with color)
  - Channel (Email, SMS, WhatsApp, In-app)
  - Actions

**Status Indicators (Color-Coded):**
- 🟢 Green: Delivered (successfully delivered)
- 🟡 Yellow: Pending (awaiting delivery confirmation)
- 🟠 Orange: Failed (delivery failed)
- ⚫ Gray: Sent (sent to provider, awaiting status)
- 🔵 Blue: In Transit (on way to recipient)

**Row-Level Actions:**
- View details button (opens modal)
- Resend button (if failed)
- Mark as resolved button (if failed)
- Copy recipient to clipboard button

**Filtering:**
- Type filter (multi-select dropdown):
  - Order confirmation, Invoice, Shipping, Payment, etc.
  - All types (default)
- Status filter (multi-select dropdown):
  - Sent, Delivered, Opened, Clicked, Failed, Bounced, Pending
  - All statuses (default)
- Recipient filter (text autocomplete)
- Date range filter (date pickers):
  - Preset: Last 7 days, Last 30 days, Last 90 days, Custom range
- Channel filter (multi-select):
  - Email, SMS, WhatsApp, In-app

**Sorting:**
- Sort by: Date (DESC default), Status, Type, Recipient
- Sort direction toggle (ASC/DESC)

**Search:**
- Search by recipient (email, phone, name)
- Search by subject/title (text input)
- Real-time search (as user types)

**Pagination:**
- Rows per page: 25, 50, 100 (default 50)
- Page navigation (prev, next, page number input)
- Total results count display

**View Notification Details Modal:**

**Header:**
- Recipient information:
  - Name, email, phone
  - User profile picture
- Notification type
- Date/time sent
- Close button

**Content:**
- Notification content section:
  - Subject/title (full)
  - Body/message (full, scrollable if long)
  - Attachments (if any, show list with download)

**Delivery Status Section:**
- Current status (badge)
- Status timestamp (when reached current status)
- Status message (if failed, display reason)
- Status history (timeline showing status changes):
  - Time → Status change (e.g., "2:30 PM → Delivered")

**Delivery Attempts History:**
- Table of delivery attempts:
  - Attempt #, Date/Time, Status, Error message (if failed), Duration
  - Most recent first
  - Expandable for details

**Channel & Metrics:**
- Channel used (Email/SMS/WhatsApp/In-app)
- Delivery time (seconds from sent to delivered)
- If email:
  - Opened (Yes/No, timestamp if yes)
  - Clicks (count and links clicked with timestamps)
  - Bounce (if bounced, type and reason)

**Actions Section:**
- Resend notification button (if failed)
- View full content button (full-screen)
- Export details button (download as PDF)
- Mark as resolved button (if failed, clears from failed queue)
- Print button

**Navigation:**
- Next notification button (view next in list)
- Previous notification button (view previous in list)
- Back to list button

---

#### Failed Notifications Queue

**Failed Notifications List:**
- Table columns:
  - Recipient (email/phone/name)
  - Type
  - Date
  - Failure reason (short text)
  - Retry count (X / max)
  - Next retry time (countdown or time picker)
  - Actions

**Failure Reasons Displayed:**
- "SMTP connection timeout"
- "Invalid email address"
- "Phone number invalid"
- "Delivery failed by provider"
- "Recipient unsubscribed"
- "Rate limit exceeded"
- "Attachment too large"
- "Other error (show details)"

**Filtering:**
- Filter by retry count:
  - 0 retries, 1-2 retries, 3+ retries
- Filter by time:
  - Last 24 hours, Last 7 days, Last 30 days
- Search by recipient email/phone

**Row Actions:**
- View details button
- Retry now button (green, prominent)
- Mark as not resendable button (with confirmation)
- Edit next retry time button

**Bulk Actions (Checkbox Selection):**
- Select all checkbox (header)
- Checkbox per row
- Bulk actions toolbar (appears when selected):
  - Retry selected button (retries all failed notifications)
  - Mark all as resolved button
  - Delete selected button
  - Count display: "X notifications selected"

**Auto-Retry Configuration:**
- Auto-retry toggle (enabled by default)
- Status: "Auto-retry is ON"
- Auto-retry delay configuration:
  - Retry delay input (minutes, default 5)
  - Max retry attempts (default 3)
  - Strategy (fixed, exponential)
  - Save button

**Summary Cards:**
- Failed in last 24h: [count]
- Failed in last 7d: [count]
- Pending retry: [count]
- Never tried: [count]

---

#### Notification Analytics Dashboard

**Key Metrics Cards (Top Row):**
- Total sent [period]: Count
- Delivery rate: Percentage (green if > 90%, yellow if 70-90%, red if < 70%)
- Failure rate: Percentage
- Open rate (email): Percentage (if tracked)
- Click rate (email): Percentage (if tracked)
- Bounce rate (email): Percentage

**Time Period Selector:**
- Preset: Last 7 days, Last 30 days, Last 90 days, Last year
- Custom date range selector (from/to dates)
- Apply button

**Charts & Visualizations:**

1. **Notifications Sent Trend (Line Chart):**
   - X-axis: Date (daily)
   - Y-axis: Count
   - Show last 30 days by default
   - Hover shows exact count
   - Trend line overlay

2. **Delivery Status Breakdown (Pie Chart):**
   - Segments: Delivered (green), Failed (red), Pending (yellow)
   - Percentages displayed
   - Click segment for details

3. **Channel Performance (Grouped Bar Chart):**
   - X-axis: Channels (Email, SMS, WhatsApp, In-app)
   - Y-axis: Count or percentage
   - Bars: Sent, Delivered, Failed
   - Legend with colors

4. **Top Notification Types (Horizontal Bar Chart):**
   - Y-axis: Notification types (by volume)
   - X-axis: Count
   - Top 10 by default
   - Sorted by count (descending)

5. **Failure Reasons Breakdown (Pie/Donut Chart):**
   - Segments: Top 5-6 failure reasons
   - "Other" segment for remaining
   - Percentages and counts

6. **Delivery Time Distribution (Histogram):**
   - X-axis: Delivery time (seconds, bucketed: 0-1s, 1-5s, 5-10s, 10-30s, 30s+)
   - Y-axis: Count of notifications
   - Shows performance distribution

7. **Open/Click Rates Trend (Line Chart):**
   - X-axis: Date
   - Y-axis: Percentage
   - Two lines: Opens, Clicks
   - Shows email engagement trends

**Advanced Analytics Section (Expandable):**

**Email Bounce Analysis:**
- Hard bounce count (invalid address)
- Soft bounce count (temporary failure, mailbox full)
- Bounce rate percentage
- Top bounce reasons
- Affected recipients count

**Recipient Engagement:**
- Active recipients (opened at least one email): Count
- Engaged recipients (opened and clicked): Count
- Inactive recipients (never opened): Count
- Engagement score average (0-100)

**Notification Type Performance:**
- For each type: sent, delivered, failure rate, open rate, click rate
- Table sortable by each metric
- Color coding for performance

**Channel Effectiveness Comparison:**
- Email: avg delivery time, bounce rate, open rate
- SMS: delivery time, failure rate
- WhatsApp: delivery status rate
- In-app: read rate
- Comparison visualization

**Time of Day Analysis (Heatmap):**
- X-axis: Hour (0-23)
- Y-axis: Day of week (Mon-Sun)
- Color intensity: Email opens or clicks
- Shows optimal send times

**Device Analytics (if email tracking enabled):**
- Desktop, Mobile, Tablet breakdown
- Open rate by device
- Click rate by device

**Period Comparison:**
- Compare this period with previous period
- Metrics table showing:
  - Metric, This period, Previous period, Change (%), Trend (↑/↓)
  - Green for improvement, red for decline

---

#### Notification Compliance Logs

**Compliance Records Table:**
- Columns: Date/Time, Action, Recipient (email), Notification Type, Status, Compliance action

**Actions Tracked:**
- Notification sent
- Notification bounced
- User unsubscribed
- User re-subscribed
- Consent given/withdrawn
- Email link clicked (for audit)

**Filters:**
- Action filter (multi-select)
- Recipient filter
- Date range
- Compliance status

**Export:**
- Export button (download as CSV)
- Useful for regulatory compliance reporting

---

#### Search & Filtering

**Advanced Search Page:**
- Search form with multiple fields:

**Notification Type:**
- Multi-select dropdown
- All types (default)
- Checkboxes for each type

**Recipient Search:**
- Text input (email, phone, or name)
- Autocomplete as user types
- Recent recipients displayed

**Date Range:**
- From date picker
- To date picker
- Preset buttons (Last 7d, Last 30d, etc.)

**Status Multi-Select:**
- Checkboxes: Sent, Delivered, Opened, Clicked, Failed, Bounced, Pending
- All (default)

**Channel Multi-Select:**
- Checkboxes: Email, SMS, WhatsApp, In-app
- All (default)

**Content Search:**
- Text input to search in subject/body
- Search button

**Advanced Options (Expandable):**
- Sent by (user) filter
- Delivery time range (seconds)
- Only failed notifications checkbox
- Only high-priority notifications checkbox

**Search Button:**
- Executes search
- Results displayed in table below
- Results count displayed

**Results Display:**
- Same table format as sent notifications history
- All filters/sorting from history available
- Export results button
- Save search preset button (name and save)

**Saved Search Presets:**
- Dropdown showing saved searches
- Load preset button
- Delete preset button
- Clear filters button

---

#### Notification Export

**Export Options Form:**

**Date Range:**
- From date picker (required)
- To date picker (required)
- Validation: From ≤ To

**Format Selector (Radio Buttons):**
- CSV (spreadsheet compatible)
- PDF (formatted report)
- JSON (structured data)

**Fields to Include (Multi-Select Checkboxes):**
- All (checkbox to select all)
- Date/Time
- Recipient (email, name, phone)
- Notification type
- Subject
- Status
- Channel
- Delivery time
- Open status
- Click count
- Bounce info
- Error message (if failed)

**Additional Options:**
- Include detailed content checkbox (full message body)
- Include delivery attempts history checkbox

**Export Button:**
- Validates date range and format
- Starts export (may show progress if large)
- Downloads file (filename: notifications_export_[date]_[time].[ext])

---

#### Scheduled Reports

**Reports List:**

**Predefined Report Types:**
- Daily summary report (morning brief)
- Weekly summary report (Monday morning)
- Monthly summary report (first of month)
- Custom reports (user-defined)

**Reports Table:**
- Columns: Report name, Frequency, Last sent, Next scheduled, Status (enabled/disabled), Actions

**Status Indicators:**
- ✓ Enabled
- ✗ Disabled

**Row Actions:**
- View previous reports button (dropdown of past reports with dates)
- Edit report button
- Delete report button (with confirmation)
- Send now button (send immediately)
- Enable/disable toggle

**Create New Report Button:**
- Opens form (or navigates to create page)

---

**Create/Edit Scheduled Report Form:**

**Basic Information:**
- Report name (text input, required)
- Report description (textarea, optional)

**Schedule Configuration:**
- Frequency selector (radio buttons):
  - Daily (need time)
  - Weekly (need day and time)
  - Monthly (need day and time)
  - Custom (cron expression, optional)

**Time Selectors:**
- Time (HH:MM, 24-hour format)
  - Hidden until frequency selected
- Day of week (if weekly)
  - Dropdown or checkboxes (Mon-Sun)
- Day of month (if monthly)
  - Dropdown (1-31)
  - Validation: Feb doesn't have 31st

**Report Content (Multi-Select Checkboxes):**
- Include delivery metrics toggle
  - Total sent, delivery rate, failure rate, pending count
- Include engagement metrics toggle
  - Open rate, click rate, bounce rate (if email)
- Include bounce analysis toggle
  - Hard bounce, soft bounce, top reasons
- Include channel performance toggle
  - Performance by channel (email, SMS, WhatsApp)
- Include notification type performance toggle
  - Metrics by notification type
- Include top failures toggle
  - List of most common failures
- Include recipient engagement toggle
  - Active vs inactive recipients

**Report Recipients (Multi-Select):**
- User selector (multi-select dropdown)
- Search by user name/email
- Selected recipients displayed as chips/tags
- Add button
- Remove button per recipient

**Email Configuration:**
- Email recipients from above
- Include charts toggle (include visualizations)
- Include detailed data toggle (include tables)
- Report format selector:
  - HTML (formatted email)
  - PDF attachment
  - CSV attachment

**Advanced Options (Expandable):**
- Filter data by tenant (if multi-tenant admin)
- Filter by notification type (if wanted)
- Filter by channel (if wanted)
- Timezone for time calculations (if multi-timezone)

**Save Report Button:**
- Saves report configuration
- Enables scheduling
- Confirmation: "Report created. First report will be sent on [date]"

**Test Report Button:**
- Sends test report immediately to creator
- No schedule change
- "Test report sent to [email]"

**Delete Report Button:**
- Confirmation: "Delete this report?"
- Stops future scheduled sends
- Delete button (confirms)

---

## Backend API Requirements

### Notification Logs

**GET /api/notifications/logs/**
- Query parameters:
  - type: notification type filter (optional, comma-separated)
  - status: delivery status filter (optional, comma-separated)
  - recipient: recipient email/phone (optional)
  - date_from: start date (optional, ISO format)
  - date_to: end date (optional)
  - channel: channel filter (optional, comma-separated)
  - limit: results per page (default 50, max 500)
  - offset: pagination offset (default 0)
  - order_by: sort field (created_at, status, type, default: created_at DESC)

- Response:
  ```json
  {
    "count": 5250,
    "next": "...",
    "previous": "...",
    "results": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "recipient_id": "uuid",
        "recipient_email": "user@example.com",
        "recipient_phone": "+1234567890",
        "recipient_name": "John Doe",
        "notification_type": "order_confirmation",
        "subject": "Order #ORD-123 Confirmed",
        "status": "delivered",
        "channel": "email",
        "sent_at": "2026-05-31T14:30:00Z",
        "delivered_at": "2026-05-31T14:30:15Z",
        "opened_at": "2026-05-31T14:35:00Z",
        "clicked_at": "2026-05-31T14:35:30Z",
        "delivery_time_seconds": 15,
        "failure_reason": null,
        "bounce_type": null,
        "bounce_reason": null
      }
    ]
  }
  ```

**GET /api/notifications/logs/{id}/**
- Response: Complete log entry with all fields and delivery attempts history
- Status code: 200 OK

**POST /api/notifications/logs/{id}/resend/**
- Resend failed notification
- Request body: (empty or optional sample_data)
- Response:
  ```json
  {
    "success": true,
    "new_attempt_id": "uuid",
    "scheduled_for": "2026-05-31T14:35:00Z"
  }
  ```
- Status code: 200 OK

**POST /api/notifications/logs/bulk-resend/**
- Resend multiple failed notifications
- Request body:
  ```json
  {
    "notification_ids": ["uuid1", "uuid2", "uuid3"]
  }
  ```
- Response:
  ```json
  {
    "requeued_count": 3,
    "failures": []
  }
  ```
- Status code: 200 OK

---

### Failed Notifications

**GET /api/notifications/failed/**
- Query params:
  - retry_count: filter by retry count (optional, comma-separated: 0,1-2,3+)
  - days: filter by days (7, 30, 90 default: all)
  - search: search by recipient
  - limit, offset
- Response:
  ```json
  {
    "count": 125,
    "results": [
      {
        "id": "uuid",
        "log_id": "uuid",
        "recipient": "user@example.com",
        "notification_type": "invoice",
        "failure_reason": "SMTP timeout",
        "retry_count": 2,
        "max_retries": 3,
        "next_retry_at": "2026-05-31T15:00:00Z",
        "last_error": "Connection timed out after 30s"
      }
    ]
  }
  ```

**PATCH /api/notifications/failed/{id}/mark-resolved/**
- Mark failed notification as resolved (stop retrying)
- Request body: (empty)
- Response: { "success": true }
- Status code: 200 OK

**PATCH /api/notifications/failed/{id}/retry-now/**
- Retry immediately (don't wait for schedule)
- Request body: (empty)
- Response: { "success": true, "retry_scheduled": true }
- Status code: 200 OK

---

### Notification Analytics

**GET /api/notifications/analytics/**
- Query params:
  - date_from, date_to (ISO format)
  - type: notification type filter (optional)
  - channel: channel filter (optional)
  - recipient_segment: role/department filter (optional)
- Response:
  ```json
  {
    "period": {
      "start": "2026-05-01",
      "end": "2026-05-31"
    },
    "total_sent": 12500,
    "delivery_rate": 0.96,
    "failure_rate": 0.02,
    "pending_rate": 0.02,
    "open_rate": 0.45,
    "click_rate": 0.12,
    "bounce_rate": 0.01,
    "avg_delivery_time_seconds": 8,
    "trends": {
      "sent": [
        {"date": "2026-05-01", "count": 400},
        {"date": "2026-05-02", "count": 425}
      ]
    }
  }
  ```

**GET /api/notifications/analytics/channel-comparison/**
- Response:
  ```json
  {
    "email": {
      "sent": 8000,
      "delivered": 7700,
      "delivery_rate": 0.96,
      "open_rate": 0.45,
      "bounce_rate": 0.02,
      "avg_delivery_time": 5
    },
    "sms": {...},
    "whatsapp": {...},
    "inapp": {...}
  }
  ```

**GET /api/notifications/analytics/failure-reasons/**
- Response:
  ```json
  [
    {
      "reason": "Invalid email address",
      "count": 125,
      "percentage": 0.45
    },
    {
      "reason": "SMTP timeout",
      "count": 100,
      "percentage": 0.36
    }
  ]
  ```

**GET /api/notifications/analytics/type-performance/**
- Response:
  ```json
  {
    "order_confirmation": {
      "sent": 2500,
      "delivered": 2400,
      "open_rate": 0.55,
      "failure_rate": 0.02
    }
  }
  ```

---

### Search & Export

**GET /api/notifications/logs/search/**
- Advanced search endpoint
- Query params: query, type, status, date_from, date_to, channel, content
- Response: Filtered notification logs (same format as GET /api/notifications/logs/)

**POST /api/notifications/logs/export/**
- Export notifications
- Request body:
  ```json
  {
    "date_from": "2026-05-01",
    "date_to": "2026-05-31",
    "format": "csv",
    "fields": ["date", "recipient", "type", "status", "channel"],
    "include_content": false
  }
  ```
- Response: File download (stream)
- Content-Type: application/csv, application/pdf, or application/json
- Content-Disposition: attachment; filename=...

---

### Compliance Logs

**GET /api/notifications/logs/compliance/**
- Query params: action, recipient, date_from, date_to, limit, offset
- Response:
  ```json
  [
    {
      "id": "uuid",
      "date": "2026-05-31T14:30:00Z",
      "action": "sent",
      "recipient_email": "user@example.com",
      "notification_type": "order",
      "status": "delivered",
      "compliance_note": "Consent on file, GDPR compliant"
    }
  ]
  ```

---

### Scheduled Reports

**POST /api/notifications/reports/**
- Create scheduled report
- Request body:
  ```json
  {
    "name": "Daily Summary",
    "frequency": "daily",
    "time": "09:00",
    "day_of_week": null,
    "day_of_month": null,
    "recipients": ["user_id_1", "user_id_2"],
    "report_config": {
      "include_delivery_metrics": true,
      "include_engagement_metrics": true,
      "include_channel_performance": true
    },
    "enabled": true
  }
  ```
- Response: Created report object
- Status code: 201 Created

**GET /api/notifications/reports/**
- Query params: limit, offset, enabled
- Response: List of scheduled reports
- Status code: 200 OK

**PATCH /api/notifications/reports/{id}/**
- Update report configuration
- Request body: Partial update
- Response: Updated report

**DELETE /api/notifications/reports/{id}/**
- Delete scheduled report
- Response: { "success": true }

**POST /api/notifications/reports/{id}/send-now/**
- Send report immediately
- Request body: (empty)
- Response:
  ```json
  {
    "success": true,
    "sent_to": ["user@example.com"],
    "timestamp": "2026-05-31T14:30:00Z"
  }
  ```

**GET /api/notifications/reports/{id}/previous/**
- Get previously generated reports
- Query params: limit, offset
- Response: List of past report generations with dates and download URLs

---

### Webhook Handlers

**POST /api/webhooks/notification-delivery/**
- Webhook handler for delivery status updates from email/SMS providers
- Request body (varies by provider):
  ```json
  {
    "notification_id": "uuid",
    "status": "delivered",
    "timestamp": "2026-05-31T14:30:15Z",
    "delivery_time_ms": 150,
    "bounce_type": null,
    "bounce_reason": null,
    "error_code": null,
    "error_message": null
  }
  ```
- Response: { "success": true }
- Status code: 200 OK

**POST /api/webhooks/email-engagement/**
- Track email opens and clicks
- Request body:
  ```json
  {
    "notification_id": "uuid",
    "action": "open",
    "timestamp": "2026-05-31T14:35:00Z",
    "user_agent": "...",
    "ip_address": "..."
  }
  ```
- Response: { "success": true }

---

## Database Requirements

### Core Models

**NotificationLog:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- notification_id: UUID (foreign key, indexed)
- recipient_id: UUID (foreign key, indexed)
- recipient_email: VARCHAR(255) (indexed)
- recipient_phone: VARCHAR(20)
- recipient_name: VARCHAR(255)
- notification_type: VARCHAR(100) (indexed)
- subject: VARCHAR(500)
- body: TEXT (optional, may be stored separately)
- channel: ENUM(email, sms, whatsapp, inapp) (indexed)
- status: ENUM(sent, delivered, opened, clicked, failed, bounced, pending) (indexed)
- sent_at: DATETIME (indexed)
- delivered_at: DATETIME (nullable)
- opened_at: DATETIME (nullable, email only)
- clicked_at: DATETIME (nullable, email only)
- delivery_time_seconds: INTEGER (calculated)
- failure_reason: VARCHAR(500) (nullable)
- bounce_type: ENUM(hard, soft) (nullable)
- bounce_reason: VARCHAR(500) (nullable)
- error_code: VARCHAR(50) (nullable)
- error_message: TEXT (nullable)
- created_at: DATETIME
- updated_at: DATETIME
- Indexes:
  - (tenant_id, created_at DESC)
  - (tenant_id, status, created_at DESC)
  - (recipient_id, created_at DESC)
  - (notification_type, created_at DESC)
  - (channel, created_at DESC)

**NotificationDeliveryAttempt:**
- id: UUID (primary key)
- log_id: UUID (foreign key, indexed)
- attempt_number: INTEGER
- sent_at: DATETIME
- status: VARCHAR(50)
- response_code: VARCHAR(50) (nullable)
- error_message: TEXT (nullable)
- delivery_time_ms: INTEGER (nullable)
- next_retry_at: DATETIME (nullable)
- created_at: DATETIME
- Indexes:
  - (log_id, attempt_number DESC)

**NotificationMetric:**
- id: UUID (primary key)
- log_id: UUID (foreign key, unique)
- open_count: INTEGER (default 0)
- unique_opens: INTEGER (default 0)
- click_count: INTEGER (default 0)
- unique_clicks: INTEGER (default 0)
- bounce_type: VARCHAR(20) (nullable)
- delivery_time_seconds: INTEGER
- created_at: DATETIME
- updated_at: DATETIME

**NotificationEngagement:**
- id: UUID (primary key)
- log_id: UUID (foreign key, indexed)
- action_type: ENUM(open, click, bounce)
- timestamp: DATETIME (indexed)
- ip_address: VARCHAR(50) (nullable, for privacy)
- user_agent: TEXT (nullable)
- link_clicked: VARCHAR(500) (nullable, if click)
- created_at: DATETIME
- Indexes:
  - (log_id, action_type, timestamp DESC)

**ScheduledNotificationReport:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- name: VARCHAR(255)
- description: TEXT (nullable)
- frequency: ENUM(daily, weekly, monthly, custom)
- time: TIME (HH:MM)
- day_of_week: VARCHAR(10) (nullable, for weekly)
- day_of_month: INTEGER (nullable, for monthly)
- cron_expression: VARCHAR(100) (nullable, for custom)
- recipients: JSONB array (user IDs)
- report_config: JSONB (sections to include)
- email_format: ENUM(html, pdf, csv)
- enabled: BOOLEAN (default true)
- last_sent_at: DATETIME (nullable)
- next_scheduled_at: DATETIME
- created_at: DATETIME
- updated_at: DATETIME
- Indexes:
  - (tenant_id, enabled)
  - (next_scheduled_at) - for scheduler

**ReportGeneration:**
- id: UUID (primary key)
- report_id: UUID (foreign key, indexed)
- generated_at: DATETIME
- sent_to: JSONB array (recipients)
- report_data: TEXT or JSONB (serialized report)
- status: ENUM(generated, sent, failed)
- file_path: VARCHAR(500) (nullable, if stored)
- created_at: DATETIME
- Indexes:
  - (report_id, generated_at DESC)

**ComplianceLog:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- notification_log_id: UUID (foreign key, indexed, nullable)
- action: VARCHAR(100)
- recipient_email: VARCHAR(255)
- notification_type: VARCHAR(100)
- timestamp: DATETIME (indexed)
- reason: TEXT (nullable)
- compliance_note: TEXT
- created_at: DATETIME
- Indexes:
  - (tenant_id, timestamp DESC)
  - (recipient_email, timestamp DESC)

---

## Current Implementation Status

### NOT IMPLEMENTED
- ✗ NotificationLog model (no delivery tracking)
- ✗ NotificationDeliveryAttempt model (no retry history)
- ✗ Notification delivery logging service
- ✗ Failed notifications queue
- ✗ Resend functionality
- ✗ Analytics dashboard
- ✗ Search/filtering UI
- ✗ Export functionality
- ✗ Compliance logs
- ✗ Scheduled reports
- ✗ Webhook delivery status handlers
- ✗ Engagement tracking (opens/clicks)
- ✗ Bounce handling
- ✗ Logs and reporting UI

### PARTIALLY IMPLEMENTED
- Email sending (works, but not logged)
- WhatsApp sending (works, but not logged)
- In-app notification storage (only in-app, not other channels)

### FULLY IMPLEMENTED
- Basic notification model
- Tenant isolation

---

## Validation & Edge Cases

**Delivery Status Transitions:**
- Status can only move forward: sent → delivered/failed
- Failed cannot become delivered (separate retry attempt)
- Pending transitions to sent/delivered/failed
- Bounced is final (no retry)

**Delivery Attempts:**
- Attempt tracking immutable (audit trail)
- Each attempt records time, status, error
- Retry count must not exceed max retries
- Backoff delays must be respected

**Resend Logic:**
- Can only resend failed notifications
- Manual resend by admin possible
- Resend creates new delivery attempt
- Max resend attempts enforced

**Bounce Handling:**
- Hard bounce: stop sending to address
- Soft bounce: retry up to N times, then stop
- Bounce must be honored (add to unsubscribe list)

**Email Engagement Tracking:**
- Open tracking only if user allows pixels
- Click tracking only for links in template
- Engagement data privacy-compliant
- GDPR-compliant (no tracking without consent)

**Report Scheduling:**
- Reports scheduled at correct time
- Timezone handling consistent
- Report generation idempotent (same day = same report)
- Previous reports archived, not deleted

**Compliance Logging:**
- All actions logged for audit
- Immutable compliance logs (tamper-proof)
- Retention policies enforced
- GDPR/CAN-SPAM compliance

**Analytics Calculations:**
- Aggregations efficient (use database, not app)
- Accurate rate calculations (denominator validation)
- Missing data handling (null vs 0)
- Timezone considerations for time-based analytics

---

## Testing Checklist

**Delivery Logging:**
- [ ] Notification log created on send
- [ ] Delivery status updated correctly
- [ ] Delivery time calculated correctly
- [ ] Error messages logged on failure
- [ ] Bounce information recorded

**Resend Functionality:**
- [ ] Failed notifications can be resent
- [ ] Resend creates new attempt entry
- [ ] Max resend attempts enforced
- [ ] Bulk resend works
- [ ] Resend limits throttling

**Failed Notifications Queue:**
- [ ] Failed notifications appear in queue
- [ ] Retry attempts tracked
- [ ] Auto-retry works
- [ ] Manual retry works
- [ ] Failed notification resolved correctly

**Search & Filtering:**
- [ ] Filter by type works
- [ ] Filter by status works
- [ ] Filter by recipient works
- [ ] Date range filter works
- [ ] Search by content works
- [ ] Pagination works
- [ ] Sorting works

**Analytics:**
- [ ] Delivery rate calculated correctly
- [ ] Failure rate calculated correctly
- [ ] Open rate calculated correctly (if tracked)
- [ ] Click rate calculated correctly (if tracked)
- [ ] Charts render correctly
- [ ] Trend analysis accurate
- [ ] Channel comparison accurate
- [ ] Failure reason breakdown accurate
- [ ] Period comparison works

**Export:**
- [ ] CSV export works
- [ ] PDF export works
- [ ] JSON export works
- [ ] Filename generated correctly
- [ ] All selected fields included
- [ ] Format parseable by applications

**Scheduled Reports:**
- [ ] Report scheduled for correct time
- [ ] Report generated at scheduled time
- [ ] Report sent to correct recipients
- [ ] Report content accurate
- [ ] Report format correct (HTML/PDF/CSV)
- [ ] Previous reports archived
- [ ] Enable/disable toggle works
- [ ] Test send works

**Compliance Logs:**
- [ ] Actions logged
- [ ] Compliance notes recorded
- [ ] Export for compliance available
- [ ] Retention policies respected

**Webhook Integration:**
- [ ] Webhook delivery status updates log
- [ ] Webhook bounce handling works
- [ ] Webhook validation prevents spoofing
- [ ] Webhook retries on failure

**UI/UX:**
- [ ] Mobile responsive
- [ ] All tables responsive
- [ ] Modal displays correctly
- [ ] Charts load and render
- [ ] Filtering intuitive
- [ ] Search responsive
- [ ] Export button works
- [ ] Print functionality works

---

## Implementation Checklist

**Backend Models:**
- [ ] Create NotificationLog model
- [ ] Create NotificationDeliveryAttempt model
- [ ] Create NotificationMetric model
- [ ] Create NotificationEngagement model
- [ ] Create ScheduledNotificationReport model
- [ ] Create ReportGeneration model
- [ ] Create ComplianceLog model
- [ ] Database migrations
- [ ] Create all indexes

**Backend Services:**
- [ ] Logging service (on notification send)
- [ ] Delivery status update service
- [ ] Failed notification tracking service
- [ ] Resend service
- [ ] Analytics calculation service
- [ ] Report generation service
- [ ] Report scheduling service (background task)
- [ ] Webhook handler for delivery status
- [ ] Webhook handler for engagement
- [ ] Bounce handling service
- [ ] Compliance logging service

**Backend API:**
- [ ] GET /api/notifications/logs/
- [ ] GET /api/notifications/logs/{id}/
- [ ] POST /api/notifications/logs/{id}/resend/
- [ ] POST /api/notifications/logs/bulk-resend/
- [ ] GET /api/notifications/failed/
- [ ] PATCH /api/notifications/failed/{id}/mark-resolved/
- [ ] PATCH /api/notifications/failed/{id}/retry-now/
- [ ] GET /api/notifications/analytics/
- [ ] GET /api/notifications/analytics/channel-comparison/
- [ ] GET /api/notifications/analytics/failure-reasons/
- [ ] GET /api/notifications/analytics/type-performance/
- [ ] GET /api/notifications/logs/search/
- [ ] POST /api/notifications/logs/export/
- [ ] GET /api/notifications/logs/compliance/
- [ ] POST /api/notifications/reports/
- [ ] GET /api/notifications/reports/
- [ ] PATCH /api/notifications/reports/{id}/
- [ ] DELETE /api/notifications/reports/{id}/
- [ ] POST /api/notifications/reports/{id}/send-now/
- [ ] GET /api/notifications/reports/{id}/previous/
- [ ] POST /api/webhooks/notification-delivery/
- [ ] POST /api/webhooks/email-engagement/

**Frontend Components:**
- [ ] Notification logs page
- [ ] Logs table component (with filtering, sorting, pagination)
- [ ] Log detail modal
- [ ] Failed notifications queue component
- [ ] Analytics dashboard component
- [ ] Charts (line, pie, bar, histogram)
- [ ] Advanced analytics section
- [ ] Compliance logs component
- [ ] Search page component
- [ ] Export form component
- [ ] Scheduled reports list component
- [ ] Report creation/edit form component
- [ ] Report results display component

**Frontend Pages:**
- [ ] Settings - Notification Logs tab
- [ ] Settings - Notification Analytics tab
- [ ] Settings - Notification Reports tab

**Integration:**
- [ ] Email provider webhook integration (Resend, SendGrid, etc.)
- [ ] SMS provider webhook integration (Twilio, etc.)
- [ ] WhatsApp provider webhook integration
- [ ] Notification delivery logging in sending code
- [ ] Logging on all notification send attempts
- [ ] Error/failure capture and logging
- [ ] Bounce list management

**Background Jobs:**
- [ ] Report scheduler (cron/APScheduler)
- [ ] Report generator job
- [ ] Report email sender job
- [ ] Retry processor job (process failed notifications)
- [ ] Analytics aggregator job (if needed for performance)

**Data:**
- [ ] Seed default report templates
- [ ] Set up retention policies
- [ ] Configure webhook endpoints
- [ ] Set up monitoring/alerting

---

## Deployment Strategy

**Phase 1: Backend Infrastructure**
- Deploy notification log models and migrations
- Deploy logging service and integrate with notification sending
- Deploy delivery status tracking
- Configure webhook endpoints

**Phase 2: Delivery Tracking**
- Deploy failed notification queue
- Deploy resend service and API
- Deploy retry processing background job
- Integrate with email/SMS providers

**Phase 3: Analytics**
- Deploy analytics calculation service
- Deploy API endpoints
- Test analytics accuracy

**Phase 4: Reporting**
- Deploy scheduled report models
- Deploy report generation service
- Deploy report scheduler background job
- Deploy API endpoints

**Phase 5: Frontend - Logs & Reporting**
- Deploy notification logs page
- Deploy analytics dashboard
- Deploy reports management
- Deploy search/export UI

**Phase 6: Testing & Validation**
- Test delivery logging
- Test failed notification queue
- Test resend functionality
- Test analytics calculations
- Test report generation and delivery
- Test webhook integrations
- Verify compliance logging

**Phase 7: Rollout & Training**
- Enable for pilot users
- Monitor delivery tracking accuracy
- Train staff on new features
- Document best practices
- General rollout

---

## Performance Targets

- Log entry creation: < 50ms
- Log retrieval (10000 records): < 500ms
- Failed queue query: < 200ms
- Analytics calculation (30 days): < 2s
- Report generation: < 3s
- Export (10000 records): < 5s
- Search (1000 records): < 300ms
- Webhook processing: < 200ms

---

## Monitoring & Alerting

**Key Metrics:**
- Delivery rate (target: > 98%)
- Failure rate (alert if > 2%)
- Failed queue size (alert if > 1000)
- Average delivery time (target: < 30s)
- Bounce rate (alert if > 1%)
- Webhook processing latency
- Report generation duration
- Failed webhook deliveries

**Alerts:**
- Alert if delivery rate drops below 95%
- Alert if failure rate exceeds 5%
- Alert if failed queue size > 5000
- Alert if webhook delivery fails
- Alert if report generation takes > 5s
- Alert on high bounce rate
- Alert on delivery service outage

**Dashboards:**
- Delivery status dashboard (real-time)
- Analytics dashboard (daily summaries)
- Failed notifications dashboard (current queue)
- Report processing dashboard (execution status)
- Webhook delivery status dashboard

---

## Documentation Requirements

**User Documentation:**
- Notification logs user guide
- How to view notification history
- How to resend failed notifications
- Analytics interpretation guide
- Report configuration guide
- How to export notification data
- Compliance reporting guide
- Troubleshooting failed notifications guide

**Technical Documentation:**
- API endpoint documentation
- Database schema documentation
- Webhook integration guide
- Delivery status flow documentation
- Logging service documentation
- Report generation process documentation
- Deployment guide
- Monitoring and alerting setup guide

---

## Future Enhancements

**Advanced Analytics:**
- AI-powered anomaly detection (unusual delivery failures)
- Predictive analytics (predict delivery success)
- Machine learning for optimal send times
- Attribution analytics (which notifications drive conversions)
- Cohort analysis (segment recipients by behavior)

**Real-Time Monitoring:**
- Real-time delivery status websocket
- Live dashboard updates
- Real-time alerts for critical issues
- Live failure notifications

**Engagement Analytics:**
- Advanced click tracking
- Conversion tracking (clicks → purchases)
- A/B test analytics
- Device-specific analytics
- Geographic analytics

**Advanced Reporting:**
- Custom report builder
- Report templates
- Scheduled report templates
- Comparative reporting (period-over-period)
- Drill-down reporting

**Automation:**
- Automated remediation (auto-resend after delay)
- Automated alerts (escalation, on-call notifications)
- Automated report distribution
- Automated compliance reporting

**Integration:**
- Business intelligence tool integrations
- Data warehouse integration
- Third-party analytics integration
- CRM integration

**User Experience:**
- Mobile app for log monitoring
- Notification alerts on critical failures
- Slackbot for delivery status
- Email digests of key metrics
