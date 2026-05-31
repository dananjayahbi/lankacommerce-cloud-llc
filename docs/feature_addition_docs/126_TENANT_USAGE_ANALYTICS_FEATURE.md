# Feature 126: Tenant Usage Analytics & Health Monitoring

## Executive Summary

Tenant Usage Analytics & Health Monitoring provides comprehensive usage tracking, health scoring, and performance analytics enabling super admins to monitor tenant health, detect issues, optimize resources, and make data-driven decisions about tenant support and infrastructure allocation. This feature includes real-time usage metrics, predictive health scoring, anomaly detection, and capacity planning insights.

## Current State Analysis

### EXISTING INFRASTRUCTURE

- **MetricsView**: Basic tracking infrastructure
- **Health Check Page**: SuperAdmin interface (basic, incomplete)
- **MRR Page**: Monthly Recurring Revenue tracking (basic)
- **Superadmin Dashboard**: Overview interface (basic)
- **Subscription Metrics**: Basic subscription-related metrics
- **Database Infrastructure**: Basic schema for metrics

### MISSING (Entirely or Partially Implemented)

- **Comprehensive Usage Tracking Model**: NO dedicated model for usage metrics
- **Per-Tenant User Count Tracking**: NO system for tracking active users per tenant
- **Data Storage Tracking**: NO model for disk usage per tenant
- **API Call Tracking**: NO system for tracking API calls per tenant
- **Feature Usage Tracking**: NO model for which features are used, adoption rates
- **Module Usage Tracking**: NO model for module-level usage metrics
- **Tenant Health Scoring**: Health page exists but scoring algorithm incomplete
- **Performance Metrics**: NO system for tracking latency, error rates, throughput
- **Resource Utilization Tracking**: NO CPU, memory, database metrics
- **Active Session Tracking**: NO real-time active session counting
- **Login Frequency Tracking**: NO login/activity pattern analysis
- **Feature Adoption Analytics**: NO adoption rate calculations or trend analysis
- **Comprehensive Analytics Dashboard**: NO detailed analytics view
- **Usage Trends Charting**: NO trend visualization
- **Anomaly Detection**: NO implementation for detecting unusual patterns
- **Usage Alerts/Thresholds**: NO alert system for usage limits
- **Capacity Planning Data**: NO data for forecasting capacity needs
- **Predictive Analytics**: NO ML-based predictions
- **Tenant Comparison Analytics**: NO benchmarking against peer tenants
- **Benchmarking Infrastructure**: NO peer comparison system
- **Usage Quota Enforcement**: NO system to prevent over-usage
- **Usage Warning System**: NO warnings when approaching limits
- **Support Ticket Integration**: NO tracking of support tickets
- **Tenant Segmentation**: NO behavioral segmentation
- **Cohort Analysis**: NO cohort tracking capability
- **Churn Indicators**: NO predictive churn scoring
- **Engagement Scoring**: NO engagement metric calculation
- **Feature Recommendation Engine**: NO recommendations based on usage
- **Performance Baseline Tracking**: NO baseline comparison metrics

## Frontend Features

### SuperAdmin Dashboard - Usage & Analytics Tab (New)

#### Tenant Health Overview

**Health Score Cards** (Section at top of dashboard):

Overall Health Score Card:
- Overall health score 0-100 (large, prominent display)
- Health status indicator (Green: Healthy >75, Yellow: Needs Attention 50-75, Red: Critical <50)
- Trend indicator (up/down arrow with percentage change)
- Drill-down to health details button

Component Health Scores (4 cards in grid):
1. System Responsiveness Score (0-100)
   - Average API response time indicator
   - Error rate indicator
   - Uptime percentage

2. Feature Adoption Score (0-100)
   - Percentage of features being used
   - Module usage indicator
   - Adoption trend

3. User Engagement Score (0-100)
   - Active user percentage
   - Login frequency indicator
   - Last activity recency

4. Data Quality Score (0-100)
   - Data completeness indicator
   - Validation error rate
   - Data freshness indicator

**Health Status Breakdown**:
- Status legend (Green/Yellow/Red) with descriptions
- Drill-down to issues button (if any warnings/critical items)

#### Current Usage Dashboard

**Real-Time Usage Panel**:

Usage Metrics (Key metrics in cards):
- **Users**: Current count / Limit (e.g., 5 / 10 users)
  - Bar chart showing utilization percentage
  - Warning indicator if >80% of limit
- **Data Storage**: Used / Limit (e.g., 2.5 GB / 50 GB)
  - Horizontal progress bar with color coding
  - Warning indicator if >80%
- **API Calls**: Used this month / Limit (e.g., 50,000 / 100,000)
  - Progress bar with usage trend
  - Days remaining in billing period
- **Active Sessions**: Current count
  - Peak today indicator
  - Average concurrent sessions
- **Average Response Time**: Milliseconds
  - Target/SLA indicator (if applicable)
  - Red/yellow warning if exceeding SLA
- **Error Rate**: Percentage
  - Status indicator (green if <1%, yellow if 1-5%, red if >5%)
  - Error trend (up/down)

**Period Selector**:
- Quick select buttons: Last 7 days, Last 30 days, Last 90 days, Last year, Custom
- Date range picker for custom periods

#### Usage Trend Charts

