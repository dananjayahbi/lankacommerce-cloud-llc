# Feature 125: Tenant Subscription & Billing Management

## Executive Summary

Tenant Subscription & Billing Management provides comprehensive plan management, subscription lifecycle management, pricing configuration, and billing operations enabling robust subscription and revenue management across all tenant instances. This feature enables super admins to configure subscription plans, manage tenant subscriptions, process billing operations, and gain visibility into revenue metrics and customer financial health.

## Current State Analysis

### EXISTING INFRASTRUCTURE

- **Plan Model**: SubscriptionPlan with name, price, features, is_active, sort_order fields
- **Subscription Model**: Status (TRIAL/ACTIVE/CANCELLED), trial_ends_at, current_period tracking
- **Subscription Service**: create_trial_subscription, get_subscription_for_tenant, log_subscription_event methods
- **Invoice Model**: Tracking billing records
- **Subscription Plan Serializer**: API serialization
- **Plans Management Page**: SuperAdmin interface (basic)
- **Metrics View**: Basic tracking infrastructure
- **MRR Page**: Monthly Recurring Revenue display (basic)

### MISSING (Partially Implemented or Incomplete)

- Plan creation/editing UI in admin (NOT in current admin, only system setup)
- Plan feature configuration UI (features not fully configurable)
- Plan pricing management UI (pricing not editable in admin)
- Plan trial period configuration UI
- Plan tier management (basic, premium, enterprise levels)
- Plan migration/upgrade/downgrade workflow in admin view (exists in store)
- Subscription lifecycle visualization (status flow diagram)
- Subscription cancellation workflow (basic exists, needs UI)
- Subscription pause/resume functionality (NOT implemented)
- Billing invoice management dashboard (NOT comprehensive)
- Invoice collection/payment tracking (basic exists)
- Invoice retry on failed payment (NOT implemented)
- Refund processing workflow (NOT in admin UI)
- Subscription event logging (partial, not visible in admin)
- Payment method management per subscription (NOT in admin)
- Dunning (payment retry) configuration (NOT implemented)
- Revenue recognition tracking (NOT implemented)
- MRR (Monthly Recurring Revenue) dashboard details (page exists, needs expansion)
- ARR (Annual Recurring Revenue) calculation (NOT visible)
- Churn analysis (NOT implemented)
- Expansion revenue tracking (NOT calculated)
- Customer lifetime value tracking (NOT implemented)
- Subscription metrics dashboard (NOT comprehensive)
- Cohort analysis (NOT implemented)
- Usage-based billing (NOT implemented)
- Seat-based pricing adjustments (NOT implemented)
- Discount/coupon application per subscription (NOT implemented in admin)
- Custom pricing per tenant (NOT for admin view)
- Plan variant management (NOT implemented)
- Proration calculation for mid-cycle changes (NOT visible)
- Failed payment retry queue (NOT visible)
- Billing analytics dashboard (NOT comprehensive)
- Plan change request workflows (NOT in admin)

## Frontend Features

### SuperAdmin Dashboard - Subscription & Billing Tab (Enhancement)

#### Subscription Management Overview

**Key Metrics Cards**:
- MRR (Monthly Recurring Revenue) - Total current
- ARR (Annual Recurring Revenue) - Calculated total
- Active subscriptions count
- Churned subscriptions this month (count)
- Expansion revenue this month (count)
- Net Revenue Retention (NRR) percentage
- Average subscription value

#### Subscriptions List

**Table Columns**:
- Tenant name (sortable, searchable)
- Current plan (sortable, filterable)
- Subscription status (filterable badge)
- Monthly price (sortable)
- Annual value (calculated, sortable)
- Start date (sortable)
- Next billing date (sortable)
- Trial end date (if applicable, sortable)
- Actions (view details, change plan, cancel, pause)

**Filter Options**:
- Filter by plan (dropdown)
- Filter by status (checkboxes: active, trial, cancelled, paused, pending)
- Filter by billing date range (start date, renewal date)
- Filter by subscription age (new, established, at-risk)
- Filter by MRR range (slider)

**Search Functionality**:
- Search by tenant name (live search)
- Advanced search button (by subscription ID, email)

**Sort Options**:
- By tenant name (A-Z, Z-A)
- By plan (alphabetical)
- By monthly price (low to high, high to low)
- By start date (newest, oldest)
- By next billing date (soonest, latest)
- By status (custom order)

**Bulk Actions**:
- Select multiple subscriptions (checkbox column)
- Bulk cancel button (with confirmation)
- Bulk pause button (with confirmation)
- Bulk email button (send to all admins)
- Bulk export button

**Row Actions**:
- View details button → Opens subscription detail modal
- Edit subscription button → Opens edit form
- Change plan button → Opens plan change modal
- Pause subscription button (if active)
- Resume subscription button (if paused)
- Cancel subscription button
- Send invoice reminder button
- Apply coupon button

**Pagination**:
- Items per page selector (10, 25, 50, 100)
- Current page indicator
- Total records display

#### Subscription Detail View

**Header**:
- Tenant name and ID
- Current plan badge
- Subscription status badge (color-coded)
- Quick actions: Edit, Change Plan, Cancel

**Subscription Information Tab**:

