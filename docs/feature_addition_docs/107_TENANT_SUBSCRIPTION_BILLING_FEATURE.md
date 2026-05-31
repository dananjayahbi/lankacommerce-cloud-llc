# Tenant Subscription and Billing Management Feature Specification

**Document ID:** 107  
**Feature Name:** Tenant Subscription and Billing Management  
**Date:** May 31, 2026  
**Status:** Specification Document  
**Priority:** High

---

## Executive Summary

The Tenant Subscription and Billing Management feature provides comprehensive subscription management, plan selection, billing history, payment management, and account upgrades/downgrades. This enables business owners to manage their SaaS subscription and billing information independently without requiring SaaS administrator assistance.

---

## Current State Analysis

### EXISTING IMPLEMENTATION

- **Subscription Model:** Exists in backend with core fields and relationships
- **Plan Model and System:** Complete plan tier system (Starter, Professional, Enterprise)
- **Subscription Service:** Service layer with subscription logic (backend/apps/billing/services/subscription_service.py)
- **Plan Views and Serializers:** API endpoints for plan retrieval
- **Subscription Status Checking:** Real-time subscription status determination
- **Trial Subscription Creation:** Automatic trial setup for new tenants
- **Payment Gateway Integration:** PayHere integration for payments
- **Invoice/Billing Models:** Partial implementation, may need extensions
- **Stripe Integration:** Foundation for future payment processor

### MISSING / PARTIALLY IMPLEMENTED

- **Subscription & Billing Tab UI:** Self-service tenant view not created
- **Current Plan Display:** Plan information not shown in self-service
- **Plan Features List Display:** Feature limits not shown in UI
- **Billing Cycle Information:** Payment schedule not displayed
- **Payment Method on File Display:** Stored payment methods not shown
- **Billing Address Form/Editor:** Address management UI missing
- **Upgrade Plan Button/Flow:** Self-service upgrade wizard not implemented
- **Downgrade Plan Button/Flow:** Self-service downgrade not available
- **Plan Comparison View:** Side-by-side plan comparison missing
- **Feature Limitation Display:** Usage quotas not shown
- **Payment Method Update UI:** Payment method management interface missing
- **Billing History/Invoices List:** Invoice listing UI not created
- **Invoice Detail View:** Detailed invoice display not implemented
- **Invoice Download (PDF):** PDF generation and download not available
- **Subscription Cancellation UI:** Cancellation workflow UI missing
- **Usage Statistics Display:** Current quota usage not shown
- **Billing Alerts:** Renewal date, overdue, and limit warnings missing
- **Subscription Status Indicator:** Visual status display incomplete
- **Plan Change History:** Change audit trail not displayed
- **Next Billing Date Display:** Renewal date information missing
- **Payment Method Management:** Add/update/remove payment methods UI missing

---

## Frontend Features

### Page Header

- **Title:** "Subscription & Billing" displayed prominently
- **Status Badge:** Current subscription status (Active, Trial, Suspended, Expired)
- **Last Updated:** Timestamp of last billing update

### Settings Navigation Tabs (Continued)

Three main tabs in the tenant self-service settings area:
- **Tenant Settings** (separate feature document)
- **Subscription & Billing** (active tab for this feature)
- **Features & Modules** (separate feature document)

### Current Subscription Section

#### **Plan Information Card**

- **Current Plan Name**
  - Displayed prominently (e.g., "Professional Plan")
  - Badge with plan tier (Starter, Professional, Enterprise, Custom)
  - Color-coded tier indicator

- **Billing Cycle Information**
  - Display: "Monthly" or "Annual"
  - Billing frequency (recurring every month/year)
  - Edit option (change frequency if allowed)

- **Subscription Status**
  - Status indicator: Active (green), Trial (blue), Suspended (red), Expired (gray)
  - Status explanation text
  - If trial: Days remaining display
  - If expired: Reason for expiration

- **Next Billing Date**
  - Displayed prominently: "Next billing: June 15, 2026"
  - Amount to be charged: "Amount: Rs. 4,999"
  - Auto-renewal status toggle:
    - Label: "Auto-renewal"
    - Toggle switch (enabled/disabled)
    - Confirmation on toggle

- **Plan Cost Display**
  - Monthly/Annual cost based on billing cycle
  - Breakdown of charges (if multiple items)
  - Discount information (if applicable)

#### **Plan Features Display**

- **Included Features Section**
  - Header: "What's Included"
  - Feature list with checkmarks:
    - Max users: 5 (number-based)
    - Max products: Unlimited
    - Max orders: Unlimited
    - Storage: 50 GB
    - API calls: 10,000/month
    - Custom domain: Yes/No
    - Advanced reporting: Yes/No
    - Email support: Yes/No
    - Priority support: Yes/No