**User Count Trend Chart**:
- Line chart of user count for selected period
- Y-axis: user count, X-axis: time
- Trend line showing direction
- Current vs limit line
- Hover tooltips with date and count

**Data Storage Trend Chart**:
- Line chart showing GB usage over time
- Warning threshold line (if quota alerts enabled)
- Area under line for visual impact
- Forecast trend (predicted future usage)

**API Call Trend Chart**:
- Bar chart showing daily/weekly API calls
- Y-axis: call count, X-axis: time period
- Color-coded by status (successful, errors)
- Stacked bars for breakdown
- Monthly cumulative line overlay

**Active Session Trend Chart**:
- Line chart of concurrent active sessions
- Peak highlighting
- Average line
- Time of day patterns (heat map, optional)

**Error Rate Trend Chart**:
- Area chart of error rate percentage
- Color: green if <1%, yellow if 1-5%, red if >5%
- Causes breakdown (4xx vs 5xx errors)
- Major incident annotations

**Export Usage Data Button**:
- Opens export modal with options (CSV, JSON)

#### Feature Adoption Dashboard

**Feature Usage Table**:
- Columns: Feature name, Module, Enabled toggle, Adoption %, Last used, Usage count
- Rows: One per tracked feature
- Sortable columns
- Searchable feature name field
- Filter by module dropdown

**Feature Adoption Breakdown**:
- Adoption percentage display: X% adoption
- Color indicator: Green if >50% adopted, Yellow if 20-50%, Red if <20%
- Adoption trend (up/down arrow)
- Last usage date

**Adoption Heatmap** (Visual representation):
- Grid/heatmap showing feature adoption by category
- Color intensity = adoption rate
- Hover shows details
- Categories: Core Features, Advanced Features, Premium Features

**Feature Popularity Chart** (Pie chart):
- Slice per feature or category
- Percentage labels
- Legend with adoption rates
- Drill-down on slice to see details

