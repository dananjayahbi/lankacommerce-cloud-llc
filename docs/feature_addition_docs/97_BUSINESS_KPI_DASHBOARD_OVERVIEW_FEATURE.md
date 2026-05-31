# Business KPI Dashboard Overview Feature (Document 97)

## Executive Summary

Business KPI Dashboard providing executive-level real-time KPI overview with 12 key performance indicator cards, trend charts, and business health scoring enabling company leadership to monitor business performance at a glance.

---

## Current State Analysis

### EXISTING Implementation

- **RevenueTrendView** - generates revenue and returns trends over time
- **ProfitLossView** - generates P&L data and statements
- **StoreDashboardView** - basic daily metrics: today's revenue, transaction count, avg basket, low stock count, open shifts
- **MetricsView** - subscription metrics: MRR, ARR, churn rate
- **Multiple Analytics Views** - sales, inventory, customer, financial analytics
- **Multi-tenant Data Isolation** - secure tenant separation
- **User Authentication and Permissions** - role-based access control
- **Historical Data** - comprehensive sales, orders, invoices, bills, payroll records

### MISSING (Completely Absent or Incomplete)

- **Frontend KPI Dashboard Page** - NO dedicated page exists
- **Business KPI Metrics Aggregation Service** - NO aggregation service
- **Inventory Turnover Calculation** - NOT implemented
- **Days of Inventory Outstanding (DIO)** - NOT calculated
- **Cash Position Analysis** - NOT analyzed
- **Receivables Aging Analysis** - NOT available
- **Payables Aging Analysis** - NOT available
- **Financial Ratios** - NO calculation (current ratio, quick ratio, debt-to-equity, ROA, ROE)
- **Business Health Scoring Algorithm** - NOT implemented
- **KPI Trend Calculation** - NOT available
- **KPI Period-over-Period Comparison** - NOT implemented
- **KPI Forecasting** - NOT available
- **Dashboard Real-time Updates** - NOT implemented
- **KPI Caching Strategy** - NOT in place
- **Performance Optimization** - NO optimization for multiple calculations

---

## Frontend Features

### Page Header
- **Page Title**: "Business KPI Dashboard"
- **Period Selector**: Month/Quarter/Year with preset options
- **Comparison Period Selector**: Optional side-by-side period comparison
- **Refresh Button**: Manually refresh all metrics
- **Export KPIs Button**: Export dashboard data

### Executive Summary Cards Section (4×3 Grid)

1. **Total Revenue Card**
   - Period selector for granularity
   - Trend indicator (↑/→/↓)
   - Percentage change from previous period
   - Total revenue amount

2. **Net Profit Card**
   - Period selector
   - Trend indicator
   - Percentage change
   - Net profit amount

3. **Profit Margin % Card**
   - Target vs actual comparison
   - Trend indicator
   - Color-coded (green/yellow/red)

4. **Total Orders Card**
   - Count of orders
   - Trend indicator
   - Average per day

5. **Average Order Value (AOV) Card**
   - AOV amount
   - Trend indicator
   - Period-over-period comparison

6. **Customer Count Card**
   - Active customers count
   - New customers this period
   - Trend indicator

7. **Inventory Turnover Card**
   - Times per period
   - Industry benchmark comparison
   - Trend indicator

8. **Days of Inventory Outstanding (DIO) Card**
   - DIO in days
   - Trend indicator
   - Target comparison

9. **Cash Position Card**
   - Available cash amount
   - Trend indicator
   - Cash reserves indicator

10. **Outstanding Receivables Card**
    - Total receivable amount
    - Days overdue
    - Aging breakdown

11. **Outstanding Payables Card**
    - Total payable amount
    - Due dates summary
    - Aging breakdown

12. **Employee Count Card**
    - Active employees count
    - Headcount by department
    - Period change

### Metrics Detail Section

#### Key Ratios Dashboard (Expandable)

**Liquidity Ratios:**
- Current ratio with industry benchmark
- Quick ratio with trend
- Cash ratio with trend

**Efficiency Ratios:**
- Asset turnover
- Inventory turnover with trend
- Receivables turnover
- Payables period