Subscription Timeline:
- Start date
- Current period start date
- Current period end date
- Next billing date (highlighted if upcoming)
- Trial end date (if trial)
- Cancellation date (if cancelled)

Plan Details:
- Plan name (linked to plan details)
- Plan tier (basic, premium, enterprise)
- Features included (list of key features)
- Seat count (if seat-based, current count)
- Usage limits summary

Pricing Information:
- Monthly subscription price
- Annual price (if applicable)
- Annual value calculation
- Discount amount (if applied)
- Discount code (if applied, with remove option)
- Total amount paid to date
- Total amount owed (if any)

**Usage Tab**:
- Current usage vs limits:
  - Users: X / Y limit
  - Storage: X GB / Y GB limit
  - API calls: X / Y limit this month
- Usage trend indicators (trending up/down)
- Usage warning indicators (if approaching limits)

**Payment History Tab**:

Invoices Table:
- Invoice number (sortable, linked to invoice detail)
- Amount (sortable)
- Date (sortable)
- Status (paid, pending, overdue, refunded)
- Payment method used
- Actions (view, download, send reminder)

Status Filters:
- All, Paid, Pending, Overdue, Refunded

Additional Features:
- Total paid display
- Total outstanding display
- Total overdue display

**Subscription Actions Tab**:

Plan Management:
- Upgrade plan button → Opens plan selector modal
- Downgrade plan button → Opens plan selector modal
- Change plan button → Opens plan selector modal
- Plan change explanation (proration, effective date)

Subscription Control:
- Pause subscription button (if active)
  - Pause reason field (optional)
  - Pause duration selector (30 days, 60 days, indefinite)
- Resume subscription button (if paused)
- Cancel subscription button → Opens cancellation modal
- Extend trial button (if trial)

Discount Management:
- Apply coupon/discount button → Opens coupon modal
- View applied discount details (code, amount, expiry)
- Remove discount button (with confirmation)

Special Actions:
- Process payment button (if payment pending)
- Send invoice reminder button
- Generate invoice now button
- Refund button (if overpaid or charged in error)

**Subscription History Tab**:

Plan Change History:
- Table: Previous plan, new plan, change date, reason
- Monthly comparison chart (old price vs new price)

Status Change History:
- Status timeline: created, activated, paused, cancelled, etc.
- Timestamps and reasons

Events Log:
- Payment received, invoice generated, trial ended, etc.
- Timestamp and details

**Tenant Information Tab**:
- Tenant name and ID
- Admin email
- Billing email (if different)
- Billing address
- Link to full tenant details

#### Plan Management

**Plans Overview**:
- Metrics: Total plans, active plans, subscriptions per plan

**Plans List Table**:
- Plan name (sortable)
- Plan tier (sortable)
- Base monthly price (sortable)
- Base annual price (sortable)
- Features count (sortable)
- Active subscriptions count (sortable)
- Trial days (sortable)
- Status (active/inactive, filterable)
- Actions

**Create New Plan Button**:
- Opens plan creation form

**Row Actions**:
- View plan details button
- Edit plan button
- Duplicate plan button
- Delete plan button (if no active subscriptions)
- Preview plan button

**Filter Options**:
- Filter by status (active, inactive, archived)
- Filter by tier (basic, premium, enterprise)

#### Plan Editor

**Basic Information Tab**:
- Plan name input field (required, unique)
- Plan description textarea
- Plan tier selector (dropdown: basic, premium, enterprise)
- Display order input field
- Status toggle (active/inactive)

**Pricing Tab**:

Base Pricing:
- Monthly price input field
- Annual price input field
- Annual discount percentage (calculated)
- Discounted annual price display

Trial Period:
- Enable trial toggle
- Trial days input field (if enabled)
- Trial cancellation policy (description)

**Features Tab**:

Available Features:
- Checkboxes for each feature
- Feature descriptions (tooltips)
- Select all / deselect all buttons

Feature Groups:
- Features organized by category (Core, Advanced, Premium, etc.)
- Per-category select all buttons

Custom Features:
- Add custom feature button (if applicable)
- Custom feature input field
- Delete custom feature buttons

**Usage Limits Tab**:

Quota Configuration:
- User count limit input field
- Storage limit (GB) input field
- API call monthly limit input field
- Concurrent sessions limit input field
- Custom fields (as applicable)

**Visibility & Access Tab**:

Plan Visibility:
- Show plan to new customers toggle
- Show plan to existing customers toggle
- Customer-facing description textarea

Support Level:
- Support level selector (community, standard, premium, enterprise)
- Support response time SLA
- Support channels included

**Review & Save**:

Summary Display:
- Plan name, tier, pricing, features count
- Edit buttons for each section

Save Options:
- Save plan button (creates or updates)
- Save as draft button
- Preview button (shows customer view)
- Cancel button

#### Billing Dashboard

**Financial Overview**:

Key Metrics:
- Total invoices count (all time)
- Paid invoices count
- Outstanding invoices count
- Overdue invoices count
- Total revenue (all time)
- Total outstanding amount
- Total overdue amount
- Average invoice amount

Revenue Trend:
- Monthly revenue chart (last 12 months)
- Revenue trend indicator (up/down arrow with %)
- Month-over-month growth

**Invoices Management**:

