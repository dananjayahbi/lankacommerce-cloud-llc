# Smart Search Advanced Analytics & Features Specification

## Executive Summary

The Smart Search Advanced Analytics & Features specification provides comprehensive search analytics dashboards, trending analysis, query suggestions, saved searches, and search alerts enabling users to optimize search experiences and administrators to understand search patterns, identify opportunities, and improve search infrastructure performance.

---

## Current State Analysis

### EXISTING Infrastructure
- Search bar and results page (from previous features)
- User authentication and preferences
- Basic analytics infrastructure (may exist)
- User accounts with profile management
- Email notification infrastructure (likely)

### MISSING Infrastructure (Entirely or Partially)
- Search analytics model and tracking
- Query suggestion engine
- Trending search tracking and calculation
- Saved searches functionality
- Search alerts and scheduling
- Search performance metrics
- Popular searches ranking
- Search pattern analysis
- No results search tracking
- Zero-result search handling
- Typo/spelling suggestion
- Query refinement suggestions
- Search analytics dashboard
- Trending visualization
- Alert scheduler/processor
- Search analytics reporting

---

## Frontend Features

### Search Analytics Dashboard (Admin Panel)

#### Access & Permissions
- **URL**: `/admin/search/analytics/`
- **Permission Required**: `search.view_analytics` or `admin.view`
- **Role**: Admin, Manager, Analytics

#### Overview Tab - Key Metrics

##### Metrics Cards
```
┌─────────────────────┬─────────────────┬────────────────┐
│ Total Searches      │ Unique Queries  │ Avg. per User  │
│ 45,234              │ 8,932           │ 12.3           │
│ ↑ 23% (vs last mo)  │ ↑ 15% (vs last) │ ↓ 2% (vs last) │
└─────────────────────┴─────────────────┴────────────────┘

┌─────────────────────┬─────────────────┬────────────────┐
│ Success Rate        │ Avg. Results    │ Most Popular   │
│ 87.4%               │ 45.2            │ "iPhone 12"    │
│ ↑ 3.2% (vs last)    │ ↓ 2.1 (vs last) │ 1,450 searches │
└─────────────────────┴─────────────────┴────────────────┘
```

**Metrics Definition**:
- **Total Searches**: All searches performed
- **Unique Queries**: Count of distinct search terms
- **Avg Searches per User**: Total searches / active users
- **Success Rate**: (Searches with results / Total searches) × 100
- **Avg Results per Search**: Total results returned / total searches
- **Most Popular Search**: Top searched term

##### Time Period Selector
- Last 7 days (default)
- Last 30 days
- Last 90 days
- Last year
- Custom date range

##### Charts

###### Searches Over Time (Line Chart)
- X-axis: Days
- Y-axis: Search count
- Show successful searches (green) and no-result searches (red)
- Hover tooltip shows exact counts
- Click to drill down to day

###### Search by Result Type (Pie Chart)
```
Products        42% (18,957)
Orders          28% (12,564)
Customers       18% (8,101)
Invoices        12% (5,612)
```

###### Search Success vs No Results (Area Chart)
- Stacked area showing successful searches
- Show no-result searches as separate area
- Trend line for success rate

---

#### Trending Searches Tab

##### Trending Searches List (This Week)
```
Rank | Search Term        | Count | Trend | Type     | Result Count
────┼────────────────────┼───────┼───────┼──────────┼──────────────
  1  | iPhone 12          | 1,234 | ↑↑    | products | 876
  2  | Samsung Galaxy     |   987 | ↑     | products | 654
  3  | Order Status       |   876 | ═     | orders   | 234
  4  | Customer Support   |   765 | ↓     | customers| 89
  5  | Invoice Payment    |   654 | ↓↓    | invoices | 45
```

**Features**:
- Sort by popularity, trend direction, search count
- Filter by result type (products, orders, customers, invoices)
- Filter by trend (trending up, stable, trending down)
- Click search term to see results
- Drill down to see user segments

##### Trending Visualization (Word Cloud)
- Size represents search frequency
- Color represents trend direction (green: up, gray: stable, red: down)
- Click word to see details
- Hover shows search count