**Profitability Ratios:**
- Gross margin % with trend
- Operating margin % with trend
- Net margin % with trend
- ROA (Return on Assets)
- ROE (Return on Equity)

#### Business Health Score
- **Visual Gauge**: 0-100 score display
- **Component Breakdown**:
  - Revenue health (30% weight)
  - Profitability (30% weight)
  - Cash flow health (25% weight)
  - Operational efficiency (15% weight)
- **Color Coding**: Green (>75), Yellow (50-75), Red (<50)
- **Trend Indicator**: Improvement/stability/decline
- **Period Comparison**: Previous period score

### Charts Section

- **Revenue Trend Chart**: Last 12 months with forecast line
- **Net Profit Trend Chart**: Last 12 months with trend line
- **Order Count Trend Chart**: Last 12 months
- **KPI Comparison Chart**: Current period vs previous period (bar chart)

### Period Comparison Section (Optional, Expandable)

- **Summary Table**: Current period vs previous period metrics
- **Key Metrics Delta**: Absolute and percentage changes
- **Trend Arrows**: Visual indicators for improvements/declines

### State Management

- **Loading State**: Skeleton loaders for all cards during data fetch
- **Empty State**: Friendly message when no data available
- **Error State**: Error message with retry button

---

## Backend API Requirements

### GET /api/business-kpi/overview/

Retrieve KPI dashboard overview metrics.

**Query Parameters:**
- `start_date` (required): ISO date format (YYYY-MM-DD)
- `end_date` (required): ISO date format (YYYY-MM-DD)
- `comparison_start_date` (optional): For period comparison
- `comparison_end_date` (optional): For period comparison

**Response Format:**
```
{
  "total_revenue": {
    "current": 150000.00,
    "previous": 140000.00,
    "change_pct": 7.14,
    "currency": "USD"
  },
  "net_profit": {
    "current": 30000.00,
    "previous": 28000.00,
    "change_pct": 7.14
  },
  "profit_margin_pct": {
    "current": 20.0,
    "previous": 20.0,
    "target": 22.0
  },
  "total_orders": {
    "current": 500,
    "previous": 480,
    "avg_per_day": 16.67
  },
  "avg_order_value": {
    "current": 300.00,
    "previous": 291.67,
    "change_pct": 2.86
  },
  "customer_count": {
    "active": 250,
    "new_this_period": 15,
    "previous_period_new": 12
  },
  "inventory_turnover": {
    "current": 8.5,
    "industry_benchmark": 8.0,
    "previous": 8.2
  },
  "dio_days": {
    "current": 45,
    "previous": 47,
    "target": 40
  },
  "cash_position": {
    "available_cash": 75000.00,
    "reserved_cash": 25000.00,
    "previous": 70000.00
  },
  "receivables_outstanding": {
    "total": 45000.00,
    "overdue_days": 12,
    "aging_breakdown": {...}
  },
  "payables_outstanding": {
    "total": 35000.00,
    "aging_breakdown": {...}
  },
  "employee_count": {
    "active": 45,
    "by_department": {...}
  },
  "health_score": {
    "overall": 82,
    "previous": 80,
    "component_scores": {
      "revenue_health": 85,
      "profitability": 80,
      "cash_flow": 82,
      "efficiency": 78
    }
  },
  "period_info": {
    "start_date": "2026-05-01",
    "end_date": "2026-05-31",
    "period_name": "May 2026",
    "days": 31
  }
}
```

### GET /api/business-kpi/trends/

Retrieve KPI trends over multiple periods.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format
- `granularity` (optional): monthly/quarterly (default: monthly)

**Response Format:**
```
[
  {
    "period": "2026-05-01",
    "period_name": "May 2026",
    "revenue": 150000.00,
    "profit": 30000.00,
    "orders": 500,
    "cash_position": 75000.00,
    "health_score": 82,
    "dio_days": 45,
    "inventory_turnover": 8.5
  },
  {
    "period": "2026-04-01",
    "period_name": "April 2026",
    "revenue": 140000.00,
    "profit": 28000.00,
    "orders": 480,
    "cash_position": 70000.00,
    "health_score": 80,
    "dio_days": 47,
    "inventory_turnover": 8.2
  }
]
```