- **Feature Limits Display (if applicable)**
  - Current usage vs limit:
    - Users: 3 / 5 (progress bar)
    - Products: 245 / 500 (progress bar)
    - Orders: 1,234 / 10,000 (progress bar)
    - Storage: 15 GB / 50 GB (progress bar with percentage)
    - API calls: 8,500 / 10,000 per month (progress bar)
  - Warning indicators:
    - Yellow: >75% used
    - Red: >90% used
  - Upgrade suggestion: "You've used 85% of storage. Upgrade to Professional for more."

#### **Action Buttons**

- **Upgrade Plan Button**
  - Only visible if higher plans available
  - Prominent primary button
  - Text: "Upgrade Plan"

- **Downgrade Plan Button**
  - Only visible if lower plans available
  - Secondary button
  - Text: "Downgrade Plan"
  - With warning icon

- **Change Plan Button**
  - Alternative: Single button showing all plan options
  - Opens plan comparison/selector

- **Cancel Subscription Button**
  - Tertiary/danger button
  - Text: "Cancel Subscription"
  - Appears at bottom of section
  - Opens confirmation dialog

### Plan Comparison Section (Optional, Expandable)

- **Comparison Table**
  - Features/limits on rows
  - Plans (current, alternatives) on columns
  - Feature availability: ✓ (included), - (not included)
  - Numeric limits displayed

- **Example Comparison:**

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|-----------|
| Users | 1 | 5 | Unlimited |
| Products | 100 | 500 | Unlimited |
| Storage | 10 GB | 50 GB | 500 GB |
| API Calls | 1,000/mo | 10,000/mo | 50,000/mo |
| Support | Email | Email+Chat | 24/7 Phone |
| Custom Domain | No | Yes | Yes |

- **Switch to Plan Button** (for each alternative)
  - Located in plan column
  - Action: Opens plan change confirmation

### Billing Information Section

#### **Billing Address Card**

- **Current Address Display**
  - Street address
  - City, Postal code, Country
  - Edit button (pencil icon)

- **Billing Address Form (Collapsible/Modal)**
  - Street address field (required)
  - City field (required)
  - Postal code field (required)
  - Country selector dropdown
  - VAT/Tax ID field (optional)
  - Save button
  - Cancel button

#### **Payment Method Card**

- **Current Payment Method Display**
  - Payment method type: "Visa Debit Card"
  - Last 4 digits: "•••• •••• •••• 1234"
  - Expiration date: "Expires: 12/2028"
  - Primary payment method indicator (if multiple)
  - Edit button
  - Remove button (if alternate method exists)

- **Update Payment Method Section**
  - "Update Payment Method" button
  - Opens secure payment form (external or modal)
  - Supported payment methods:
    - Credit/Debit cards (Visa, Mastercard)
    - Bank transfer (if supported)
    - Mobile wallets (if supported)

### Billing History Section

#### **Invoices Table**

- **Column Headers:**
  - Invoice Number (left-aligned)
  - Invoice Date
  - Amount
  - Status
  - Payment Date
  - Actions

- **Sample Row:**

| Invoice # | Date | Amount | Status | Paid Date | Actions |
|-----------|------|--------|--------|-----------|---------|
| INV-2026-0045 | May 15, 2026 | Rs. 4,999 | Paid | May 15, 2026 | [View] [Download] |
| INV-2026-0044 | April 15, 2026 | Rs. 4,999 | Paid | April 15, 2026 | [View] [Download] |
| INV-2026-0043 | March 15, 2026 | Rs. 4,999 | Paid | March 15, 2026 | [View] [Download] |

- **Status Indicators:**
  - Paid: Green checkmark
  - Pending: Yellow warning
  - Overdue: Red exclamation mark

- **Filters:**
  - Filter by date range: From date - To date
  - Filter by status: All / Paid / Pending / Overdue

- **Sort Options:**
  - Sort by date (newest first)
  - Sort by amount
  - Sort by status

- **Pagination:**
  - Show 10/25/50 invoices per page
  - Page navigation controls
  - Total count display

#### **Invoice Actions**

- **View Button:** Opens invoice detail view
- **Download Button:** Downloads invoice as PDF

#### **Invoice Detail View**

- **Invoice Header**
  - Invoice number: INV-2026-0045
  - Invoice date: May 15, 2026
  - Due date: May 31, 2026
  - Status: Paid (with date: May 15, 2026)