##### Trending Timeline
- X-axis: Date
- Y-axis: Search frequency
- Multiple lines for top N searches
- Show when trends peaked
- Highlight anomalies

---

#### No Results Searches Tab

##### Searches with No Results
```
Search Term        | Count | % of Total | Last Searched | Opportunity
────────────────────┼───────┼────────────┼───────────────┼──────────────
iPad Air           |   234 | 0.52%      | Today         | Create product
Samsung Monitor    |   189 | 0.42%      | 2 days ago    | Add category
Bulk Order         |    98 | 0.22%      | 5 days ago    | Feature request
Free Shipping      |    87 | 0.19%      | Last week     | FAQ article
```

**Actions per Search**:
- "Create Product" button (for product-like searches)
- "Create Category" button (for category-like searches)
- "Add FAQ Article" button (for common questions)
- "Ignore" button (for spam/test searches)
- "Archive" button (for outdated terms)

##### Opportunities Section
```
Recommended Actions:

1. Create Missing Products (High Priority)
   • iPad Air (234 searches)
   • Samsung Monitor (189 searches)
   → [Create Products]

2. Create Missing Categories (Medium Priority)
   • Electronics > Tablets (234 searches)
   • Electronics > Monitors (189 searches)
   → [Create Categories]

3. Create FAQ Articles (Low Priority)
   • "How to check order status?" (198 searches)
   • "What's the return policy?" (167 searches)
   → [Create FAQs]
```

---

#### Search Performance Tab

##### Performance Metrics
```
┌─────────────────────┬──────────────────┬──────────────┐
│ Avg Response Time   │ P95 Response      │ P99 Response │
│ 234 ms              │ 450 ms            │ 890 ms       │
│ ↓ 12ms (vs last)    │ ↓ 20ms (vs last)  │ ↓ 50ms       │
└─────────────────────┴──────────────────┴──────────────┘

┌─────────────────────┬──────────────────┬──────────────┐
│ DB Query Time       │ Index Health      │ Cache HitRate│
│ 145 ms              │ 98% healthy       │ 76.4%        │
│ ↓ 5ms (vs last)     │ No issues         │ ↑ 2.1%       │
└─────────────────────┴──────────────────┴──────────────┘
```

**Metrics**:
- **Avg Response Time**: Average search API response time
- **P95/P99 Response**: 95th/99th percentile response times
- **DB Query Time**: Database query execution time
- **Index Health**: Full-text search index health percentage
- **Cache Hit Rate**: Percentage of cached search results

##### Performance Charts

###### Query Time Trend (Line Chart)
- X-axis: Days
- Y-axis: Response time (ms)
- Show min, max, average lines
- Highlight degradation events

###### Index Health Status (Gauge/Radial)
- Show percentage health
- Color: Green (>95%), Yellow (85-95%), Red (<85%)
- Last updated timestamp

###### Response Time Distribution (Histogram)
- Buckets: <100ms, 100-200ms, 200-500ms, 500-1000ms, >1000ms
- Show count and percentage per bucket

---

#### User-Level Search Analytics Tab

##### Top Searching Users
```
User Name       | Search Count | Avg. Results | Last Search
─────────────────┼──────────────┼──────────────┼──────────────
John Doe        |     234      |     45.2     | 1 hour ago
Jane Smith      |     189      |     38.1     | 3 hours ago
Bob Johnson     |     156      |     52.3     | Yesterday
Alice Williams  |     134      |     41.7     | 2 days ago
```

##### Search Frequency Distribution (Histogram)
```
Searches per User | User Count | % of Users
──────────────────┼────────────┼────────────
0-5               |    1,234   | 45.2%
5-20              |      876   | 32.1%
20-50             |      345   | 12.6%
50-100            |       98   | 3.6%
100+              |       47   | 1.7%
```

##### Most Common Search Terms by User Segment
```
All Users:
1. iPhone 12          (1,234)
2. Samsung Galaxy     (987)
3. Order Status       (876)

Premium Customers:
1. Bulk Order         (234)
2. Custom Pricing     (189)
3. Invoice Reports    (167)

Regular Customers:
1. iPhone 12          (945)
2. Free Shipping      (876)
3. Best Deal          (765)
```

---