### GET /api/business-kpi/financial-ratios/

Retrieve financial ratios for given date.

**Query Parameters:**
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "liquidity_ratios": {
    "current_ratio": {
      "value": 1.8,
      "industry_benchmark": 1.5,
      "status": "healthy"
    },
    "quick_ratio": {
      "value": 1.2,
      "industry_benchmark": 1.0,
      "status": "healthy"
    },
    "cash_ratio": {
      "value": 0.6,
      "industry_benchmark": 0.5
    }
  },
  "efficiency_ratios": {
    "asset_turnover": {
      "value": 2.5,
      "previous": 2.4
    },
    "inventory_turnover": {
      "value": 8.5,
      "industry_benchmark": 8.0
    },
    "receivables_turnover": {
      "value": 12.5,
      "previous": 12.3
    }
  },
  "profitability_ratios": {
    "gross_margin_pct": {
      "value": 35.0,
      "target": 36.0
    },
    "operating_margin_pct": {
      "value": 25.0,
      "previous": 24.5
    },
    "net_margin_pct": {
      "value": 20.0,
      "industry_benchmark": 18.0
    },
    "roa": {
      "value": 15.0,
      "previous": 14.5
    },
    "roe": {
      "value": 22.0,
      "previous": 21.0
    }
  }
}
```

### GET /api/business-kpi/health-score/

Retrieve business health score details.

**Query Parameters:**
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "overall_score": 82,
  "previous_score": 80,
  "score_trend": "improving",
  "component_scores": {
    "revenue_health": {
      "score": 85,
      "factors": [
        {"name": "Revenue growth", "value": "7.14%"},
        {"name": "Revenue stability", "value": "Good"}
      ]
    },
    "profitability": {
      "score": 80,
      "factors": [
        {"name": "Profit margin", "value": "20%"},
        {"name": "Operating efficiency", "value": "Good"}
      ]
    },
    "cash_flow": {
      "score": 82,
      "factors": [
        {"name": "Cash position", "value": "Strong"},
        {"name": "Working capital", "value": "Healthy"}
      ]
    },
    "efficiency": {
      "score": 78,
      "factors": [
        {"name": "Inventory turnover", "value": "8.5x"},
        {"name": "Asset utilization", "value": "Good"}
      ]
    }
  },
  "color_code": "green"
}
```

### GET /api/business-kpi/inventory-metrics/

Retrieve inventory-related KPIs.

**Query Parameters:**
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "turnover_ratio": {
    "value": 8.5,
    "industry_benchmark": 8.0,
    "previous": 8.2
  },
  "dio_days": {
    "value": 45,
    "target": 40,
    "previous": 47
  },
  "stock_value": {
    "total": 200000.00,
    "by_status": {
      "fast_moving": 120000.00,
      "slow_moving": 60000.00,
      "dead_stock": 20000.00
    }
  },
  "fast_moving_count": 150,
  "slow_moving_count": 45,
  "dead_stock_count": 12,
  "stockout_rate": 0.02
}
```

### GET /api/business-kpi/cash-flow/

Retrieve cash position and flow analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "available_cash": 75000.00,
  "reserved_cash": 25000.00,
  "total_cash": 100000.00,
  "cash_in_transit": 5000.00,
  "receivables": {
    "current": 35000.00,
    "overdue": 10000.00,
    "total": 45000.00
  },
  "payables": {
    "current": 25000.00,
    "overdue": 10000.00,
    "total": 35000.00
  },
  "cash_flow_trend": [
    {
      "period": "2026-05-01",
      "opening_balance": 70000.00,
      "cash_inflow": 155000.00,
      "cash_outflow": 150000.00,
      "closing_balance": 75000.00
    }
  ],
  "cash_position_health": "strong"
}
```

---

## Database Requirements

### Existing Models to Leverage
- Sale / SaleItem models
- Order / OrderItem models
- Invoice / InvoiceItem models
- Bill / BillItem models
- Product model (with cost data)
- Customer / Account model
- Employee model
- Tenant model (for multi-tenancy)