- **Bill To Section**
  - Company name
  - Tenant name
  - Billing address

- **Invoice Items**
  - Line items table:
    - Description (e.g., "Professional Plan - Monthly")
    - Quantity
    - Unit Price
    - Amount
  - Subtotal
  - Tax (if applicable)
  - Total amount
  - Amount paid
  - Balance due (if applicable)

- **Payment Information**
  - Payment method used
  - Payment date
  - Reference number/transaction ID

- **Notes Section** (if applicable)
  - Terms and conditions
  - Payment terms

- **Print/Download Options**
  - Print button
  - Download as PDF button

### Subscription History Section

- **Plan Change History Table**
  - Date of change
  - Previous plan
  - New plan
  - Reason (Upgrade / Downgrade / Change)
  - Billing adjustment (refund/charge)
  - Effective date

- **Example:**

| Date | From | To | Reason | Adjustment | Effective |
|------|------|----|---------|-----------|-|
| May 1, 2026 | Starter | Professional | Upgrade | +Rs. 2,500 | May 1, 2026 |
| Feb 15, 2026 | Trial | Starter | Trial Ended | Rs. 1,499 | Feb 15, 2026 |

### Renewal Information Card

- **Next Renewal Date**
  - Prominently displayed: "June 15, 2026"
  - Days until renewal counter

- **Renewal Amount**
  - Amount to be charged: "Rs. 4,999"
  - Breakdown of charges (if applicable)

- **Auto-Renewal Status**
  - Toggle switch: Auto-renewal On/Off
  - Status text: "Auto-renewal is enabled"
  - Confirmation on toggle

- **Renewal Notifications**
  - Toggle: "Send me email reminders before renewal"
  - Notification timing selector: 7 days / 14 days before renewal

### Plan Change Wizard (Modal)

#### **Step 1: Select New Plan**

- **Available Plans Display**
  - Plan cards for each available plan:
    - Plan name (e.g., "Professional")
    - Plan tier badge
    - Monthly/annual pricing
    - Feature list (key features only)
    - Status badge: "Current" / "Recommended" / "Available"
    - Select button

- **Pricing Display**
  - Monthly cost
  - Annual cost (with discount if applicable)
  - Cost comparison to current plan

- **Feature Comparison Link**
  - "See detailed feature comparison"
  - Opens full comparison table

#### **Step 2: Review Changes**

- **Plan Change Summary**
  - Current plan: "Professional (Rs. 4,999/month)"
  - New plan: "Enterprise (Rs. 9,999/month)"
  - Change type: "Upgrade"

- **Billing Impact**
  - Current month charges: "Rs. 4,999 (already paid)"
  - Proration calculation: "Upgrade proration: +Rs. 2,500"
  - Next billing amount: "Rs. 9,999"
  - Next billing date: "June 15, 2026"
  - Total cost for this month: "Rs. 2,500 additional charge"

- **Effective Date**
  - Change effective: "Immediately (Today)"
  - Or: "At next billing cycle (June 15, 2026)"
  - Option selector for timing (if allowed)

- **Confirmation Checkbox**
  - "I understand the changes above"

#### **Step 3: Confirmation**

- **Change Summary**
  - Plan upgrade/downgrade details
  - New billing details
  - Effective date

- **Confirm Button**
  - Primary action: "Confirm Plan Change"
  - Processing indicator during submission

- **Cancel Button**
  - Secondary action: "Cancel"

- **Success Message**
  - After submission: "Plan change successful"
  - "Your new plan is now active"
  - "Receipt sent to email"

### Subscription Cancellation Dialog (Modal)

- **Warning Section**
  - ⚠️ "Are you sure you want to cancel your subscription?"
  - Explanation: "Cancelling your subscription will result in loss of data access"
  - Refund policy: "You may be eligible for a refund depending on your billing cycle"

- **Reason Selector**
  - Label: "Why are you cancelling? (optional)"
  - Dropdown options:
    - "Too expensive"
    - "Features don't meet our needs"
    - "Found a better alternative"
    - "No longer needed"
    - "Other"

- **Comments Field**
  - Text area: "Please let us know how we can improve (optional)"
  - Max 500 characters

- **Final Confirmation**
  - Checkbox: "I understand that my data will be deleted after 30 days"
  - Checkbox: "I want to cancel immediately"

- **Buttons**
  - "Cancel Subscription" (danger/red button, disabled until all checkboxes checked)
  - "Don't Cancel" (secondary button)

- **Post-Cancellation**
  - Confirmation message: "Subscription cancelled"
  - Cancellation date: "Effective: Today"
  - Refund details (if applicable)
  - Data retention notice: "Your data will be available until [date]"
  - Support contact: "Contact us if you change your mind"