### Saved Searches (User Feature)

#### Saved Searches List
```
Search Name                | Query              | Type     | Created    | Uses
─────────────────────────────────────────────────────────────────────────────
Recent iPhone Orders       | "order iphone"     | orders   | May 25     | 12
High-Price Products        | price:500-1000     | products | May 20     | 8
Premium Customer Orders    | "tier:premium"     | orders   | May 15     | 15
Electronics Inventory      | "category:elec"    | products | May 10     | 23
```

**Actions per Saved Search**:
- "View Results" - Execute saved search
- "Edit" - Modify search name or query
- "Delete" - Remove saved search
- "Share" - Share with team members
- "Star/Favorite" - Pin to favorites
- "Export" - Export results to CSV/PDF
- "Schedule Alert" - Create alert for this search

#### Create/Save Search Dialog
```
Save this search?

Search Name: [____________________]
             [Recent iPhone Orders]

Query: order iphone

Type: [Orders ▼]

Include Filters:
☑ Price range (500-1000)
☑ Status (Completed)
☐ Date range

☑ Make favorites (pin to header)
☑ Allow sharing with team

[Cancel] [Save]
```

#### Saved Searches Quick Access
- **In Header**: Dropdown with favorite searches (up to 5)
- **In Search Results Page**: "Save this search" button
- **Dashboard Widget**: Recent saved searches widget

---

### Search Alerts (User Feature)

#### Create Alert Dialog
```
Create Search Alert

Alert Name: [___________________________]
            [Weekly iPhone Sales]

Search Query: "order iphone"

Alert Frequency:
☑ Daily
☐ Weekly (Every Monday)
☐ Monthly (On the 1st)
☐ Only when new results appear

Notification Channels:
☑ Email: [john@example.com]
☑ In-App Notification
☐ SMS
☐ Webhook/API

Alert Conditions (Optional):
☐ Only when > X results returned
☐ Only when result count changed
☐ Only if specific values matched

[Create Alert] [Cancel]
```

#### Manage Alerts List
```
Alert Name              | Query              | Frequency | Status    | Last Ran
─────────────────────────────────────────────────────────────────────────────
Weekly iPhone Sales     | "order iphone"     | Weekly    | Active    | Jun 1
High Stock Products     | "stock:high"       | Daily     | Active    | Today
Customer Support Tickets| "status:open"      | Daily     | Paused    | Jun 2
Pending Invoices        | "payment:pending"  | Weekly    | Failed    | Jun 3
```

**Actions per Alert**:
- "Edit" - Modify alert settings
- "View Results" - See last execution results
- "Pause/Resume" - Toggle alert
- "Delete" - Remove alert
- "Test" - Manually trigger alert

#### Alert Execution History
```
Alert: Weekly iPhone Sales

Execution Date | Status  | Results | Recipients | Next Run
──────────────┼─────────┼─────────┼────────────┼───────────
Jun 1, 2026   | Success | 1,234   | john@ex.com| Jun 8
May 25, 2026  | Success | 1,189   | john@ex.com| Jun 1
May 18, 2026  | Success | 1,345   | john@ex.com| May 25
May 11, 2026  | Failed  | -       | -          | May 18
```

---

### Query Suggestions & Corrections

#### Displayed to Users When:

##### Typo Detected
```
🔍 Did you mean: "iPhone 12"?

Showing results for "iphne 12" instead. [Click to search for "iPhone 12"]
```

##### Ambiguous Query
```
💡 You might be looking for:
• iPhone 12 (Product)
• iPhone 12 Pro (Product)
• iPhone 12 Order (Order)
```

##### Alternative Spellings
```
Also try:
• "iPhone" (without model)
• "iPhone 12" (correct spelling)
• "Apple iPhone 12" (full name)
```

##### Synonyms & Related Terms
```
Related searches:
• Samsung Galaxy (Alternative brand)
• Smartphone (General category)
• Mobile phone (Alternative name)
```

#### Query Suggestion UI Components

##### In Autocomplete Dropdown
- Show suggestions as separate section
- Clickable suggestion pills
- Show reason for suggestion

##### In Search Results Page
- Show as banner at top
- "Did you mean: [suggestion]" format
- Show alternative searches
- Show related searches