### Required Indexes
- `(tenant_id, created_at DESC)` - for tenant and date filtering
- `(status, created_at)` - for status-based filtering
- `(account_id, created_at)` - for customer filtering
- `(product_id, created_at)` - for product filtering

### Optional Performance Enhancement
- **KPIDailyCache Table**: Cache daily aggregations (health_score, ratios, inventory_metrics)
- **Fields**: tenant_id, date, cache_key, cache_value, created_at, expires_at
- **Purpose**: Reduce calculation time for frequently accessed KPIs
- **TTL**: 24 hours for daily metrics, 7 days for monthly

---

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Backend revenue trends | ✅ IMPLEMENTED | RevenueTrendView available |
| Backend P&L | ✅ IMPLEMENTED | ProfitLossView available |
| Backend daily metrics | ✅ IMPLEMENTED | StoreDashboardView available |
| KPI metrics endpoints | ❌ NOT IMPLEMENTED | Need to create |
| Financial ratios calculation | ❌ NOT IMPLEMENTED | Need calculation service |
| Business health scoring | ❌ NOT IMPLEMENTED | Need algorithm |
| Inventory turnover calculation | ❌ NOT IMPLEMENTED | Need calculation |
| Cash flow analysis | ⚠️ PARTIAL | Only basic data available |
| Frontend KPI Dashboard | ❌ NOT IMPLEMENTED | Need to create page |
| KPI caching | ❌ NOT IMPLEMENTED | Need caching strategy |
| Period comparison | ❌ NOT IMPLEMENTED | Need comparison logic |

---

## Validation & Edge Cases

### Date Range Validation
- Start date must be <= end date
- End date must not exceed current date
- Range must not exceed 24 months for performance

### Period Comparison
- Comparison periods must not overlap with current period
- Same period length preferred for fair comparison
- Handle month-end date mismatches gracefully

### Inventory Turnover Requirements
- Requires accurate product cost data
- Zero cost products excluded from calculation
- Handles zero-division scenarios

### Days of Inventory Outstanding (DIO)
- Requires accurate stock levels and purchase data
- Handles zero inventory scenarios
- Uses COGS for accurate calculation

### Cash Position
- May include multiple currencies (if applicable)
- Sums all cash accounts
- Excludes reserved/committed cash from "available"

### Receivables/Payables Aging
- Based on invoice due dates, not creation dates
- Overdue buckets: Current, 30-60 days, 60-90 days, >90 days
- Excludes cancelled/void documents

### Financial Ratios
- Handles zero-division in denominator
- Uses absolute values where appropriate
- Year-over-year comparisons use aligned periods

### Health Score Weighting
- May vary by business type/industry
- Configurable weights per tenant
- Normalized to 0-100 scale

### Multi-tenant Isolation
- All queries filtered by tenant_id
- Cross-tenant data access prevented
- Comparison periods within same tenant only

---

## Testing Checklist

### KPI Card Functionality
- [ ] All 12 KPI cards render correctly
- [ ] Cards show correct data types (currency, percentage, count)
- [ ] Trend indicators display accurately
- [ ] Period selector changes all metrics consistently
- [ ] Responsive layout on mobile/tablet/desktop

### KPI Calculations
- [ ] Total revenue calculated correctly
- [ ] Net profit calculated correctly (Revenue - COGS - Operating Expenses)
- [ ] Profit margin % correct (Net Profit / Revenue)
- [ ] Total orders count accurate
- [ ] Average order value calculated correctly (Revenue / Orders)
- [ ] Customer count accurate
- [ ] Inventory turnover calculated correctly (COGS / Avg Inventory)
- [ ] DIO calculated correctly (365 / Inventory Turnover)
- [ ] Cash position displays correctly
- [ ] Receivables amount accurate
- [ ] Payables amount accurate
- [ ] Employee count accurate

### Business Health Score
- [ ] Health score calculates and displays (0-100)
- [ ] Component breakdown accurate (revenue, profitability, cash flow, efficiency)
- [ ] Color coding correct (green/yellow/red)
- [ ] Trend indicator shows improvement/decline
- [ ] Previous period score displayed for comparison