---

## Backend API Requirements

### GET /api/tenants/self/subscription/

**Purpose:** Retrieve current subscription information  
**Authentication:** Required (tenant user)  
**Response (200):**
```
{
  "plan_id": "uuid",
  "plan_name": "Professional",
  "plan_tier": "professional",
  "billing_cycle": "monthly",
  "status": "active",
  "start_date": "2026-02-15T00:00:00Z",
  "next_billing_date": "2026-06-15T00:00:00Z",
  "cancel_date": null,
  "is_auto_renew": true,
  "features": [
    {
      "name": "Max Users",
      "value": 5
    },
    {
      "name": "Max Products",
      "value": 500
    },
    {
      "name": "Storage",
      "value": "50 GB"
    },
    {
      "name": "Custom Domain",
      "value": true
    }
  ],
  "limits": {
    "users": 5,
    "products": 500,
    "storage_gb": 50,
    "api_calls_monthly": 10000
  },
  "current_usage": {
    "users": 3,
    "products": 245,
    "storage_gb": 15,
    "api_calls_used": 8500
  },
  "amount": 4999,
  "currency": "LKR"
}
```

### GET /api/plans/

**Purpose:** Retrieve all available plans  
**Authentication:** Required  
**Query Parameters:** 
- `include_inactive` (optional): Include archived plans
**Response (200):**
```
[
  {
    "id": "uuid",
    "name": "Starter",
    "tier": "starter",
    "price": 1499,
    "billing_cycle": "monthly",
    "currency": "LKR",
    "description": "Perfect for small businesses",
    "features": [
      "1 user",
      "100 products",
      "10 GB storage",
      "Email support"
    ],
    "limits": {
      "users": 1,
      "products": 100,
      "storage_gb": 10,
      "api_calls_monthly": 1000
    }
  },
  {
    "id": "uuid",
    "name": "Professional",
    "tier": "professional",
    "price": 4999,
    "billing_cycle": "monthly",
    "currency": "LKR",
    "description": "For growing businesses",
    "features": [
      "5 users",
      "500 products",
      "50 GB storage",
      "Custom domain",
      "Priority support"
    ],
    "limits": {
      "users": 5,
      "products": 500,
      "storage_gb": 50,
      "api_calls_monthly": 10000
    }
  }
]
```

### POST /api/tenants/self/subscription/upgrade/

**Purpose:** Upgrade to a higher plan  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "new_plan_id": "uuid"
}
```
**Response (200):**
```
{
  "success": true,
  "new_plan": "Enterprise",
  "effective_date": "2026-05-31T00:00:00Z",
  "billing_adjustment": {
    "amount": 2500,
    "type": "charge",
    "description": "Proration for upgrade (May 31 - June 15)"
  },
  "new_next_billing_date": "2026-06-15T00:00:00Z",
  "new_amount": 9999
}
```
**Error (400):** No upgrade available, invalid plan_id
**Error (402):** Payment required for upgrade

### POST /api/tenants/self/subscription/downgrade/

**Purpose:** Downgrade to a lower plan  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "new_plan_id": "uuid"
}
```
**Response (200):** Same as upgrade response
**Error (400):** Usage exceeds new plan limits, cannot downgrade

### POST /api/tenants/self/subscription/cancel/