---

### Advanced Search Page

#### URL & Access
- **URL**: `/search/advanced` or `/search?advanced=1`
- **Access**: All users
- **Navigation**: Link from search results page

#### Advanced Search Form

##### Form Layout
```
Advanced Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search Options:

All these words:
[________________________] (AND logic)

Exact phrase:
["___________________"] (Phrase search)

Any of these words:
[________________________] (OR logic)

None of these words:
[________________________] (NOT logic)

Search in:
☑ Product names
☑ Product descriptions
☑ Product SKU
☑ Product categories
☑ Order numbers
☑ Customer names
☑ Invoice numbers

Result Type: [All ▼]
  ☐ Products
  ☐ Orders
  ☐ Customers
  ☐ Invoices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Advanced Filters:

Product-Specific (if selected):
  Category: [_______________] [browse]
  Price Range: Min: [____] Max: [____]
  Stock Status: [In Stock ▼]
  Rating: [★★★★☆ and up ▼]
  Brand: [_______________]

Order-Specific (if selected):
  Customer: [_______________] [search]
  Order Status: [All ▼]
  Date Range: From: [__/__/____] To: [__/__/____]
  Total Range: Min: [____] Max: [____]

Customer-Specific (if selected):
  Customer Type: [Individual ▼]
  Tier: [All ▼]
  Region: [_______________]
  Registration Date: From: [__/__/____] To: [__/__/____]

Invoice-Specific (if selected):
  Payment Status: [All ▼]
  Invoice Date: From: [__/__/____] To: [__/__/____]
  Amount Range: Min: [____] Max: [____]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Search] [Clear Form] [Save as Search]

Search Tips:
• Use quotes for exact phrases: "iPhone 12 Pro"
• Use * as wildcard: "iPhone 1*"
• Use + for required terms: +iPhone -case
• Combine filters for precise results
```

##### Form Sections

###### Text Search Fields
- **All these words**: AND logic (all terms must match)
- **Exact phrase**: Phrase search (words in exact order)
- **Any of these words**: OR logic (any term can match)
- **None of these words**: NOT logic (exclude terms)

###### Search Scope (Checkboxes)
- Product names
- Product descriptions
- Product SKU
- Product categories
- Order numbers
- Customer names
- Customer email
- Invoice numbers

###### Result Type Selector
- Radio buttons: All, Products, Orders, Customers, Invoices
- Shows result count per type dynamically

###### Dynamic Advanced Filters (Based on Type)
- Show/hide based on selected result type
- Collapsible sections for each type

##### Form Behavior
- **Real-time Validation**: Show errors as user fills form
- **Dynamic Filter Display**: Show only relevant filters for selected type
- **Saved Searches**: Load saved search into form
- **Form Reset**: Clear form button
- **Save Search**: After searching, allow saving search

---

## Backend API Requirements

### GET /api/v1/search/analytics/

**Purpose**: Retrieve search analytics dashboard data

**Query Parameters**:
- `date_from` (optional): ISO 8601 start date
- `date_to` (optional): ISO 8601 end date
- `aggregation` (optional): "daily", "weekly", "monthly" (default: "daily")
- `scope` (optional): "all", "products", "orders", "customers", "invoices"

**Response** (200 OK):
```json
{
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "metrics": {
    "total_searches": 45234,
    "unique_queries": 8932,
    "avg_searches_per_user": 12.3,
    "success_rate": 0.874,
    "avg_results_per_search": 45.2,
    "most_popular_search": {
      "query": "iPhone 12",
      "search_count": 1450
    }
  },
  "trend": {
    "total_searches_change_pct": 0.23,
    "unique_queries_change_pct": 0.15,
    "success_rate_change_pct": 0.032
  },
  "time_series": [
    {
      "date": "2026-05-01",
      "total_searches": 1234,
      "successful_searches": 1078,
      "no_result_searches": 156
    }
  ],
  "result_types": {
    "products": { "count": 18957, "percentage": 0.42 },
    "orders": { "count": 12564, "percentage": 0.28 },
    "customers": { "count": 8101, "percentage": 0.18 },
    "invoices": { "count": 5612, "percentage": 0.12 }
  }
}
```