### Financial Ratios
- [ ] Current ratio calculated correctly
- [ ] Quick ratio calculated correctly
- [ ] Debt-to-equity ratio accurate
- [ ] ROA (Return on Assets) accurate
- [ ] ROE (Return on Equity) accurate
- [ ] All ratios handle zero-division gracefully

### Chart Functionality
- [ ] Revenue trend chart renders with 12 months of data
- [ ] Profit trend chart renders correctly
- [ ] Order count trend chart renders
- [ ] Charts are interactive (hover tooltip, click for detail)
- [ ] Forecast lines display when applicable
- [ ] Benchmark lines display when applicable

### Period Comparison
- [ ] Comparison period selector works
- [ ] Metrics update for selected period
- [ ] Delta calculations correct (absolute and percentage)
- [ ] Comparison period doesn't overlap with current period
- [ ] Trend arrows show improvement/decline

### User Interactions
- [ ] Period selector changes all metrics
- [ ] Refresh button updates all data
- [ ] Export button initiates download
- [ ] Expandable sections toggle correctly
- [ ] Responsive design maintains functionality

### Edge Cases
- [ ] Empty state displays when no data available
- [ ] Error handling shows helpful messages
- [ ] Loading states appear during data fetch
- [ ] Large datasets don't cause performance issues
- [ ] Multi-tenant isolation verified
- [ ] Date validation works

---

## Implementation Checklist

### Frontend Components
- [ ] KPI Dashboard page component
- [ ] Metric cards components (reusable for 12 cards)
- [ ] Period selector component (with presets)
- [ ] Comparison period selector component
- [ ] KPI trends chart component (line chart)
- [ ] Financial ratios display component (grid/cards)
- [ ] Business health score component (gauge visualization)
- [ ] Revenue trend chart component
- [ ] Profit trend chart component
- [ ] Order count trend chart component
- [ ] KPI comparison table component
- [ ] Loading skeleton component
- [ ] Empty state component
- [ ] Error state component

### API Integration
- [ ] API client methods for all 5 endpoints
- [ ] Request parameter handling
- [ ] Response parsing and transformation
- [ ] Error handling and retry logic
- [ ] Caching strategy for API responses

### State Management
- [ ] Redux/Context store setup for KPI data
- [ ] Slice/reducer for KPI state
- [ ] Actions for fetching KPIs
- [ ] Selectors for KPI data
- [ ] Loading/error states in store

### Backend Services
- [ ] KPI aggregation service
- [ ] Financial ratio calculation service
- [ ] Business health scoring algorithm service
- [ ] Inventory metrics calculation service
- [ ] Cash flow analysis service
- [ ] Period comparison logic service

### Backend API Endpoints
- [ ] GET /api/business-kpi/overview/
- [ ] GET /api/business-kpi/trends/
- [ ] GET /api/business-kpi/financial-ratios/
- [ ] GET /api/business-kpi/health-score/
- [ ] GET /api/business-kpi/inventory-metrics/
- [ ] GET /api/business-kpi/cash-flow/

### Database/Caching
- [ ] KPI caching strategy implementation
- [ ] Cache invalidation logic
- [ ] KPIDailyCache table (if implemented)
- [ ] Database indexes for performance

### Testing
- [ ] Unit tests for KPI calculations
- [ ] Unit tests for ratio calculations
- [ ] Unit tests for health score algorithm
- [ ] Integration tests for API endpoints
- [ ] Component tests for all UI components
- [ ] E2E tests for dashboard workflow
- [ ] Performance tests for large datasets

### Documentation
- [ ] Component API documentation
- [ ] Backend service documentation
- [ ] KPI definitions guide
- [ ] Ratio calculation guide
- [ ] Health score guide
- [ ] Performance optimization guide
- [ ] Troubleshooting guide

### Styling & UX
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Accessibility support (ARIA labels, keyboard navigation)
- [ ] Dark mode support (if applicable)
- [ ] Color scheme for health score (green/yellow/red)
- [ ] Loading animations
- [ ] Error notifications
- [ ] Success notifications

---

## Deployment Strategy

### Phase 1: Backend Services
1. Deploy KPI aggregation service
2. Deploy KPI metrics endpoints
3. Deploy caching layer
4. Run database migrations (if needed)
5. Validate all KPI calculations with production data