**Purpose:** Cancel subscription  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "reason": "Too expensive",
  "comments": "Looking for cheaper alternative",
  "effective_immediately": true
}
```
**Response (200):**
```
{
  "success": true,
  "cancellation_date": "2026-05-31T00:00:00Z",
  "data_retention_until": "2026-06-30T23:59:59Z",
  "refund_eligible": true,
  "refund_amount": 1249.50,
  "message": "Subscription cancelled successfully"
}
```

### GET /api/tenants/self/invoices/

**Purpose:** List invoices with filtering  
**Authentication:** Required (tenant user)  
**Query Parameters:**
- `start_date` (optional): ISO format date
- `end_date` (optional): ISO format date
- `status` (optional): all, paid, pending, overdue
- `limit` (optional, default 25): 10, 25, 50, 100
- `offset` (optional, default 0): Pagination offset
**Response (200):**
```
{
  "count": 15,
  "next": "/api/tenants/self/invoices/?offset=25",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "number": "INV-2026-0045",
      "date": "2026-05-15T00:00:00Z",
      "amount": 4999,
      "status": "paid",
      "payment_date": "2026-05-15T00:00:00Z",
      "currency": "LKR"
    }
  ]
}
```

### GET /api/tenants/self/invoices/{id}/

**Purpose:** Get invoice detail  
**Authentication:** Required (tenant user)  
**Response (200):**
```
{
  "id": "uuid",
  "number": "INV-2026-0045",
  "date": "2026-05-15T00:00:00Z",
  "due_date": "2026-05-31T00:00:00Z",
  "amount": 4999,
  "status": "paid",
  "payment_date": "2026-05-15T00:00:00Z",
  "items": [
    {
      "description": "Professional Plan - Monthly",
      "quantity": 1,
      "unit_price": 4999,
      "amount": 4999
    }
  ],
  "subtotal": 4999,
  "tax": 0,
  "total": 4999,
  "payment_method": "Visa ending in 1234",
  "billing_address": {
    "street": "123 Business St",
    "city": "Colombo",
    "postal_code": "00100",
    "country": "LK"
  }
}
```

### POST /api/tenants/self/invoices/{id}/download/

**Purpose:** Download invoice as PDF  
**Authentication:** Required (tenant user)  
**Response:** PDF file (Content-Type: application/pdf)

### PATCH /api/tenants/self/billing-address/

**Purpose:** Update billing address  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "street": "123 Business Street",
  "city": "Colombo",
  "postal_code": "00100",
  "country": "LK",
  "vat_id": "LK123456789"
}
```
**Response (200):** Updated billing address details

### PATCH /api/tenants/self/payment-method/

**Purpose:** Update payment method  
**Authentication:** Required (tenant admin)  
**Request Body:** (Depends on payment processor)
```
{
  "token": "payment_token_from_processor",
  "is_primary": true
}
```
**Response (200):**
```
{
  "success": true,
  "payment_method": {
    "type": "card",
    "card_type": "Visa",
    "last_4": "1234",
    "expiry": "12/2028"
  }
}
```

### GET /api/tenants/self/subscription/history/

**Purpose:** Get subscription change history  
**Authentication:** Required (tenant user)  
**Query Parameters:**
- `limit` (optional, default 25)
- `offset` (optional, default 0)
**Response (200):**
```
{
  "count": 3,
  "results": [
    {
      "date": "2026-05-01T00:00:00Z",
      "from_plan": "Starter",
      "to_plan": "Professional",
      "reason": "upgrade",
      "adjustment": 2500,
      "effective_date": "2026-05-01T00:00:00Z"
    }
  ]
}
```

---

## Database Requirements

### Subscription Model

Fields to ensure/extend:

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| tenant_id | ForeignKey | No | - | Link to tenant |
| plan_id | ForeignKey | No | - | Link to plan |
| status | CharField | No | "active" | active, trial, suspended, expired |
| start_date | DateTimeField | No | - | When subscription started |
| next_billing_date | DateTimeField | No | - | Next charge date |
| cancel_date | DateTimeField | Yes | NULL | When/if cancelled |
| is_auto_renew | BooleanField | No | True | Auto-renewal flag |
| created_at | DateTimeField | Auto | - | Creation timestamp |
| updated_at | DateTimeField | Auto | - | Last update timestamp |

### Invoice Model

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| tenant_id | ForeignKey | No | - | Link to tenant |
| subscription_id | ForeignKey | Yes | NULL | Link to subscription |
| number | CharField | No | - | Invoice number (INV-2026-0001) |
| amount | DecimalField | No | - | Invoice total |
| status | CharField | No | "pending" | pending, paid, overdue |
| due_date | DateTimeField | No | - | Payment due date |
| paid_date | DateTimeField | Yes | NULL | When paid |
| payment_method | CharField | Yes | NULL | Payment method used |
| created_at | DateTimeField | Auto | - | Creation timestamp |

### BillingAddress Model

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| tenant_id | ForeignKey | No | - | Link to tenant |
| street | CharField | No | - | Street address |
| city | CharField | No | - | City |
| postal_code | CharField | No | - | Postal code |
| country | CharField | No | - | Country code (ISO 3166) |
| vat_id | CharField | Yes | NULL | VAT/Tax ID |
| created_at | DateTimeField | Auto | - | Creation timestamp |
| updated_at | DateTimeField | Auto | - | Last update timestamp |

### PaymentMethod Model

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| tenant_id | ForeignKey | No | - | Link to tenant |
| type | CharField | No | - | card, bank_transfer, etc. |
| is_primary | BooleanField | No | True | Primary payment method |
| masked_details | CharField | No | - | •••• •••• •••• 1234 |
| gateway_token | CharField | No | - | Token from payment gateway |
| created_at | DateTimeField | Auto | - | Creation timestamp |