---

### GET /api/v1/search/trending/

**Purpose**: Get trending searches

**Query Parameters**:
- `time_period` (optional): "24h", "7d", "30d", "all" (default: "7d")
- `limit` (optional): Max results (default: 20)
- `scope` (optional): "products", "orders", "customers", "invoices", "all"

**Response** (200 OK):
```json
{
  "time_period": "7d",
  "trending_searches": [
    {
      "rank": 1,
      "query": "iPhone 12",
      "search_count": 1234,
      "search_count_prev_period": 1089,
      "trend_direction": "up",
      "trend_score": 0.95,
      "result_types": {
        "products": 876,
        "orders": 189
      }
    }
  ]
}
```

---

### GET /api/v1/search/no-results/

**Purpose**: Get searches with no results

**Query Parameters**:
- `limit` (optional): Max results (default: 50)
- `date_from` (optional): ISO 8601 date
- `date_to` (optional): ISO 8601 date
- `min_count` (optional): Minimum search count (default: 1)

**Response** (200 OK):
```json
{
  "no_results_searches": [
    {
      "query": "iPad Air",
      "search_count": 234,
      "last_searched": "2026-05-31T10:00:00Z",
      "result_type_filter_applied": "products",
      "opportunity": "create_product",
      "suggested_action": "Create product 'iPad Air'"
    }
  ]
}
```

---

### POST /api/v1/search/saved/

**Purpose**: Save a search for user

**Request Body**:
```json
{
  "name": "Recent iPhone Orders",
  "query": "order iphone",
  "result_type": "orders",
  "filters": {
    "status": ["processing", "completed"],
    "date_from": "2026-05-01"
  },
  "is_favorite": true
}
```

**Response** (201 Created):
```json
{
  "id": "saved_search_123",
  "name": "Recent iPhone Orders",
  "query": "order iphone",
  "result_type": "orders",
  "created_at": "2026-05-31T10:00:00Z",
  "use_count": 0
}
```

---

### GET /api/v1/search/saved/

**Purpose**: Get user's saved searches

**Response** (200 OK):
```json
{
  "total": 5,
  "saved_searches": [
    {
      "id": "saved_search_123",
      "name": "Recent iPhone Orders",
      "query": "order iphone",
      "result_type": "orders",
      "created_at": "2026-05-31T10:00:00Z",
      "last_used": "2026-05-31T14:00:00Z",
      "use_count": 12,
      "is_favorite": true
    }
  ]
}
```

---

### PATCH /api/v1/search/saved/{id}/

**Purpose**: Update saved search

**Request Body**:
```json
{
  "name": "My Recent Orders",
  "is_favorite": false
}
```

**Response** (200 OK):
```json
{
  "id": "saved_search_123",
  "name": "My Recent Orders",
  "is_favorite": false
}
```

---

### DELETE /api/v1/search/saved/{id}/

**Purpose**: Delete saved search

**Response** (204 No Content)

---

### POST /api/v1/search/alerts/

**Purpose**: Create search alert

**Request Body**:
```json
{
  "name": "Weekly iPhone Sales",
  "query": "order iphone",
  "result_type": "orders",
  "frequency": "weekly",
  "frequency_config": {
    "day_of_week": "monday",
    "time": "09:00"
  },
  "channels": ["email", "in_app"],
  "recipients": ["john@example.com"],
  "conditions": {
    "min_results": 100,
    "notify_on_change": true
  }
}
```

**Response** (201 Created):
```json
{
  "id": "alert_456",
  "name": "Weekly iPhone Sales",
  "query": "order iphone",
  "frequency": "weekly",
  "is_active": true,
  "created_at": "2026-05-31T10:00:00Z",
  "next_execution": "2026-06-02T09:00:00Z"
}
```

---

### GET /api/v1/search/alerts/

**Purpose**: Get user's search alerts

**Response** (200 OK):
```json
{
  "total": 3,
  "alerts": [
    {
      "id": "alert_456",
      "name": "Weekly iPhone Sales",
      "query": "order iphone",
      "frequency": "weekly",
      "channels": ["email", "in_app"],
      "is_active": true,
      "created_at": "2026-05-31T10:00:00Z",
      "last_executed": "2026-06-01T09:00:00Z",
      "next_execution": "2026-06-08T09:00:00Z"
    }
  ]
}
```