### Phase 2: Frontend
1. Deploy frontend KPI Dashboard page
2. Deploy API client methods
3. Deploy state management
4. Verify all components render correctly

### Phase 3: Monitoring & Validation
1. Monitor dashboard view frequency
2. Monitor KPI calculation times
3. Verify data accuracy with manual checks
4. Validate multi-tenant isolation
5. Check performance under load

### Phase 4: Training & Documentation
1. Staff training on KPI interpretation
2. Documentation release
3. Internal wiki updates
4. Support team briefing

### Rollback Plan
- Maintain business data availability
- Keep previous API versions running during transition
- Database rollback scripts prepared
- Feature flag for dashboard visibility

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Dashboard load time | <500ms | Quick page render |
| KPI card data load | <300ms | Individual metric fetch |
| Chart render time | <1s | Complex data visualization |
| API endpoint response | <500ms | Fast data retrieval |
| Health score calculation | <200ms | Real-time computation |
| Page interactive | <1s | User can interact quickly |

### Optimization Strategies
- Implement KPI caching with 24-hour TTL
- Use database indexes for fast aggregations
- Lazy load charts and detail sections
- Implement virtual scrolling for large tables
- Use React.memo for card components
- Implement request debouncing for period selector

---

## Monitoring & Alerting

### Metrics to Track
- Dashboard view frequency and user count
- KPI calculation execution times
- API endpoint response times
- Cache hit rate and cache invalidation events
- Error rates for KPI endpoints
- Data anomalies (unusual KPI changes)

### Alerts to Configure
- KPI calculation exceeds 1s
- API endpoint response > 500ms
- Health score calculation fails
- Cache invalidation failures
- Data quality issues (negative values where unexpected)
- Missing required data for calculations

### Dashboards to Create
- KPI Dashboard performance monitoring
- User engagement with KPI features
- Calculation time trends
- Cache effectiveness metrics

---

## Documentation Requirements

### User Documentation
1. **KPI Definitions Guide**
   - Definition of each KPI card metric
   - Industry context and benchmarks
   - Interpretation guidelines

2. **Ratio Calculation Guide**
   - Formula for each ratio
   - When to use each ratio
   - Industry benchmarks

3. **Business Health Score Guide**
   - Component breakdown explanation
   - Color coding interpretation
   - How score is calculated

4. **Period Comparison Guide**
   - How to use period selector
   - Understanding delta calculations
   - Trend interpretation

5. **Export Guide**
   - How to export KPIs
   - Supported formats
   - Scheduling exports

6. **Troubleshooting Guide**
   - Common issues and solutions
   - Data accuracy validation
   - Support contact information

### Technical Documentation
- Architecture overview
- API endpoint specifications
- Database schema and indexes
- Caching strategy documentation
- Performance optimization guide

---

## Future Enhancements

1. **KPI Forecasting**
   - ML-based revenue forecasting
   - Trend extrapolation
   - Seasonal adjustment

2. **Benchmark Comparison**
   - Industry standard benchmarks
   - Peer comparison (if available)
   - Best practice indicators

3. **KPI Alert Thresholds**
   - Configure upper/lower bounds
   - Alert notifications
   - Email digests

4. **Custom KPI Definitions**
   - User-defined metrics
   - Custom formulas
   - Saved custom KPI sets

5. **Department-Level KPIs**
   - KPIs by department
   - Performance tracking
   - Department comparison

6. **Predictive Analytics**
   - Anomaly detection
   - Trend prediction
   - Outlier identification

7. **Goal Setting and Tracking**
   - Set KPI targets
   - Track progress
   - Achievement notifications

8. **KPI Dashboards by Role**
   - Different dashboard views
   - Role-specific metrics
   - Department manager dashboards

---

## Success Criteria

- ✅ All 12 KPI cards display accurate metrics within <500ms
- ✅ Business health score calculated correctly
- ✅ Period comparison works as expected
- ✅ Dashboard loads within performance targets
- ✅ No data accuracy issues identified
- ✅ Multi-tenant isolation verified
- ✅ Staff can interpret and act on KPI insights
- ✅ Adoption rate > 80% of leadership users
- ✅ Positive feedback from stakeholders