### SubscriptionHistory Model

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| tenant_id | ForeignKey | No | - | Link to tenant |
| from_plan_id | ForeignKey | Yes | NULL | Previous plan |
| to_plan_id | ForeignKey | No | - | New plan |
| change_date | DateTimeField | No | - | When changed |
| reason | CharField | No | - | upgrade, downgrade, etc. |
| adjustment | DecimalField | No | 0 | Billing adjustment |
| created_at | DateTimeField | Auto | - | Creation timestamp |

### Indexes

```
CREATE INDEX idx_subscription_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscription_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscription_status ON subscriptions(status);
CREATE INDEX idx_invoice_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoice_status ON invoices(status);
CREATE INDEX idx_invoice_date ON invoices(date);
CREATE INDEX idx_billing_address_tenant_id ON billing_addresses(tenant_id);
CREATE INDEX idx_payment_method_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_subscription_history_tenant_id ON subscription_history(tenant_id);
```

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Subscription model | ✓ Exists | Core fields exist |
| Plan system | ✓ Exists | Complete plan structure |
| Subscription service | ✓ Exists | Partial implementation |
| Billing page | ✓ Partial | Admin view only |
| Invoice model | ? Unclear | May exist, may need extension |
| Subscription & Billing UI | ✗ Not implemented | Self-service view missing |
| Current plan display | ✗ Not implemented | UI component missing |
| Plan upgrade/downgrade | ✗ Not implemented | Self-service workflow missing |
| Plan comparison | ✗ Not implemented | Comparison UI missing |
| Billing history | ✗ Not implemented | Invoice list UI missing |
| Invoice downloads | ✗ Not implemented | PDF generation missing |
| Payment method UI | ✗ Not implemented | Payment management missing |
| Billing address management | ✗ Not implemented | Address UI missing |
| Subscription cancellation | ✗ Not implemented | Cancellation workflow missing |

---

## Validation & Edge Cases

### Plan Change Validation

- **Cannot downgrade** if current usage exceeds new plan limits
- **Proration calculations** required for mid-cycle changes
- **Trial subscriptions** cannot be downgraded immediately
- **Payment method** must exist for paid plans
- **Plan changes** effective date must be future or immediate
- **Confirmation required** before plan change processed

### Billing Address Validation

- **Street address** required, non-empty
- **City** required
- **Postal code** required (format varies by country)
- **Country** must be valid ISO country code
- **VAT ID** format validation (if provided)

### Payment Method Validation

- **Valid payment processor token** required
- **Expiration date** validation (if card)
- **Billing address** must exist for payment method
- **Only one primary** payment method per tenant
- **Failed payments** require retry logic

### Subscription Cancellation Validation

- **Cannot cancel** if payments pending
- **Data retention** period enforced (typically 30 days)
- **Refund calculation** based on billing cycle
- **Cancellation feedback** logged for improvement
- **Reactivation** not allowed immediately after cancellation

### Invoice Generation Validation

- **Invoice number** format enforced (INV-YYYY-NNNN)
- **Invoice sequence** strictly incrementing
- **Invoice date** matches billing cycle
- **Invoice amounts** match subscription amounts exactly
- **Tax calculation** consistent with configuration

### Payment Processing Validation

- **Payment gateway** integration working
- **Failed payments** require retry (exponential backoff)
- **Payment timeout** handling (20-30 seconds)
- **Duplicate payment** prevention
- **Refund processing** validated

---

## Testing Checklist

### Subscription Display

- [ ] Current subscription loads without error
- [ ] Plan name, tier, billing cycle display
- [ ] Subscription status displays
- [ ] Next billing date displays
- [ ] Auto-renewal status displays
- [ ] Plan features list displays
- [ ] Current usage displays
- [ ] Usage progress bars display

### Plan Changes

- [ ] Upgrade plan button visible (if applicable)
- [ ] Downgrade plan button visible (if applicable)
- [ ] Plan comparison displays correctly
- [ ] Wizard step 1: Plan selection works
- [ ] Wizard step 2: Review shows proration calculation
- [ ] Wizard step 3: Confirmation successful
- [ ] Plan change confirmed in system
- [ ] Email confirmation sent

### Billing Information

- [ ] Billing address displays
- [ ] Edit billing address form works
- [ ] Valid addresses can be saved
- [ ] Invalid addresses rejected
- [ ] Payment method displays
- [ ] Update payment method button works
- [ ] Remove payment method works (if multiple)

### Invoices