---

### PATCH /api/v1/search/alerts/{id}/

**Purpose**: Update search alert

**Request Body**:
```json
{
  "name": "Bi-Weekly iPhone Sales",
  "is_active": false
}
```

**Response** (200 OK)

---

### DELETE /api/v1/search/alerts/{id}/

**Purpose**: Delete search alert

**Response** (204 No Content)

---

### GET /api/v1/search/suggestions/

**Purpose**: Get query suggestions (corrections, expansions, alternatives)

**Query Parameters**:
- `q` (required): Partial or complete query
- `context` (optional): "products", "orders", "customers", "invoices"

**Response** (200 OK):
```json
{
  "query": "iphne 12",
  "corrections": [
    {
      "suggested_query": "iPhone 12",
      "type": "typo_correction",
      "confidence": 0.95,
      "reason": "Did you mean: iPhone 12?"
    }
  ],
  "expansions": [
    {
      "suggested_query": "iPhone 12 Pro",
      "type": "expansion",
      "confidence": 0.80,
      "reason": "Popular variant"
    }
  ],
  "alternatives": [
    {
      "query": "iPhone",
      "type": "simplification",
      "reason": "Broader search"
    }
  ],
  "related_searches": [
    {
      "query": "iPhone 12 Pro Max",
      "popularity_rank": 1,
      "search_count": 2345
    }
  ]
}
```

---

### POST /api/v1/search/analytics/track/

**Purpose**: Track search analytics (internal, called by search endpoint)

**Request Body**:
```json
{
  "query": "iPhone 12",
  "result_type": "products",
  "result_count": 876,
  "response_time_ms": 234,
  "scope": "all",
  "filters_applied": ["category", "price_range"],
  "user_id": "user_123"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "tracking_id": "track_789"
}
```

---

## Database Requirements

### SavedSearch Model

**Table**: `search_saved_search`

**Columns**:
- `id`: UUID, primary key
- `user_id`: UUID, foreign key, indexed
- `name`: VARCHAR(255)
- `query_text`: TEXT (full query including filters)
- `result_type`: VARCHAR(50) (product, order, customer, invoice, all)
- `filters`: JSONB (serialized filter configuration)
- `is_favorite`: BOOLEAN (default: false)
- `created_at`: TIMESTAMP with timezone
- `updated_at`: TIMESTAMP with timezone
- `last_used_at`: TIMESTAMP with timezone (nullable)
- `use_count`: INTEGER (default: 0)

**Indexes**:
- `(user_id, created_at DESC)` - Retrieve user's saved searches
- `(user_id, is_favorite)` - Quick favorites retrieval
- `(user_id, last_used_at DESC)` - Recently used searches

---

### SearchAlert Model

**Table**: `search_search_alert`

**Columns**:
- `id`: UUID, primary key
- `user_id`: UUID, foreign key, indexed
- `name`: VARCHAR(255)
- `query_text`: TEXT
- `result_type`: VARCHAR(50)
- `filters`: JSONB
- `frequency`: VARCHAR(50) (daily, weekly, monthly, on_new_results), indexed
- `frequency_config`: JSONB (e.g., { "day_of_week": "monday", "time": "09:00" })
- `channels`: VARCHAR(255)[] (email, in_app, sms, webhook)
- `recipients`: VARCHAR(255)[] (emails or user IDs)
- `conditions`: JSONB (e.g., { "min_results": 100, "notify_on_change": true })
- `is_active`: BOOLEAN (default: true), indexed
- `created_at`: TIMESTAMP with timezone
- `updated_at`: TIMESTAMP with timezone
- `last_executed_at`: TIMESTAMP with timezone (nullable)
- `next_execution_at`: TIMESTAMP with timezone, indexed
- `last_result_count`: INTEGER (for change detection)

**Indexes**:
- `(user_id, is_active)` - Get active alerts for user
- `(is_active, next_execution_at)` - For alert scheduler
- `(created_at)` - For auditing

---

### SearchAlert Execution Log