**Invoices List Table**:
- Invoice number (sortable, linked to detail)
- Tenant name (sortable, searchable)
- Amount (sortable)
- Status (sortable, filterable)
- Date (sortable)
- Due date (sortable)
- Days overdue (if applicable, sortable)
- Actions

**Status Filters**:
- All, Paid, Pending, Overdue, Refunded, Disputed

**Date Range Filter**:
- Preset ranges (This month, Last 30 days, Last quarter, Last year, Custom)

**Tenant Search**:
- Quick search in invoice list

**Sort Options**:
- By date (newest, oldest)
- By amount (low to high, high to low)
- By status (custom order)
- By due date (overdue first)

**Bulk Actions**:
- Send reminder emails (to overdue invoices)
- Mark as paid (bulk)
- Export selected (CSV)

#### Invoice Detail View

**Invoice Header**:
- Invoice number (read-only)
- Invoice date (read-only)
- Due date (read-only)
- Status badge (color-coded)
- Invoice state indicator (paid, pending, overdue, etc.)

**Tenant & Billing Information**:
- Tenant name and ID
- Admin email
- Billing email
- Billing address

**Invoice Itemization**:

Line Items Table:
- Description (subscription period, plan name, etc.)
- Quantity (usually 1 for subscription)
- Unit price
- Amount
- Subtotal row

Amounts Summary:
- Subtotal
- Discounts applied (if any)
- Tax (if applicable)
- Total amount due

**Payment Status & History**:

Current Status:
- Status indicator and badge
- Amount due (if unpaid)
- Payment deadline

Payment History:
- Table: Payment date, amount, method, reference number
- Payment method details
- Full payment indicator (checkmark)

**Invoice Actions**:

For Unpaid Invoices:
- Send reminder email button
- Record payment button → Opens payment recording form
- Refund button
- Write-off button (for small uncollectible amounts)
- Extend due date button

For Paid Invoices:
- Download receipt button
- Send receipt email button
- Record adjustment button

General Actions:
- Download PDF button
- Download as CSV button
- Send invoice email button
- Dispute button (if disputed feature enabled)
- Print button

**Notes Section**:
- Admin notes textarea
- Notes history (who added, when)

#### Revenue Analytics Dashboard

**Revenue Overview**:

Current Period Metrics:
- MRR (Monthly Recurring Revenue) - total and vs last month
- ARR (Annual Recurring Revenue) - total
- MRR growth indicator (%)
- Churn rate indicator (% of MRR lost)
- Expansion revenue (% of new MRR)

**Revenue Charts**:

MRR Trend Chart:
- Line chart of MRR for last 12 months
- Trend line indicator
- Comparison with previous year toggle

ARR Trend Chart:
- Line chart of ARR trends

Revenue by Plan Breakdown:
- Pie chart showing revenue distribution by plan
- Plan name and percentage labels
- Drill-down to plan details

Revenue by Status:
- Stacked bar chart: Active, Trial, Paused, Cancelled
- Show contribution of each status to total MRR

**Customer Metrics**:

Subscription Lifecycle:
- New subscriptions this month (count)
- Churned subscriptions this month (count)
- Paused subscriptions count
- Plan upgrades this month (count)
- Plan downgrades this month (count)

Retention Metrics:
- Customer retention rate (%)
- Net revenue retention (%)
- Logo churn rate (%)

**Period Selector**:
- Preset ranges (This month, Last 3 months, Last 6 months, Last year, Custom)
- Custom date range picker

**Export Options**:
- Export data button (CSV, JSON)
- Schedule report button (weekly, monthly email)

#### Dunning Management (Payment Retry Configuration)

**Dunning Settings**:

Configuration Panel:
- Retry attempts count input field (e.g., 3 attempts)
- Retry interval input field (days between attempts)
- Maximum retry period input field (days until give up)
- Dunning email template selector (dropdown)
- Email send timing (immediately, delay X hours)
- Pause subscription after failed payment toggle
- Save configuration button

**Email Templates**:
- Select template for first, second, third attempt
- Email preview button (shows preview of template)
- Customize template link (if applicable)

**Failed Payments Queue**:

Queue Metrics:
- Total failed payments count
- Retries in progress count
- Permanently failed count

**Failed Payments Table**:
- Subscription / Tenant name (linked to detail)
- Amount (sortable)
- Original failure date (sortable)
- Failure reason (sortable)
- Retry count (sortable)
- Next retry date (sortable)
- Status (retry scheduled, permanently failed, etc.)
- Actions

**Row Actions**:
- Retry now button (manual retry)
- Disable retry button (give up on this subscription)
- View payment details button
- Edit payment method button (if available)

**Bulk Actions**:
- Select multiple failed payments
- Bulk retry button
- Bulk disable button

**Failed Payments Dashboard**:
- Failed payment rate (% of all billing attempts)
- Success rate after retry (%)
- Common failure reasons (chart)
- Trend chart (failed payments over time)

#### Discounts & Coupons Management

**Active Discounts List**:

Discounts Table:
- Code (sortable)
- Description (sortable)
- Type (percentage, fixed amount, etc., sortable)
- Discount value (sortable)
- Subscriptions using count (sortable)
- Expiry date (sortable)
- Status (active, expired, inactive)
- Actions

**Row Actions**:
- View discount details button
- Edit discount button
- Deactivate discount button
- Delete discount button (if no active uses)
- Duplicate discount button