- [ ] Invoice list displays
- [ ] Filters work (date range, status)
- [ ] Sorting works
- [ ] Pagination works
- [ ] Invoice status indicators display
- [ ] View invoice detail works
- [ ] Invoice detail displays all information
- [ ] Download invoice as PDF works
- [ ] Downloaded PDF contains correct data

### Subscription History

- [ ] Subscription change history displays
- [ ] All past changes listed
- [ ] Change details correct
- [ ] Billing adjustments show

### Cancellation

- [ ] Cancellation dialog displays
- [ ] Warning message shows
- [ ] Reason selector works
- [ ] Comments field accepts input
- [ ] Confirmation checkboxes required
- [ ] Cancellation processes
- [ ] Confirmation email sent
- [ ] Data retention message shown

### Edge Cases

- [ ] Trial subscription displays correctly
- [ ] Expired subscription shows status
- [ ] Suspended subscription shows reason
- [ ] Cannot downgrade with excessive usage
- [ ] Proration calculates correctly
- [ ] Mid-cycle changes apply immediately
- [ ] End-of-cycle changes apply at renewal
- [ ] Failed payment shows retry option
- [ ] Responsive design works

---

## Implementation Checklist

### Frontend Components

- [ ] Subscription & Billing page component
- [ ] Current plan component
- [ ] Plan features component
- [ ] Usage display component
- [ ] Plan comparison component
- [ ] Plan change wizard component
- [ ] Cancellation dialog component
- [ ] Billing information component
- [ ] Billing address form component
- [ ] Payment method component
- [ ] Invoices list component
- [ ] Invoice detail component
- [ ] Subscription history component

### Frontend Logic

- [ ] API client methods (all endpoints)
- [ ] State management (Redux/Context)
- [ ] Form validation
- [ ] Error handling and retry logic
- [ ] Success notification display
- [ ] Loading states
- [ ] Date formatting utilities
- [ ] Currency formatting utilities
- [ ] Invoice PDF viewer/download

### Backend API

- [ ] GET /api/tenants/self/subscription/
- [ ] GET /api/plans/
- [ ] POST /api/tenants/self/subscription/upgrade/
- [ ] POST /api/tenants/self/subscription/downgrade/
- [ ] POST /api/tenants/self/subscription/cancel/
- [ ] GET /api/tenants/self/invoices/
- [ ] GET /api/tenants/self/invoices/{id}/
- [ ] POST /api/tenants/self/invoices/{id}/download/
- [ ] PATCH /api/tenants/self/billing-address/
- [ ] PATCH /api/tenants/self/payment-method/
- [ ] GET /api/tenants/self/subscription/history/

### Backend Services

- [ ] Subscription service enhancements
- [ ] Invoice service
- [ ] Proration calculation service
- [ ] Payment processing integration
- [ ] Email notification service
- [ ] PDF generation service

### Database

- [ ] Subscription model extensions
- [ ] Invoice model (create or extend)
- [ ] BillingAddress model (create or extend)
- [ ] PaymentMethod model (create or extend)
- [ ] SubscriptionHistory model (create or extend)
- [ ] Migrations
- [ ] Data backfill
- [ ] Indexes

### Security

- [ ] Authorization checks (tenant admin for modifications)
- [ ] PCI compliance for payment methods (no storage of full card numbers)
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Rate limiting on critical endpoints

### Integrations

- [ ] Payment gateway integration (PayHere, Stripe)
- [ ] PDF generation (ReportLab, WeasyPrint, etc.)
- [ ] Email service integration
- [ ] Logging and monitoring

### Testing

- [ ] Unit tests for backend services
- [ ] Integration tests for API endpoints
- [ ] Component tests for frontend
- [ ] End-to-end tests for user flows
- [ ] Performance tests
- [ ] Security tests
- [ ] Payment gateway sandbox testing

### Documentation

- [ ] API endpoint documentation
- [ ] Frontend component documentation
- [ ] Payment gateway setup guide
- [ ] PDF generation setup
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review:** All changes peer-reviewed
2. **Testing:** Full test suite passing
3. **Security Audit:** Payment handling reviewed
4. **Compliance Check:** PCI DSS compliance verified
5. **Documentation:** All docs current
6. **Backup:** Database backup created

### Deployment Steps

1. **Database Migration**
   - Deploy migration script
   - Verify schema changes
   - Create required indexes

2. **Backend Deployment**
   - Deploy new/updated services
   - Deploy API endpoints
   - Deploy PDF generation service
   - Verify endpoints working

3. **Payment Gateway Configuration**
   - Sandbox testing complete
   - Production credentials configured
   - Webhook endpoints configured
   - Error handling tested