**Table**: `search_search_alert_execution`

**Columns**:
- `id`: UUID, primary key
- `alert_id`: UUID, foreign key
- `executed_at`: TIMESTAMP with timezone
- `status`: VARCHAR(50) (success, failed, no_results)
- `result_count`: INTEGER
- `recipients_notified`: INTEGER
- `error_message`: TEXT (nullable)
- `execution_time_ms`: INTEGER

**Indexes**:
- `(alert_id, executed_at DESC)` - Get execution history

---

### SearchAnalytics Model (Denormalized)

**Table**: `search_search_analytics`

**Columns** (extends previous schema):
- `id`: UUID, primary key
- `query_text`: VARCHAR(500)
- `result_type`: VARCHAR(50)
- `result_count`: INTEGER
- `successful_searches`: INTEGER
- `no_result_searches`: INTEGER
- `avg_response_time_ms`: FLOAT
- `unique_users`: INTEGER
- `click_count`: INTEGER (if tracked)
- `date`: DATE, indexed
- `created_at`: TIMESTAMP with timezone
- `updated_at`: TIMESTAMP with timezone

**Indexes**:
- `(date DESC, query_text)` - Analytics queries
- `(result_type, date)` - Breakdown by type
- `(unique_users DESC, date)` - User analytics

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Analytics dashboard | ✗ Missing | No admin dashboard |
| Trending search tracking | ✗ Missing | Not tracked |
| No results tracking | ✗ Missing | Not tracked |
| Saved searches | ✗ Missing | No storage |
| Search alerts | ✗ Missing | Not implemented |
| Query suggestions | ✗ Missing | No suggestion engine |
| Advanced search page | ✗ Missing | No UI |
| Search analytics model | ✗ Missing | No storage |
| Alert scheduler | ✗ Missing | No background job |

---

## Validation & Edge Cases

### Query Suggestion Validation
- Confidence scores must be between 0-1
- Typo corrections must have high confidence (>0.8)
- Related searches must be from real searches
- Avoid suggesting irrelevant alternatives

### Saved Search Validation
- Query must be valid and executable
- Name must be 1-255 characters
- Filters must be valid JSON
- User can have max 100 saved searches (configurable)

### Alert Validation
- Frequency must be valid (daily, weekly, monthly, on_new_results)
- Frequency config must be valid for frequency type
- Recipients must be valid emails
- Alert name must be 1-255 characters
- Conditions must be valid JSON

### Analytics Calculation Validation
- Ensure accurate result counts
- Ensure trend calculations are correct
- Handle zero-result searches properly
- Prevent division by zero in averages

---

## Testing Checklist

### Functional Tests
- [ ] Save search works and persists
- [ ] Retrieve saved searches works
- [ ] Update saved search works
- [ ] Delete saved search works
- [ ] Create alert works
- [ ] Alert triggers on schedule
- [ ] Query suggestions are accurate
- [ ] Trending searches update correctly
- [ ] No results tracking works
- [ ] Analytics calculations correct
- [ ] Analytics dashboard displays data

### Performance Tests
- [ ] Save search <100ms
- [ ] Retrieve saved searches <200ms
- [ ] Create alert <150ms
- [ ] Analytics query <2s
- [ ] Trending calculation <10s
- [ ] Alert execution <500ms

### Edge Case Tests
- [ ] User with no saved searches
- [ ] User with max saved searches
- [ ] Alert with no recipients
- [ ] Alert with multiple recipients
- [ ] Analytics with no data
- [ ] No results search tracking
- [ ] Duplicate saved searches
- [ ] Very long query strings

### Integration Tests
- [ ] End-to-end saved search workflow
- [ ] End-to-end alert workflow
- [ ] Analytics from search tracking
- [ ] Trending calculation from analytics

---

## Implementation Checklist

### Backend Implementation
- [ ] Create SavedSearch model
- [ ] Create SearchAlert model
- [ ] Create SearchAlert Execution Log model
- [ ] Extend SearchAnalytics model
- [ ] Database migrations
- [ ] Create all required indexes
- [ ] Implement saved search endpoints (POST, GET, PATCH, DELETE)
- [ ] Implement alert endpoints (POST, GET, PATCH, DELETE)
- [ ] Implement alert scheduler/processor
- [ ] Implement query suggestion engine
- [ ] Implement analytics tracking
- [ ] Implement trending calculation
- [ ] Implement no results tracking
- [ ] Implement alert email notifications
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add authentication/authorization
- [ ] Add rate limiting