**Module Usage Breakdown** (Bar chart):
- Module name on X-axis
- Usage percentage on Y-axis
- Modules: POS, Catalog, CRM, HR, Reports, etc.
- Usage indicator (# of active users using module)

**Feature Recommendations** (Optional section):
- "Based on your plan, you have access to [X] unused features"
- List of underutilized features
- Recommendation: "Consider training team on [Feature]"
- Learn more links

#### Activity Monitoring Dashboard

**Recent Activity Summary**:
- Last admin login date and time (e.g., "2 hours ago")
- Total logins this month (count)
- Last customer/user login (e.g., "10 minutes ago")
- Total unique users this month
- Last order/transaction (if applicable)
- Last invoice/payment (if applicable)

**Activity Timeline** (Visual timeline):
- X-axis: Time (days), Y-axis: Activity count
- Multiple line series:
  - Daily active users (blue line)
  - Orders per day (green line)
  - API calls per day (orange line)
- Legend to toggle series on/off
- Hover tooltips with counts
- Anomaly annotations (unusual spikes/drops)

**Top Activities**:
- Peak usage time (e.g., "3-4 PM daily")
- Most active day of week
- Busiest hour
- Slowest hour

**Activity Breakdown**:
- Login count by user type (admin, staff, customer)
- Orders by type (POS, Online, etc.)
- API calls by endpoint type
- Error count by type

#### Performance Metrics Dashboard

**Latency Metrics**:
- **Average API Response Time**: Milliseconds
  - Gauge chart showing current vs target SLA
  - Red if exceeding, green if within SLA
  - Trend indicator (improving/degrading)

- **P95 Response Time**: 95th percentile latency
  - Tail latency important for user experience
  - Trend chart

- **P99 Response Time**: 99th percentile latency
  - Extreme case latency
  - Historical chart

**Slowest Endpoints Table**:
- Endpoint name/path
- Average response time
- P95 response time
- P99 response time
- Call count (how often used)
- Sort by latency (descending)
- Limit to top 10

**Error Metrics Panel**:
- **Error Rate**: Percentage of requests with errors
  - Color-coded gauge (green <1%, yellow 1-5%, red >5%)
  - Trend indicator

- **5xx Errors Count**: Server errors
  - Absolute count
  - Trend chart

- **4xx Errors Count**: Client errors
  - Absolute count
  - Trend chart

**Top Errors Table**:
- Error type/code
- Frequency (count)
- Last occurrence time
- Affected endpoints
- User impact (# of sessions affected)
- Severity score
- Sort by frequency or recency

**Error Trend Chart**:
- Line chart of error rate over time
- Separate lines for 4xx and 5xx
- Color coding
- Major incident annotations

**Resource Metrics Panel** (if tracked):
- **Database Query Time**: Average
  - Milliseconds
  - Trend indicator
  - Target vs actual

- **Cache Hit Rate**: Percentage
  - Gauge showing effectiveness
  - Trend
  - Should be >80% for good performance

- **Background Job Queue Size**: Count
  - If high, indicates processing bottleneck
  - Trend chart

- **Memory Usage**: If tracked
  - Percentage utilized
  - Peak vs average
  - Trend

#### Tenant Comparison Analytics

**Peer Tenant Selector**:
- Compare with dropdown selector
- "Similar tier tenants" or "All tenants" option
- Specific tenant search/selector
- "Benchmark against my tier" button

**Metrics Comparison**:

Comparison Grid/Chart:
- Current tenant (highlighted in one color)
- Peer tenants or tier average (different color)
- Metrics compared:
  - User count vs peer average
  - Storage usage vs peer average
  - API calls vs peer average
  - Activity level vs peer (logins, transactions)
  - Error rate vs peer (lower is better)
  - Average response time vs peer (lower is better)
  - Feature adoption rate vs peer

**Benchmark Positioning**:
- Percentile ranking (e.g., "Top 25% in API calls")
- Better/Worse indicators
- Trend vs peer (gaining ground, falling behind)

**Performance Indicators**:
- Health score vs peer average
- Engagement score vs peer
- Feature adoption vs peer

**Recommendations**:
- "Your error rate is above peer average - check [link]"
- "You're underutilizing features compared to peers - [suggestions]"
- "API calls higher than similar tenants - consider optimization"
- Link to optimization guides or support articles

#### Usage Alerts Configuration

**Alert Thresholds Settings Panel**:

User Count Alert:
- User count threshold input field (e.g., 8 out of 10)
- Alert trigger option: At limit, 80% of limit, 90% of limit
- Enable/disable toggle

Storage Alert:
- Storage threshold input (GB)
- Alert trigger option
- Enable/disable toggle

API Call Alert:
- API call threshold input (monthly)
- Alert trigger option
- Enable/disable toggle

Error Rate Alert:
- Error rate threshold input (%)
- Alert trigger option (e.g., >5% errors)
- Enable/disable toggle

Custom Alerts:
- "Add custom alert" button (for advanced users)
- Define metric, threshold, condition

**Alert Channels**:
- Email alerts checkbox (+ email list field)
- In-app notifications checkbox
- Webhook alerts checkbox (+ webhook URL field)
- Slack integration (if enabled)
- SMS alerts (if enabled)

**Alert Frequency**:
- Real-time alerts radio button
- Daily digest radio button
- Weekly digest radio button
- Only on threshold breached radio button

**Alert Quieting**:
- Suppress repeated alerts toggle
- Cooldown period dropdown (1 hour, 1 day, 1 week)

**Save Configuration Button**

**Test Alerts Button**:
- Send test notification button

#### Quota Management

**Current Quotas Display**:

Quota Cards (grid layout):
1. User Limit
   - Current: X users
   - Limit: Y users
   - Percentage: X/Y%
   - Progress bar
   - Change limit button

2. Storage Limit
   - Current: X GB
   - Limit: Y GB
   - Percentage bar
   - Change limit button

3. API Call Limit
   - Current: X calls this month
   - Limit: Y calls
   - Percentage bar
   - Days left in month
   - Change limit button

4. Concurrent Sessions Limit
   - Current: X sessions
   - Limit: Y sessions
   - Peak today: Z
   - Change limit button

**Quota Override Options** (for testing/exceptions):

Override User Limit:
- Current limit display
- New limit input field
- Duration selector (1 day, 1 week, 1 month, permanent)
- Reason field (required)
- Apply override button
- Revert override button

Override Storage Limit:
- Current limit display
- New limit input field (GB)
- Duration selector
- Reason field
- Apply override button

Override API Call Limit:
- Current limit display
- New limit input field
- Duration selector
- Reason field
- Apply override button

**Active Overrides List**:
- Table of active overrides
- Original limit, override limit, expires at
- Reason
- Revert button (per row)

**Save Temporary Override Button**

#### Tenant Health Report

**Report Generation Section**:
- Generate report button
- Report type selector (full, performance, usage summary)
- Date range selector (last month, last quarter, etc., or custom)
- Generate button

**Report Display** (After generation):

Executive Summary:
- Tenant name and ID
- Report date range
- Overall health score
- Key findings (2-3 sentence summary)

Health Scores Breakdown:
- Overall score with trend
- System Responsiveness score and status
- Feature Adoption score and status
- User Engagement score and status
- Data Quality score and status

Usage Summary:
- User count and trend
- Data storage and trend
- API calls and trend
- Active sessions average
- Error rate and trend
- Response time and trend

Feature Adoption:
- Overall adoption rate
- Top 5 adopted features
- Top 5 underutilized features
- Module usage breakdown

Performance Metrics:
- Average response time
- Error rate
- Uptime (if tracked)
- Peak usage times
- Performance vs SLA

Recommendations:
- List of 3-5 recommendations based on health/usage
- Prioritized by impact
- Action items for improvement
- Links to guides or support

**Report Actions**:
- Export report button (PDF, CSV, JSON)
- Email report button (to admin email, custom email, or distribution list)
- Schedule report generation (weekly, monthly email)
- Compare with previous report (if generating again)
- Print button

**Report History**:
- View previously generated reports
- Date, type, summary
- Re-download previous reports

### Health Score Calculation Details

**Overall Health Score** (0-100):
- System Responsiveness (25%): API latency, error rate, uptime
- Feature Adoption (25%): Feature usage breadth, module engagement
- User Engagement (25%): Active user rate, login frequency, activity level
- Data Quality (25%): Data completeness, validation errors, duplicates

**System Responsiveness Score** (0-100):
- API latency: 0-100 based on target SLA
- Error rate: 100 - (error_rate * 10) capped at 0-100
- Uptime: 100 * uptime_percentage

**Feature Adoption Score** (0-100):
- Features used / Total available features * 100
- Or: Weighted score based on feature importance and adoption

**User Engagement Score** (0-100):
- (Active users this period / Total users) * 50 (max 50 points)
- (Logins this period / Expected logins) * 50 (max 50 points)

**Data Quality Score** (0-100):
- Completeness: Records with required fields / Total records * 100
- Validation: (Records without errors / Total records) * 100
- Duplicate rate: (1 - duplicate_rate) * 100

## Backend API Requirements

### Usage Tracking Endpoints

**GET /api/admin/tenants/{id}/usage/** - Get tenant usage metrics
- Query Parameters:
  - `period` (optional): day, week, month, year, or specific date range
- Response:
  ```
  {
    user_count: integer,
    user_limit: integer,
    storage_gb: number,
    storage_limit_gb: number,
    api_calls_month: integer,
    api_call_limit_month: integer,
    active_sessions: integer,
    concurrent_session_limit: integer,
    average_response_time_ms: number,
    error_rate_percent: number,
    uptime_percent: number,
    last_activity_at: datetime,
    tracking_since: datetime
  }
  ```

**POST /api/admin/usage/track/** - Track usage event (Internal call, not exposed to client)
- Request Body:
  ```
  {
    tenant_id: string (required),
    metric_type: string (required), // user_login, api_call, order_created, etc.
    value: number (optional),
    metadata: object (optional)
  }
  ```
- Response: { success: boolean }

**GET /api/admin/usage/analytics/** - Get usage analytics/time series
- Query Parameters:
  - `tenant_id` (required)
  - `metric_type` (required): users, storage, api_calls, sessions, latency, error_rate
  - `date_range` (optional): start_date,end_date
  - `granularity` (optional): hourly, daily, weekly, monthly (default: daily)
- Response:
  ```
  {
    metric_type: string,
    data_points: [{
      timestamp: datetime,
      value: number,
      count: integer (for aggregated metrics)
    }],
    summary: {
      min: number,
      max: number,
      average: number,
      trend: string (up | down | stable)
    }
  }
  ```

### Health Score Endpoints

**GET /api/admin/tenants/{id}/health/** - Get tenant health score
- Response:
  ```
  {
    overall_score: number (0-100),
    status: string (healthy | warning | critical),
    component_scores: {
      responsiveness: number,
      adoption: number,
      engagement: number,
      data_quality: number
    },
    health_issues: [{
      issue_id: string,
      severity: string (low | medium | high | critical),
      description: string,
      affected_component: string,
      recommendation: string,
      link: string (to documentation or action)
    }],
    calculated_at: datetime,
    next_calculation_at: datetime
  }
  ```

**GET /api/admin/tenants/{id}/health/history/** - Get health score history
- Query Parameters:
  - `days` (optional, default: 30)
- Response:
  ```
  {
    data: [{
      date: date,
      overall_score: number,
      component_scores: object,
      status: string
    }]
  }
  ```

### Feature Adoption Endpoints

**GET /api/admin/tenants/{id}/feature-adoption/** - Get feature adoption metrics
- Response:
  ```
  {
    overall_adoption_rate: number (percent),
    features: [{
      feature_id: string,
      feature_name: string,
      module: string,
      enabled: boolean,
      adoption_rate: number,
      user_adoption_rate: number,
      usage_count: integer,
      last_used_at: datetime,
      trend: string (up | down | stable),
      recommendation: string (optional)
    }],
    module_usage: [{
      module_name: string,
      adoption_rate: number,
      active_users: integer,
      features_enabled_count: integer
    }]
  }
  ```

### Performance Metrics Endpoints

**GET /api/admin/tenants/{id}/performance-metrics/** - Get performance metrics
- Query Parameters:
  - `time_range` (optional): 1h, 24h, 7d, 30d, custom
  - `metrics` (optional, comma-separated): latency, errors, throughput, all
- Response:
  ```
  {
    latency: {
      average_ms: number,
      p50_ms: number,
      p95_ms: number,
      p99_ms: number,
      max_ms: number,
      sla_compliance_percent: number
    },
    errors: {
      error_rate_percent: number,
      http_4xx_count: integer,
      http_5xx_count: integer,
      timeout_count: integer,
      error_types: [{
        type: string,
        count: integer,
        last_occurrence: datetime
      }]
    },
    throughput: {
      requests_per_second: number,
      average_daily: integer,
      peak_daily: integer
    },
    resource_usage: {
      database_query_time_ms: number,
      cache_hit_rate_percent: number,
      background_job_queue_size: integer,
      memory_usage_percent: number
    }
  }
  ```

**GET /api/admin/performance-metrics/slowest-endpoints/** - Get slowest endpoints
- Query Parameters:
  - `tenant_id` (required)
  - `limit` (optional, default: 10)
  - `time_range` (optional)
- Response:
  ```
  {
    endpoints: [{
      endpoint: string,
      method: string,
      average_latency_ms: number,
      p95_latency_ms: number,
      p99_latency_ms: number,
      call_count: integer,
      error_rate_percent: number
    }]
  }
  ```

### Alerts and Quota Endpoints

**GET /api/admin/tenants/{id}/usage/alerts/** - Get usage alerts config
- Response:
  ```
  {
    alerts: [{
      alert_id: string,
      metric_type: string,
      threshold: number,
      trigger_condition: string,
      channels: [string],
      frequency: string,
      enabled: boolean,
      last_triggered_at: datetime
    }],
    quotas: {
      user_limit: integer,
      storage_limit_gb: number,
      api_call_limit_month: integer,
      concurrent_session_limit: integer
    }
  }
  ```

**PATCH /api/admin/tenants/{id}/usage/alerts/** - Update alerts config
- Request Body:
  ```
  {
    alerts: [{
      metric_type: string,
      threshold: number,
      trigger_condition: string,
      channels: [string],
      frequency: string,
      enabled: boolean
    }],
    do_not_disturb: {
      enabled: boolean,
      cooldown_minutes: integer
    }
  }
  ```
- Response: Updated alert configuration

**GET /api/admin/tenants/{id}/usage/quotas/** - Get tenant quotas
- Response:
  ```
  {
    user_limit: integer,
    current_users: integer,
    storage_limit_gb: number,
    current_storage_gb: number,
    api_call_limit_month: integer,
    current_api_calls_month: integer,
    concurrent_session_limit: integer,
    current_sessions: integer,
    warnings: [{
      quota_type: string,
      current: number,
      limit: number,
      percent_used: number,
      warning_level: string
    }]
  }
  ```

**POST /api/admin/tenants/{id}/usage/quotas/override/** - Override quota temporarily
- Request Body:
  ```
  {
    quota_type: string (user_limit | storage_limit | api_call_limit),
    new_limit: number (required),
    duration_days: integer (optional, null for permanent),
    reason: string (required)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    override_id: string,
    effective_from: datetime,
    expires_at: datetime,
    original_limit: number,
    new_limit: number
  }
  ```

**DELETE /api/admin/tenants/{id}/usage/quotas/override/{override_id}/** - Revert quota override
- Response: { success: boolean, reverted_to: number }

### Tenant Comparison Endpoints

**GET /api/admin/tenants/comparison/** - Compare tenants
- Query Parameters:
  - `tenant_id` (required): tenant to analyze
  - `comparison_type` (optional): similar_tier, same_plan, all (default: similar_tier)
  - `metrics` (optional, comma-separated): users, storage, api_calls, error_rate, latency, all
- Response:
  ```
  {
    tenant_id: string,
    tenant_name: string,
    comparison_group: string,
    peer_count: integer,
    metrics: [{
      metric_name: string,
      current_value: number,
      peer_average: number,
      peer_min: number,
      peer_max: number,
      percentile_rank: number,
      trend_vs_peer: string (gaining | losing | stable),
      status: string (good | needs_attention | critical)
    }],
    benchmarks: [{
      benchmark_name: string,
      current: number,
      target: number,
      peer_average: number,
      performance: string (exceeds | meets | below)
    }],
    recommendations: [string]
  }
  ```

### Report Endpoints

**POST /api/admin/tenants/{id}/usage/report/** - Generate usage report
- Request Body:
  ```
  {
    report_type: string (full | performance | usage_summary),
    date_range: {
      start_date: date,
      end_date: date
    },
    format: string (pdf | json | csv),
    send_to_email: string (optional)
  }
  ```
- Response:
  ```
  {
    success: boolean,
    report_id: string,
    report_url: string,
    generated_at: datetime,
    expires_at: datetime,
    email_sent: boolean
  }
  ```

**GET /api/admin/tenants/{id}/usage/reports/** - Get report history
- Query Parameters:
  - `limit` (optional, default: 10)
  - `offset` (optional, default: 0)
- Response:
  ```
  {
    count: integer,
    results: [{
      report_id: string,
      type: string,
      generated_at: datetime,
      date_range: object,
      url: string,
      expires_at: datetime
    }]
  }
  ```

### Health Check & Status Endpoints

**GET /api/admin/system/health/** - Overall system health
- Response:
  ```
  {
    status: string (healthy | degraded | down),
    timestamp: datetime,
    components: [{
      name: string,
      status: string,
      latency_ms: number,
      last_check_at: datetime
    }],
    tenant_count: integer,
    avg_health_score: number,
    critical_issues_count: integer
  }
  ```

## Database Requirements

### Usage Metric Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key, required)
- `metric_type` (enum): user_count, api_calls, storage_gb, error_rate, latency_ms, active_sessions, etc.
- `value` (decimal): metric value
- `timestamp` (datetime): when metric was recorded
- `period` (enum): hourly, daily, monthly (for aggregated data)
- `metadata` (JSON, optional): additional context
- `recorded_at` (datetime): when record was created

Indexes:
- (tenant_id, metric_type, timestamp DESC) - primary query
- (tenant_id, period, timestamp DESC) - aggregated queries
- (timestamp DESC) - recent metrics
- (metric_type, timestamp) - metric type queries

### Health Score Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key, unique_per_day): one record per tenant per day
- `overall_score` (integer): 0-100
- `component_scores` (JSON):
  - responsiveness_score: 0-100
  - adoption_score: 0-100
  - engagement_score: 0-100
  - data_quality_score: 0-100
- `health_issues` (JSON array): array of issue objects
- `calculated_at` (datetime): calculation timestamp
- `next_calculation_at` (datetime): when to recalculate
- `created_at` (datetime)

Indexes:
- (tenant_id, calculated_at DESC) - history
- (calculated_at DESC) - recent calculations

### Feature Usage Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `feature_id` (string): feature identifier
- `feature_name` (string)
- `module` (string): module the feature belongs to
- `enabled` (boolean): is feature enabled for this tenant
- `adoption_rate` (decimal): 0-100 percent
- `user_adoption_rate` (decimal): % of users who used it
- `usage_count` (integer): total usages
- `last_used_at` (datetime)
- `trend` (enum): up, down, stable
- `calculated_at` (datetime)

Indexes:
- (tenant_id, feature_id)
- (tenant_id, adoption_rate DESC) - sorting by adoption
- (tenant_id, calculated_at DESC) - history

### Performance Metric Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `metric_type` (enum): latency_avg, latency_p95, latency_p99, error_rate, throughput, etc.
- `value` (decimal)
- `timestamp` (datetime): metric measurement time
- `granularity` (enum): second, minute, hour, day
- `endpoint` (string, optional): for endpoint-specific metrics
- `metadata` (JSON): additional details
- `recorded_at` (datetime)

Indexes:
- (tenant_id, metric_type, timestamp DESC)
- (tenant_id, endpoint, metric_type, timestamp DESC)
- (timestamp DESC) - recent metrics

### Usage Quota Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key, unique)
- `user_limit` (integer)
- `current_users` (integer, denormalized)
- `storage_limit_gb` (decimal)
- `current_storage_gb` (decimal, denormalized)
- `api_call_limit_month` (integer)
- `current_api_calls_month` (integer, denormalized)
- `concurrent_session_limit` (integer)
- `current_sessions` (integer, denormalized)
- `updated_at` (datetime)

Indexes:
- (tenant_id) - primary lookup

### Usage Alert Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `alert_id` (string): unique identifier
- `metric_type` (string)
- `threshold` (number)
- `trigger_condition` (string): e.g., ">=", ">", "<", "<="
- `channels` (JSON array): email, webhook, slack, etc.
- `frequency` (enum): real_time, daily, weekly
- `enabled` (boolean)
- `last_triggered_at` (datetime, nullable)
- `trigger_count` (integer): number of times triggered
- `created_at` (datetime)
- `updated_at` (datetime)

Indexes:
- (tenant_id, metric_type)
- (enabled, metric_type) - for alert checking

### Quota Override Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `quota_type` (enum): user_limit, storage_limit, api_call_limit
- `original_limit` (number)
- `override_limit` (number)
- `effective_from` (datetime)
- `expires_at` (datetime, nullable): null for permanent
- `reason` (text)
- `created_by` (foreign key): admin who created override
- `is_active` (boolean)
- `created_at` (datetime)

Indexes:
- (tenant_id, quota_type, is_active)
- (expires_at) - for cleanup queries

### Usage Report Model

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `report_type` (enum): full, performance, usage_summary
- `date_range_start` (date)
- `date_range_end` (date)
- `report_data` (JSON): complete report contents
- `file_url` (string, nullable): S3 or storage URL
- `file_size` (integer, nullable)
- `format` (enum): pdf, json, csv
- `generated_at` (datetime)
- `expires_at` (datetime): when to delete report
- `email_sent_to` (array, nullable): sent to these emails
- `created_at` (datetime)

Indexes:
- (tenant_id, generated_at DESC)
- (expires_at) - cleanup queries

### Anomaly Detection Model (Optional, for future ML)

Fields:
- `id` (primary key, UUID)
- `tenant_id` (foreign key)
- `metric_type` (string)
- `baseline_value` (decimal): normal/expected value
- `baseline_std_dev` (decimal): standard deviation
- `current_value` (decimal): current metric value
- `deviation_percent` (decimal)
- `is_anomaly` (boolean)
- `severity` (enum): low, medium, high, critical
- `detected_at` (datetime)
- `resolved_at` (datetime, nullable)

Indexes:
- (tenant_id, is_anomaly, detected_at DESC)
- (detected_at DESC)

## Current Implementation Status

### Fully Implemented
- Basic metrics view framework
- Health check page (structure only)
- MRR page (basic display)
- Dashboard overview (basic)

### Partially Implemented
- Basic tracking infrastructure
- Health page (incomplete)
- MRR calculation (basic)

### Not Implemented
- Comprehensive usage tracking system
- Health score calculation algorithm
- Feature adoption tracking
- Performance metrics collection
- Real-time usage dashboards
- Alert system
- Quota enforcement
- Tenant comparison analytics
- Report generation
- Anomaly detection
- Historical data storage and retrieval
- Usage analytics visualizations

## Validation & Edge Cases

### Validation Rules

- **Metric Values**: Non-negative numbers (except for trend/delta calculations)
- **Thresholds**: Must be >= 0 and <= quota limits
- **Health Scores**: 0-100 range always
- **Percentages**: 0-100 range
- **Timestamps**: Must be chronologically valid
- **Quota Overrides**: New limit must be > 0
- **Feature Names**: Must be unique per tenant
- **Alert Conditions**: Must be valid operators (>=, >, <, <=)

### Edge Cases

- **New Tenants**: No usage history; health score based on potential
- **Idle Tenants**: No activity but still healthy (status "inactive")
- **Sudden Spikes**: Detect as potential issues or growth (context-aware)
- **Data Gaps**: Handle missing data points gracefully (interpolation or marking as incomplete)
- **Time Zone Issues**: Convert all metrics to consistent timezone
- **Period Boundaries**: Handle month-end, year-end transitions
- **Quota Exhaustion**: Prevent operations when quota exceeded
- **Alert Spam**: Implement cooldown to prevent repeated alerts
- **Concurrent Updates**: Handle concurrent metric updates safely
- **Historical Data Retention**: Archive old data; configurable retention

## Testing Checklist

### Functional Tests
- [ ] Usage tracking records metrics accurately
- [ ] Health score calculation produces 0-100 values
- [ ] Health score components calculate correctly
- [ ] Feature adoption rates calculated correctly
- [ ] Performance metrics collected accurately
- [ ] Alerts trigger at configured threshold
- [ ] Alert cooldown prevents spam
- [ ] Quota enforcement prevents over-usage
- [ ] Quota overrides apply correctly
- [ ] Quota overrides expire correctly
- [ ] Tenant comparison shows accurate peer data
- [ ] Reports generate with correct content
- [ ] Report export formats work (PDF, CSV, JSON)
- [ ] Report emails send correctly
- [ ] Anomaly detection identifies outliers
- [ ] Historical data retrieved accurately

### Data Accuracy Tests
- [ ] MRR calculation matches manual verification
- [ ] User count tracking accurate
- [ ] Storage usage tracking accurate
- [ ] API call tracking accurate
- [ ] Error rate calculation correct
- [ ] Response time averaging correct
- [ ] Feature adoption percentages accurate
- [ ] Health scores reproducible
- [ ] Percentile calculations (P95, P99) correct

### Performance Tests
- [ ] Usage tracking: <10ms per event (non-blocking)
- [ ] Health score calculation: <500ms for single tenant
- [ ] Batch health calculation: <5s for 1000 tenants
- [ ] Analytics query: <1s for 1 year of data
- [ ] Report generation: <30s for comprehensive report
- [ ] Dashboard load: <1s
- [ ] Alert check: <100ms per tenant
- [ ] Comparison query: <500ms

### Scalability Tests
- [ ] Tracking system handles 10,000 events/second
- [ ] Dashboard responsive with 10,000 tenants
- [ ] Alert checking scalable to 10,000 tenants
- [ ] Historical data queries remain fast with 1 year+ data
- [ ] Report generation works for large datasets

### Edge Case Tests
- [ ] New tenant with no data shows reasonable defaults
- [ ] Idle tenant health score calculated
- [ ] Sudden spike detected and annotated
- [ ] Data gap handled gracefully
- [ ] Quota exceeded prevents operations
- [ ] Concurrent metric updates don't cause conflicts
- [ ] Historical data archive and retrieval works
- [ ] Time zone conversions correct
- [ ] Month-end calculations correct

## Implementation Checklist

### Database Models
- [ ] UsageMetric model
- [ ] HealthScore model
- [ ] FeatureUsage model
- [ ] PerformanceMetric model
- [ ] UsageQuota model
- [ ] UsageAlert model
- [ ] QuotaOverride model
- [ ] UsageReport model
- [ ] AnomalyDetection model (optional)
- [ ] Database migrations
- [ ] Indexes and constraints

### Backend Services
- [ ] UsageTrackingService (record metrics)
- [ ] HealthScoringService (calculate scores)
- [ ] HealthIssueDetectionService (identify problems)
- [ ] FeatureAdoptionService (track adoption)
- [ ] PerformanceMetricsService (collect perf data)
- [ ] AlertService (check and trigger alerts)
- [ ] QuotaEnforcementService (enforce limits)
- [ ] TenantComparisonService (peer analytics)
- [ ] ReportGenerationService (create reports)
- [ ] AnomalyDetectionService (optional, detect outliers)
- [ ] HealthCheckService (system status)

### Backend Jobs/Workers
- [ ] Metrics aggregation job (hourly/daily)
- [ ] Health score calculation job (daily)
- [ ] Feature adoption calculation job (daily)
- [ ] Alert checking job (real-time or periodic)
- [ ] Report cleanup job (delete expired reports)
- [ ] Quota override cleanup job (remove expired)
- [ ] Data archival job (move old data)
- [ ] Anomaly detection job (optional)

### API Endpoints
- [ ] GET /api/admin/tenants/{id}/usage/
- [ ] POST /api/admin/usage/track/ (internal)
- [ ] GET /api/admin/usage/analytics/
- [ ] GET /api/admin/tenants/{id}/health/
- [ ] GET /api/admin/tenants/{id}/health/history/
- [ ] GET /api/admin/tenants/{id}/feature-adoption/
- [ ] GET /api/admin/tenants/{id}/performance-metrics/
- [ ] GET /api/admin/performance-metrics/slowest-endpoints/
- [ ] GET /api/admin/tenants/{id}/usage/alerts/
- [ ] PATCH /api/admin/tenants/{id}/usage/alerts/
- [ ] GET /api/admin/tenants/{id}/usage/quotas/
- [ ] POST /api/admin/tenants/{id}/usage/quotas/override/
- [ ] DELETE /api/admin/tenants/{id}/usage/quotas/override/{id}/
- [ ] GET /api/admin/tenants/comparison/
- [ ] POST /api/admin/tenants/{id}/usage/report/
- [ ] GET /api/admin/tenants/{id}/usage/reports/
- [ ] GET /api/admin/system/health/

### Frontend Components
- [ ] TenantHealthOverview component
- [ ] UsageDashboard component
- [ ] UsageChartsPanel component
- [ ] FeatureAdoptionPanel component
- [ ] ActivityMonitoringPanel component
- [ ] PerformanceMetricsPanel component
- [ ] TenantComparisonPanel component
- [ ] AlertsConfigurationPanel component
- [ ] QuotaManagementPanel component
- [ ] HealthReportView component
- [ ] ReportGenerationModal component
- [ ] AnomalyAnnotations component

### Frontend Pages
- [ ] Tenant Usage Analytics page (enhanced)
- [ ] Health Dashboard page (new)
- [ ] Performance Metrics page (new)
- [ ] Tenant Comparison page (new)
- [ ] Reports page (new)

### Instrumentation
- [ ] API call tracking middleware
- [ ] Response time tracking
- [ ] Error rate tracking
- [ ] Database query monitoring
- [ ] Session tracking
- [ ] Feature usage tracking events

### Testing Infrastructure
- [ ] Unit tests for health score calculation
- [ ] Unit tests for proration calculations
- [ ] Integration tests for metric tracking
- [ ] E2E tests for analytics workflow
- [ ] Performance benchmarks
- [ ] Data validation tests

### Documentation
- [ ] Health score calculation guide
- [ ] Metrics interpretation guide
- [ ] Alert setup guide
- [ ] Quota management guide
- [ ] Report usage guide
- [ ] API documentation
- [ ] Dashboard interpretation guide

## Deployment Strategy

### Phase 1: Infrastructure
- Deploy database models
- Deploy migrations
- Set up data collection infrastructure
- Configure monitoring

### Phase 2: Services & Jobs
- Deploy tracking services
- Deploy background jobs
- Deploy health scoring service
- Start metric collection
- Historical data population (if applicable)

### Phase 3: API Endpoints
- Deploy all API endpoints
- API documentation
- Performance testing

### Phase 4: Frontend
- Deploy analytics dashboard
- Deploy health monitoring pages
- Deploy report generation
- Deploy alerts configuration
- Staff training

### Phase 5: Rollout
- Feature flag for gradual rollout
- Monitor data quality
- Validate calculations
- Gradual enable for all super admins

### Rollback Plan
- Archive tracking data
- Revert database migrations
- Restore previous frontend
- Clear feature flags
- Document historical data location

## Performance Targets

- **Usage Tracking**: <10ms per event, non-blocking
- **Health Score Calculation**: <500ms per tenant
- **Batch Health Calculation**: <5s for 1000 tenants
- **Analytics Query**: <1s for 1 year of data
- **Report Generation**: <30s for comprehensive report
- **Dashboard Load**: <1s
- **Alert Check**: <100ms per tenant
- **Comparison Query**: <500ms for peer analysis

## Monitoring & Alerting

### Metrics to Track

- Metrics collection rate and health
- Health score changes and trends
- Usage anomalies detected
- Alert trigger frequency
- Quota enforcement events
- Report generation success rate
- Data accuracy validation
- System responsiveness

### Alerts

- Tracking system offline or degraded
- Health score calculation failures
- High number of alerts triggering
- Quota enforcement failures
- Report generation failures
- Data inconsistencies
- Anomalous activity patterns

### Dashboards

- Metrics collection health dashboard
- Health score distribution dashboard
- Alert frequency dashboard
- Quota usage dashboard
- System performance dashboard
- Data quality dashboard

## Documentation Requirements

### Admin Guides
- Health Score Interpretation Guide
- Usage Metrics Guide
- Feature Adoption Guide
- Performance Metrics Guide
- Analytics Interpretation Guide
- Quota Management Guide
- Alert Configuration Guide
- Report Generation Guide
- Tenant Comparison Guide
- Troubleshooting Guide

### Developer Documentation
- Metrics Collection Architecture
- Health Score Calculation Algorithm
- Service API Documentation
- Database Schema
- Tracking Integration Points
- Background Job Documentation

### User Guides
- Dashboard Navigation
- Reading Charts and Graphs
- Creating Custom Reports
- Setting Up Alerts
- Tenant Comparison Tutorial
- Quota Management

## Future Enhancements

- **Machine Learning Health Predictions**: Predict issues before they occur
- **Anomaly Detection**: AI-powered detection of unusual patterns
- **Churn Prediction**: Predict which tenants might cancel
- **Intelligent Recommendations**: ML-based suggestions for optimization
- **Predictive Scaling**: Forecast resource needs
- **Custom Metrics**: Allow tenants to define custom metrics
- **Real-Time Dashboards**: WebSocket-based live updates
- **Mobile App**: Mobile analytics and alerts
- **Integration Webhooks**: Send analytics to external systems
- **Advanced Segmentation**: Customer cohort analysis
- **Benchmarking Reports**: Industry benchmarks
- **Compliance Reporting**: Automated compliance reports
- **Cost Optimization**: Identify cost-saving opportunities
- **Capacity Planning**: Forecast infrastructure needs
- **Custom Alerts**: User-defined complex alert conditions