4. **Frontend Deployment**
   - Deploy subscription & billing components
   - Deploy updated navigation
   - Verify pages load correctly
   - Test in staging environment

5. **Testing Phase**
   - Upgrade/downgrade plan manually
   - Verify billing calculations
   - Test invoice download
   - Test payment method updates
   - End-to-end testing in staging

### Post-Deployment

1. **Monitoring**
   - Monitor API error rates
   - Monitor payment processing
   - Monitor failed subscriptions
   - Monitor performance metrics

2. **Alerting**
   - Alert on failed plan changes
   - Alert on payment failures
   - Alert on API errors
   - Alert on performance degradation

3. **Staff Training**
   - Train support team
   - Prepare FAQ and troubleshooting
   - Demo feature in team meeting

4. **User Communication**
   - Announce feature to tenants
   - Provide user guide
   - Offer support during rollout

### Rollback Plan

- **If Critical Issue:** Rollback database migration
- **Maintain Data:** All subscription and billing data remains intact
- **Previous UI:** Revert frontend to previous version
- **Verification:** Test rollback in staging first

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Subscription load | <300ms | Initial page render |
| Invoices list load | <500ms | 25 invoices per page |
| Plan change | <2s | API response time |
| Invoice download | <3s | PDF generation |
| Billing address save | <500ms | API response time |
| Payment method update | <2s | Gateway processing |

---

## Monitoring & Alerting

### Metrics to Track

- Subscription status distribution (active, trial, suspended, expired)
- Plan upgrade/downgrade frequency
- Average time to upgrade/downgrade
- Invoice generation frequency
- Payment success/failure rate
- Average payment processing time
- Failed payment retry success rate
- Subscription cancellation rate
- Cancellation reasons (feedback analysis)
- API response times by endpoint
- Error rates by endpoint

### Alerts

- **Alert on:** >5% subscription update failures
- **Alert on:** >10% payment failures
- **Alert on:** >20% plan change failures
- **Alert on:** Invoice generation failure
- **Alert on:** API response time >2s
- **Alert on:** >5% of subscriptions past due

### Dashboard

- Subscription metrics (counts by status)
- Revenue tracking (MRR, ARR)
- Plan distribution (users per plan)
- Churn rate (cancellations)
- Upgrade/downgrade trends
- Payment metrics (success rate, avg processing time)
- Error trend analysis

---

## Documentation Requirements

### For Users

1. **Subscription Management Guide**
   - How to view current subscription
   - How to upgrade/downgrade plan
   - How to cancel subscription
   - Billing cycle explanation
   - Proration explanation

2. **Plan Selection Guide**
   - Feature comparison
   - How to choose right plan
   - Upgrade/downgrade scenarios
   - Custom plans (if available)

3. **Billing Guide**
   - How to view billing address
   - How to update payment method
   - How invoices are generated
   - Invoice payment terms

4. **Invoice Guide**
   - How to view invoices
   - How to download invoice
   - Invoice format explanation
   - How to read invoice

5. **Payment Guide**
   - Accepted payment methods
   - How to update payment method
   - Payment security (PCI compliance)
   - Payment failure resolution
   - Refund policy

6. **Troubleshooting Guide**
   - Subscription not showing correctly
   - Plan change failed
   - Payment method not accepted
   - Invoice not generating
   - Contact support

### For Administrators

1. **API Documentation**
   - Endpoint specs
   - Request/response examples
   - Error codes and meanings
   - Rate limiting
   - Authentication

2. **Deployment Guide**
   - Installation steps
   - Payment gateway setup
   - Database migration
   - Configuration options
   - Testing procedures

3. **Monitoring Guide**
   - Key metrics
   - Alert setup
   - Troubleshooting
   - Performance tuning

---

## Future Enhancements

### Short Term

- **Usage-based Billing:** Additional charges for overage
- **Metered Billing:** Real-time usage tracking and charges
- **Prepaid Plans:** Pay upfront for discounted rates
- **Coupon Support:** Discount codes for subscriptions
- **Volume Discounts:** Better rates for higher volume

### Medium Term

- **Annual vs Monthly:** Flexible billing cycles
- **Team Plans:** Different pricing for team sizes
- **Feature Bundles:** Custom feature combinations
- **Multi-currency:** Support for multiple currencies
- **Tax Integration:** Automatic tax calculation

### Long Term

- **Usage Recommendations:** AI-based plan recommendations
- **Feature Trials:** Temporary trial of premium features
- **Billing Webhooks:** Real-time billing events
- **Invoice Customization:** Tenant-branded invoices
- **Advanced Analytics:** Billing and revenue analytics

---

**End of Document 107**