### Frontend Implementation
- [ ] Create analytics dashboard (admin)
- [ ] Create saved searches UI
- [ ] Create alert management UI
- [ ] Create query suggestion components
- [ ] Create advanced search page
- [ ] Integrate saved searches with search
- [ ] Add alert creation from search
- [ ] Add query suggestion display
- [ ] Add mobile responsiveness
- [ ] Add accessibility features
- [ ] Add error handling/loading states

### Infrastructure & DevOps
- [ ] Set up background job processor (for alert scheduler)
- [ ] Set up email sending infrastructure
- [ ] Set up monitoring for alerts
- [ ] Set up logging for analytics
- [ ] Configure analytics aggregation job (hourly/daily)

### Testing & QA
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests
- [ ] Security tests
- [ ] Browser compatibility
- [ ] Mobile testing
- [ ] Accessibility testing

---

## Deployment Strategy

### Pre-Deployment
1. **Staging Testing**:
   - Deploy to staging
   - Test all functionality
   - Performance testing
   - Load testing for alert scheduler

2. **Database Preparation**:
   - Run migrations (backup first)
   - Verify tables created
   - Verify indexes created
   - Test query performance

### Deployment Steps
1. **Deploy Backend**:
   - Deploy models and migrations
   - Deploy API endpoints
   - Deploy alert scheduler
   - Deploy analytics aggregation job
   - Verify all services running

2. **Deploy Frontend**:
   - Deploy analytics dashboard
   - Deploy saved searches UI
   - Deploy alert UI
   - Deploy advanced search page
   - Verify UI rendering

3. **Post-Deployment**:
   - Test saved search creation
   - Test alert execution
   - Monitor alert scheduler
   - Monitor analytics
   - Monitor email sending

### Rollback Plan
- Revert code changes
- Archive analytics data
- Disable alert scheduler
- Verify system stability

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Save search | <100ms | API response |
| Create alert | <150ms | API response |
| Analytics query | <2s | Dashboard load |
| Trending calculation | <10s | Run hourly |
| Alert execution | <500ms | Per alert |
| Query suggestions | <200ms | Real-time |
| Analytics aggregation | <30s | Run daily |

---

## Monitoring & Alerting

### Metrics
- Saved search creation rate
- Alert execution success rate
- Alert email delivery rate
- Analytics accuracy
- Trending calculation time
- Query suggestion accuracy

### Dashboards
- Alert execution health
- Analytics data freshness
- Alert performance metrics
- Suggestion accuracy metrics

### Alerts
- Alert execution failures
- Email delivery failures
- Analytics calculation errors
- Trending calculation timeouts
- Suggestion engine failures

---

## Documentation Requirements

### User Documentation
- **Saved Search Guide**: How to save and manage searches
- **Alert Guide**: How to create and manage alerts
- **Advanced Search Guide**: How to use advanced search
- **Analytics Interpretation**: Understanding dashboard metrics
- **Query Tips**: How to get better suggestions

### Developer Documentation
- **API Reference**: All endpoints
- **Alert Scheduler**: How it works
- **Analytics Aggregation**: How calculations work
- **Query Suggestion Engine**: Algorithm and tuning
- **Troubleshooting**: Common issues

### Admin Documentation
- **Analytics Dashboard**: How to interpret data
- **Trending Analysis**: Identifying opportunities
- **No Results Analysis**: Content gap identification
- **Performance Tuning**: Optimization strategies

---

## Future Enhancements

### Phase 2 Features
1. ML-based query suggestions
2. Predictive alerts (predict when user needs something)
3. Search result export (PDF, CSV)
4. Search collaboration (team searches)
5. Advanced scheduling (recurring alerts with complex conditions)

### Phase 3 Features
1. Semantic search analytics
2. User behavior analytics
3. Search pattern prediction
4. Automated content recommendations
5. Advanced NLP query analysis

---