**Create New Coupon Button**:
- Opens coupon creation form

**Coupon Editor**:

Basic Information:
- Coupon code input field (unique, alphanumeric)
- Description textarea
- Coupon type selector (percentage, fixed amount, free trial days)
- Discount value input field

Usage Limits:
- Redemption limit (total uses allowed) input
- Per-customer limit (max uses per tenant) input
- Active date range (start date, end date)
- Activation status (active/inactive toggle)

Eligibility:
- Applicable to specific plans (multi-select) or all plans
- Applicable to new customers only toggle
- Applicable to specific tenants (multi-select) or unrestricted
- Minimum subscription value required (if applicable)

**Save & Preview**:
- Save coupon button
- Preview button (shows customer-facing preview)
- Cancel button

**Coupon Analytics**:
- Total coupons count
- Active coupons count
- Total discount value issued
- Average discount per coupon
- Coupon redemption rate

## Backend API Requirements

### Plan Management Endpoints

**GET /api/admin/plans/** - Get all plans
- Query Parameters:
  - `status` (optional): filter by active/inactive
  - `tier` (optional): filter by tier
  - `limit` (optional, default: 25)
  - `offset` (optional, default: 0)
- Response:
  ```
  {
    count: integer,
    results: [{
      id: string,
      name: string,
      tier: string,
      pricing: {
        monthly: number,
        annual: number
      },
      features: [string],
      usage_limits: {
        users: integer,
        storage_gb: number,
        api_calls: integer
      },
      trial_days: integer,
      active_subscriptions: integer,
      is_active: boolean,
      created_at: datetime
    }]
  }
  ```

**POST /api/admin/plans/** - Create new plan
- Request Body:
  ```
  {
    name: string (required),
    tier: string (required),
    pricing: {
      monthly: number (required),
      annual: number (required)
    },
    features: [string] (required),
    usage_limits: {
      users: integer,
      storage_gb: number,
      api_calls: integer
    },
    trial_days: integer (optional),
    display_order: integer (optional)
  }
  ```
- Response: Created plan object

**PATCH /api/admin/plans/{id}/** - Update plan
- Request Body:
  ```
  {
    name: string (optional),
    tier: string (optional),
    pricing: object (optional),
    features: [string] (optional),
    usage_limits: object (optional),
    trial_days: integer (optional),
    is_active: boolean (optional)
  }
  ```
- Response: Updated plan object

**DELETE /api/admin/plans/{id}/** - Delete plan
- Preconditions: No active subscriptions
- Response: { success: boolean }

### Subscription Management Endpoints

**GET /api/admin/subscriptions/** - Get all subscriptions
- Query Parameters:
  - `plan` (optional): filter by plan ID
  - `status` (optional): filter by status
  - `date_range` (optional): filter by date range
  - `mrr_range` (optional): filter by MRR range
  - `search` (optional): search tenant name
  - `limit` (optional, default: 25)
  - `offset` (optional, default: 0)
  - `sort` (optional): sort field
  - `order` (optional): asc or desc
- Response:
  ```
  {
    count: integer,
    results: [{
      id: string,
      tenant_id: string,
      tenant_name: string,
      plan_id: string,
      plan_name: string,
      status: string,
      monthly_price: number,
      annual_value: number,
      start_date: datetime,
      next_billing_date: datetime,
      trial_end_date: datetime (optional),
      current_period_start: datetime,
      current_period_end: datetime
    }]
  }
  ```

**GET /api/admin/subscriptions/{id}/** - Get subscription details
- Response:
  ```
  {
    id: string,
    tenant_id: string,
    tenant_name: string,
    plan_id: string,
    plan_details: object,
    status: string,
    pricing: {
      monthly: number,
      annual: number,
      discount: number (if applied)
    },
    billing_dates: {
      start_date: datetime,
      current_period_start: datetime,
      current_period_end: datetime,
      next_billing_date: datetime,
      trial_end_date: datetime (if trial)
    },
    payment_history: [{
      date: datetime,
      amount: number,
      status: string
    }],
    invoices_count: integer,
    total_paid: number,
    total_outstanding: number,
    paused_since: datetime (if paused),
    cancelled_since: datetime (if cancelled)
  }
  ```

**PATCH /api/admin/subscriptions/{id}/** - Update subscription
- Request Body:
  ```
  {
    status: string (optional),
    plan_id: string (optional, triggers plan change),
    paused: boolean (optional),
    pause_reason: string (optional),
    custom_pricing: number (optional)
  }
  ```
- Response: Updated subscription object

**POST /api/admin/subscriptions/{id}/change-plan/** - Change subscription plan
- Request Body:
  ```
  {
    new_plan_id: string (required),
    effective_date: datetime (optional, default: immediate),
    proration_behavior: string (immediate, next_billing, manual)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    old_plan: object,
    new_plan: object,
    adjustment_amount: number,
    adjustment_type: string (credit | charge),
    effective_date: datetime,
    next_billing_date: datetime
  }
  ```

**POST /api/admin/subscriptions/{id}/pause/** - Pause subscription
- Request Body:
  ```
  {
    reason: string (optional),
    resume_date: datetime (optional)
  }
  ```
- Response: { success: boolean, paused_at: datetime }

**POST /api/admin/subscriptions/{id}/resume/** - Resume subscription
- Response: { success: boolean, resumed_at: datetime }

**POST /api/admin/subscriptions/{id}/cancel/** - Cancel subscription
- Request Body:
  ```
  {
    reason: string (required),
    effective_immediately: boolean (optional),
    refund_type: string (full, partial, none)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    cancellation_date: datetime,
    refund_amount: number,
    final_invoice_date: datetime
  }
  ```

**POST /api/admin/subscriptions/{id}/apply-coupon/** - Apply coupon to subscription
- Request Body:
  ```
  {
    coupon_code: string (required)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    discount_amount: number,
    new_total: number,
    effective_date: datetime
  }
  ```

**POST /api/admin/subscriptions/{id}/remove-coupon/** - Remove applied coupon
- Response: { success: boolean }

### Invoice Management Endpoints

**GET /api/admin/invoices/** - Get invoices
- Query Parameters:
  - `status` (optional): filter by status
  - `date_range` (optional)
  - `tenant_id` (optional)
  - `min_amount`, `max_amount` (optional)
  - `sort` (optional)
  - `limit` (optional, default: 25)
  - `offset` (optional, default: 0)
- Response:
  ```
  {
    count: integer,
    results: [{
      id: string,
      invoice_number: string,
      tenant_id: string,
      tenant_name: string,
      amount: number,
      status: string,
      date: datetime,
      due_date: datetime,
      days_overdue: integer (if overdue)
    }]
  }
  ```

**GET /api/admin/invoices/{id}/** - Get invoice details
- Response:
  ```
  {
    id: string,
    invoice_number: string,
    tenant_id: string,
    tenant_name: string,
    date: datetime,
    due_date: datetime,
    items: [{
      description: string,
      quantity: number,
      unit_price: number,
      amount: number
    }],
    subtotal: number,
    discounts: number,
    tax: number,
    total: number,
    status: string,
    payment_history: [{
      date: datetime,
      amount: number,
      method: string,
      reference: string
    }],
    notes: string
  }
  ```

**POST /api/admin/invoices/{id}/send-reminder/** - Send invoice reminder email
- Response: { success: boolean, email_sent_at: datetime }

**POST /api/admin/invoices/{id}/record-payment/** - Record payment on invoice
- Request Body:
  ```
  {
    amount: number (required),
    date: datetime (optional, default: now),
    method: string (optional),
    reference: string (optional),
    notes: string (optional)
  }
  ```
- Response: { success: boolean, remaining_balance: number }

**POST /api/admin/invoices/{id}/refund/** - Refund invoice or partial amount
- Request Body:
  ```
  {
    amount: number (optional, full if omitted),
    reason: string (required),
    notes: string (optional)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    refund_id: string,
    refund_amount: number,
    refund_date: datetime
  }
  ```

**POST /api/admin/invoices/{id}/write-off/** - Write off invoice (accounting adjustment)
- Request Body:
  ```
  {
    reason: string (required),
    amount: number (optional, full if omitted)
  }
  ```
- Response: { success: boolean, write_off_date: datetime }

### Billing Analytics Endpoints

**GET /api/admin/billing/analytics/** - Get billing analytics
- Query Parameters:
  - `date_range` (optional)
  - `breakdown` (optional): by_plan, by_status, by_tenant
- Response:
  ```
  {
    mrr: number,
    arr: number,
    active_subscriptions: integer,
    churned_subscriptions: integer,
    new_subscriptions: integer,
    expansion_revenue: number,
    net_revenue_retention: number,
    churn_rate: number,
    by_plan: [{
      plan_name: string,
      count: integer,
      mrr: number
    }],
    by_status: [{
      status: string,
      count: integer,
      mrr: number
    }]
  }
  ```

**GET /api/admin/billing/revenue-trends/** - Get revenue trend data
- Query Parameters:
  - `period` (optional): daily, weekly, monthly
  - `months` (optional, default: 12)
- Response:
  ```
  {
    data: [{
      date: date,
      mrr: number,
      arr: number,
      new_mrr: number,
      churn_mrr: number,
      expansion_mrr: number
    }]
  }
  ```

### Dunning Configuration Endpoints

**GET /api/admin/dunning/configuration/** - Get dunning settings
- Response:
  ```
  {
    retry_attempts: integer,
    retry_interval_days: integer,
    max_retry_period_days: integer,
    email_template_ids: [string],
    pause_subscription_on_failure: boolean
  }
  ```

**PATCH /api/admin/dunning/configuration/** - Update dunning settings
- Request Body:
  ```
  {
    retry_attempts: integer (optional),
    retry_interval_days: integer (optional),
    max_retry_period_days: integer (optional),
    email_template_ids: [string] (optional),
    pause_subscription_on_failure: boolean (optional)
  }
  ```
- Response: Updated configuration

**GET /api/admin/failed-payments/** - Get failed payment subscriptions
- Query Parameters:
  - `status` (optional): retry_pending, permanently_failed
  - `next_retry_before` (optional)
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)
- Response:
  ```
  {
    count: integer,
    results: [{
      subscription_id: string,
      tenant_name: string,
      amount: number,
      failure_reason: string,
      retry_count: integer,
      last_retry_date: datetime,
      next_retry_date: datetime
    }]
  }
  ```

**POST /api/admin/failed-payments/{subscription_id}/retry/** - Manually retry payment
- Response:
  ```
  {
    success: boolean,
    retry_result: string (success | failed),
    next_retry_date: datetime
  }
  ```

**POST /api/admin/failed-payments/{subscription_id}/disable-retry/** - Give up on payment retry
- Response: { success: boolean }

### Coupon/Discount Endpoints

**GET /api/admin/coupons/** - Get all coupons
- Query Parameters:
  - `status` (optional): active, inactive, expired
  - `limit` (optional, default: 25)
  - `offset` (optional, default: 0)
- Response: Array of coupon objects

**POST /api/admin/coupons/** - Create new coupon
- Request Body:
  ```
  {
    code: string (required, unique),
    description: string,
    type: string (percentage | fixed_amount),
    value: number (required),
    redemption_limit: integer,
    per_customer_limit: integer,
    start_date: datetime,
    end_date: datetime,
    applicable_plans: [string] (optional, all if omitted),
    new_customers_only: boolean (optional)
  }
  ```
- Response: Created coupon object

**PATCH /api/admin/coupons/{code}/** - Update coupon
- Request Body: (same fields as create)
- Response: Updated coupon object

**DELETE /api/admin/coupons/{code}/** - Delete coupon
- Preconditions: No active uses
- Response: { success: boolean }

## Database Requirements

### Enhanced Plan Model

Additional Fields:
- `tier` (enum): basic, premium, enterprise
- `features` (JSON array): list of feature IDs or names
- `usage_limits` (JSON): user_count, storage_gb, api_calls
- `display_order` (integer): sort order in UI
- `support_level` (enum): community, standard, premium, enterprise
- `description` (text): customer-facing description
- `visibility_flags` (JSON): show_new_customers, show_existing_customers
- `trial_days` (integer): trial period length

Indexes:
- (is_active, tier, sort_order) - for listing
- (is_active, created_at DESC) - for new plans

### Enhanced Subscription Model

Additional Fields:
- `custom_pricing` (decimal, nullable): override default plan price
- `discount_id` (foreign key, nullable): applied coupon/discount
- `discount_amount` (decimal): calculated discount
- `paused_at` (datetime, nullable): pause timestamp
- `pause_reason` (text, nullable): reason for pause
- `paused_by` (foreign key, nullable): admin who paused
- `resume_scheduled_at` (datetime, nullable): auto-resume date if set
- `cancellation_reason` (text, nullable): reason for cancellation
- `cancelled_by` (foreign key, nullable): who cancelled
- `refund_amount` (decimal): refunds issued
- `next_billing_date` (datetime): calculated next billing

Indexes:
- (status, next_billing_date) - for billing runs
- (tenant_id, status) - for tenant queries
- (plan_id, status, created_at DESC) - for plan analytics
- (next_billing_date, status) - for upcoming billings

### Enhanced Invoice Model

Additional Fields:
- `invoice_number` (string, unique): human-readable invoice ID
- `subscription_id` (foreign key): associated subscription
- `tenant_id` (foreign key): tenant being billed
- `items` (JSON): line items array
- `subtotal` (decimal): pre-discount total
- `discount_amount` (decimal): discounts applied
- `tax_amount` (decimal): taxes
- `total_amount` (decimal): final amount due
- `paid_amount` (decimal): amount already paid
- `remaining_amount` (decimal): amount still due
- `status` (enum): draft, sent, viewed, partial, paid, refunded, writeoff
- `sent_at` (datetime, nullable): when sent to customer
- `viewed_at` (datetime, nullable): when viewed by customer
- `due_date` (datetime): payment due date
- `payment_history` (JSON): array of payments and refunds
- `notes` (text): admin notes
- `next_reminder_date` (datetime, nullable): next dunning email

Indexes:
- (tenant_id, created_at DESC) - invoice history
- (status, due_date) - overdue tracking
- (subscription_id, created_at DESC) - subscription invoices
- (due_date) - for billing runs
- (status, sent_at) - for payment tracking

### Subscription Event Model

Fields:
- `id` (primary key, UUID)
- `subscription_id` (foreign key)
- `tenant_id` (foreign key)
- `event_type` (enum): created, activated, paused, resumed, plan_changed, trial_ended, cancelled, payment_received, payment_failed, etc.
- `event_data` (JSON): event-specific details
- `timestamp` (datetime): when event occurred
- `created_at` (datetime)

Indexes:
- (subscription_id, event_type, timestamp DESC)
- (tenant_id, timestamp DESC)

### Failed Payment Model

Fields:
- `id` (primary key, UUID)
- `subscription_id` (foreign key)
- `tenant_id` (foreign key)
- `invoice_id` (foreign key, nullable)
- `amount` (decimal)
- `failure_reason` (string)
- `failure_details` (JSON)
- `retry_count` (integer)
- `max_retries` (integer)
- `last_retry_at` (datetime, nullable)
- `next_retry_at` (datetime, nullable)
- `status` (enum): retry_scheduled, permanently_failed, recovered
- `recovered_at` (datetime, nullable)
- `created_at` (datetime)

Indexes:
- (subscription_id, status)
- (next_retry_at, status) - for batch retry
- (status, created_at DESC) - for monitoring

### Coupon Model

Fields:
- `id` (primary key, UUID)
- `code` (string, unique): coupon code
- `description` (text)
- `type` (enum): percentage, fixed_amount
- `value` (decimal): discount amount or percentage
- `applicable_plans` (JSON array, nullable): if null, applies to all
- `new_customers_only` (boolean)
- `redemption_limit` (integer, nullable)
- `per_customer_limit` (integer, nullable)
- `current_redemptions` (integer)
- `start_date` (datetime)
- `end_date` (datetime)
- `is_active` (boolean)
- `created_at` (datetime)
- `updated_at` (datetime)

Indexes:
- (code) - code lookup
- (is_active, end_date) - active coupons
- (created_at DESC) - recent first

### Proration Record Model

Fields:
- `id` (primary key, UUID)
- `subscription_id` (foreign key)
- `old_plan_id` (foreign key)
- `new_plan_id` (foreign key)
- `change_date` (datetime)
- `old_mrr` (decimal)
- `new_mrr` (decimal)
- `adjustment_amount` (decimal)
- `adjustment_type` (enum): credit, charge
- `applied_to_invoice_id` (foreign key, nullable)
- `created_at` (datetime)

Indexes:
- (subscription_id, change_date DESC)
- (created_at DESC) - for analytics

## Current Implementation Status

### Fully Implemented
- Plan and subscription models (basic)
- Trial subscription creation
- MRR/ARR calculation (partial)
- Basic subscription service
- Invoice model structure
- Plans management page (basic)

### Partially Implemented
- Subscription status tracking
- Basic subscription list view
- MRR page (displays metrics only)
- Invoice recording (basic)
- Subscription event logging (not visible in admin)

### Not Implemented
- Plan CRUD operations in admin UI
- Plan feature configuration UI
- Subscription plan change workflow
- Subscription cancellation UI workflow
- Subscription pause/resume
- Comprehensive billing dashboard
- Invoice management UI
- Failed payment retry queue
- Dunning configuration UI
- Proration calculation and display
- Coupon/discount management
- Refund processing workflow
- Revenue analytics (detailed)
- Churn analysis
- Expansion revenue tracking
- Customer lifetime value
- Advanced filtering and search

## Validation & Edge Cases

### Validation Rules

- **Plan Pricing**: Monthly price >= 0, annual >= monthly * 11 (at least 1 month free)
- **Trial Days**: 0-365 days
- **Plan Names**: Required, 2-100 characters, unique
- **Subscription Status Transitions**: Valid path must be maintained
- **Plan Changes**: Can't downgrade to plan with fewer features in active subscriptions
- **Cancellations**: Can cancel only active, trial, or paused subscriptions
- **Proration**: Must calculate correctly for mid-cycle changes
- **Coupon Code**: Alphanumeric, 3-30 characters
- **Coupon Value**: Percentage (0-100) or fixed amount (>0)
- **Invoice Amount**: Must match subscription pricing + adjustments

### Edge Cases

- **Free Trial Upgrades**: Plan change during trial should activate billing
- **Plan Change Refunds**: Downgrade mid-cycle generates credit
- **Concurrent Billing**: Handle simultaneous billing for same subscription
- **Payment Retry Limits**: Must not exceed max retry count
- **Timezone Differences**: Bill date may shift slightly across timezones
- **Currency Conversions**: If multi-currency, handle exchange rates
- **Leap Months**: February pricing in monthly subscriptions
- **Subscription to No Subscription**: Plan deletion while subscribed
- **Duplicate Invoices**: Prevent billing twice for same period
- **Partial Refunds**: Track multiple refunds on same invoice

## Testing Checklist

### Functional Tests
- [ ] Create plan with all fields works
- [ ] Edit plan updates correctly
- [ ] Plan deletion blocked if active subscriptions
- [ ] Create subscription works
- [ ] Upgrade plan calculates proration correctly
- [ ] Downgrade plan processes refund correctly
- [ ] Cancel subscription stops billing
- [ ] Pause subscription halts billing
- [ ] Resume subscription restarts billing
- [ ] Trial expires and converts to paid
- [ ] Invoice generation creates correct amounts
- [ ] Coupon application discounts correctly
- [ ] Coupon removal restores full price
- [ ] Failed payment triggers retry
- [ ] Manual retry works
- [ ] Refund processes correctly
- [ ] MRR/ARR calculations accurate
- [ ] Churn rate calculated correctly

### User Experience Tests
- [ ] Plan editor form is intuitive
- [ ] Subscription change modal shows proration clearly
- [ ] Invoice detail displays all information
- [ ] Analytics charts load and display correctly
- [ ] Search and filters work smoothly
- [ ] Bulk operations show progress
- [ ] Error messages are helpful

### Performance Tests
- [ ] Plan list loads in <500ms
- [ ] Subscription list loads in <500ms
- [ ] MRR calculation for 10,000 subscriptions: <5s
- [ ] Proration calculation: <100ms
- [ ] Invoice generation batch: <10s
- [ ] Revenue analytics query: <2s
- [ ] Search results: <500ms

### Data Integrity Tests
- [ ] Subscription/invoice totals stay consistent
- [ ] Proration calculations are mathematically accurate
- [ ] Coupon usage limits enforced
- [ ] Retry counts accurate
- [ ] Payment history immutable
- [ ] Status transitions valid

## Implementation Checklist

### Database Models
- [ ] Plan model enhancements
- [ ] Subscription model enhancements
- [ ] Invoice model enhancements
- [ ] SubscriptionEvent model
- [ ] FailedPayment model
- [ ] Coupon model
- [ ] ProratedRecord model
- [ ] Database migrations
- [ ] Indexes and constraints

### Backend Services
- [ ] PlanService (CRUD, validation)
- [ ] SubscriptionService (enhancements)
- [ ] SubscriptionChangesService (plan change, proration)
- [ ] BillingService (invoice generation)
- [ ] DunningService (failed payment retry)
- [ ] ProrService (calculate, track)
- [ ] CouponService (validation, application)
- [ ] RefundService (process refunds)
- [ ] AnalyticsService (MRR, ARR, churn, etc.)

### Backend API Endpoints
- [ ] All plan endpoints (GET, POST, PATCH, DELETE)
- [ ] All subscription endpoints
- [ ] All invoice endpoints
- [ ] Billing analytics endpoints
- [ ] Dunning configuration endpoints
- [ ] Failed payment endpoints
- [ ] Coupon endpoints

### Frontend Components
- [ ] PlanEditor component
- [ ] PlanSelector component
- [ ] SubscriptionDetailView component
- [ ] SubscriptionChangeModal component
- [ ] InvoiceDetailView component
- [ ] BillingDashboard component
- [ ] RevenueAnalyticsChart component
- [ ] DunningConfigPanel component
- [ ] CouponEditor component
- [ ] FailedPaymentsQueue component

### Background Jobs
- [ ] Daily billing job (generate invoices)
- [ ] Payment retry job (scheduled retries)
- [ ] Subscription lifecycle job (trial expiration, renewal)
- [ ] Analytics calculation job (MRR, ARR, churn)
- [ ] Coupon cleanup job (archive expired)

### Testing Infrastructure
- [ ] Subscription state machine tests
- [ ] Proration calculation tests
- [ ] Invoice generation tests
- [ ] Analytics calculation tests
- [ ] E2E workflow tests

## Deployment Strategy

### Phase 1: Models & Infrastructure
- Deploy database models
- Deploy migrations
- Deploy backend services
- Full testing of calculations

### Phase 2: API Endpoints
- Deploy all API endpoints
- API documentation
- Performance testing

### Phase 3: Frontend
- Deploy plan management page
- Deploy subscription list enhancements
- Deploy billing dashboard
- Deploy invoice management
- Internal testing

### Phase 4: Rollout
- Feature flag for limited rollout
- Staff training
- Gradual enable for all super admins
- Monitor error rates

### Rollback Plan
- Archive plan/subscription changes
- Revert database migrations (keep historical data)
- Disable feature flag
- Restore previous frontend

## Performance Targets

- **Plan List Load**: <500ms
- **Subscription List Load**: <500ms with 10,000 subscriptions
- **MRR Calculation**: <5s for 10,000 subscriptions
- **Proration Calculation**: <100ms
- **Invoice Generation**: <10s for 1000 invoices
- **Revenue Analytics Query**: <2s
- **Dunning Batch Run**: <30s for 1000 failed payments

## Monitoring & Alerting

### Metrics to Track
- Plan creation/modification rate
- Subscription creation rate
- Upgrade/downgrade frequency
- Cancellation rate (churn)
- Failed payment rate
- Retry success rate
- Invoice generation success rate
- MRR trends and anomalies
- ARR trends
- Average proration value
- Coupon usage rate

### Alerts
- Failed payment spike (>5% of billing)
- High churn rate (>10% MoM)
- Billing job failures
- Invoice generation errors
- Dunning retry failures
- Plan change errors

### Dashboards
- Revenue dashboard (MRR, ARR, trends)
- Subscription lifecycle dashboard
- Billing health dashboard (invoices, payments)
- Failed payment dashboard
- Plan performance dashboard

## Documentation Requirements

### Admin Guides
- Plan Management Guide
- Subscription Management Guide
- Billing Operations Guide
- Invoice & Payment Guide
- Revenue Analytics Guide
- Dunning Configuration Guide
- Coupon Management Guide

### Developer Documentation
- API Reference (all endpoints)
- Proration Calculation Guide
- MRR/ARR Calculation Guide
- Service Architecture
- Database Schema
- Error Handling

### Troubleshooting
- Common Billing Issues
- Failed Payment Troubleshooting
- Proration Calculation Issues
- Subscription State Issues
- Invoice Generation Issues

## Future Enhancements

- **Usage-Based Billing**: Charge based on actual usage metrics
- **Seat-Based Pricing**: Price adjustments based on seat count
- **Custom Contracts**: Enterprise custom pricing agreements
- **Automated Dunning**: Advanced dunning strategies (AI-powered)
- **Revenue Recognition**: AICPA ASC 606 compliance
- **Churn Prediction**: ML models to predict cancellations
- **Plan Recommendations**: Suggest plans based on usage
- **Automated Upsells**: Intelligent upgrade suggestions
- **Flexible Billing**: Weekly, quarterly, custom billing cycles
- **Tax Compliance**: Automated tax calculation per region
