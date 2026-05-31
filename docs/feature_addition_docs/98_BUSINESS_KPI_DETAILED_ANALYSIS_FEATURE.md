# Business KPI Detailed Analysis Feature (Document 98)

## Executive Summary

Detailed Business KPI Analysis providing comprehensive financial and operational metrics with drill-down capability, period comparisons, ratio analysis, and KPI benchmarking enabling detailed business performance analysis and decision-making.

---

## Current State Analysis

### EXISTING Implementation

- **RevenueTrendView** - provides revenue trends and analysis
- **ProfitLossView** - generates P&L statements
- **Customer, Sales, Inventory, Financial Analytics Views** - multiple data sources available
- **Historical Sales, Order, Invoice, Bill Data** - comprehensive transaction history
- **Multi-tenant Isolation** - secure tenant separation
- **User Authentication** - role-based access control

### MISSING (Completely Absent or Incomplete)

- **Comprehensive KPI Analysis Page** - NO dedicated page exists
- **Detailed Financial Ratio Analysis** - NO breakdown by ratio category
- **Operating Leverage Analysis** - NOT available
- **Working Capital Analysis** - NOT implemented
- **Receivables Detail Analysis** - Limited or absent
- **Payables Detail Analysis** - Limited or absent
- **Inventory Analysis Detail** - NOT comprehensive
- **Customer Profitability Analysis** - NOT available
- **Product Profitability Analysis** - NOT available
- **Department Profitability Analysis** - NOT available (if applicable)
- **KPI Drill-down Capability** - NOT implemented
- **Multi-period Comparison** - NOT available
- **Variance Analysis** - NOT implemented (budget vs actual)
- **Trend Analysis with Forecasts** - NOT available
- **Benchmarking Data Integration** - NOT available
- **Custom Metrics Builder** - NOT available
- **Saved Analysis Configurations** - NOT available

---

## Frontend Features

### Page Header
- **Page Title**: "Detailed Business KPI Analysis"
- **Period Selector**: Start/end date picker with preset options
- **Comparison Period Selector**: Optional comparison with previous period
- **Filter Panel Button**: Toggle advanced filters
- **Export/Download Button**: Export analysis results
- **Save Analysis Button**: Save current analysis configuration for reuse

### Filter Panel (Collapsible)
- **Department Filter**: Multi-select department filter (if applicable)
- **Product Category Filter**: Filter by product category
- **Customer Segment Filter**: Filter by customer segment
- **Clear All Filters Button**: Reset all filters to default
- **Apply Filters Button**: Apply selected filters

### Main Content (Tabbed Interface)

#### Financial Performance Tab (Default)

**Revenue Breakdown Table:**
- **Columns**: Category, Period Value, Previous Period, Change %, YoY %, Trend
- **Sortable**: Click column headers to sort
- **Rows**:
  - Sales Revenue
  - Service Revenue
  - Other Revenue
  - Returns/Refunds
  - Net Revenue
- **Summary Row**: Total revenue with trend
- **Color Coding**: Positive changes green, negative red

**Gross Profit Analysis:**
- Gross profit amount and trend
- Gross margin % and trend
- COGS analysis
- Gross profit by product category

**Operating Expense Analysis:**
- Operating expenses breakdown
- Operating expense ratio
- Expense trends
- Efficiency comparison

**Net Profit Analysis:**
- Net profit amount and trend
- Net margin % and trend
- Bottom-line efficiency
- Period comparison

**Profitability Comparison Chart:**
- Multi-period comparison (last 6 months)
- Revenue vs Profit visualization
- Profit margin trend line

#### Financial Ratios Tab

**Liquidity Ratios Section:**
- **Current Ratio**:
  - Formula: Current Assets / Current Liabilities
  - Current value
  - Target value
  - Industry benchmark
  - 12-month trend chart
  - Interpretation guidance

- **Quick Ratio** (Acid-Test Ratio):
  - Formula: (Current Assets - Inventory) / Current Liabilities
  - Current value
  - Industry benchmark
  - Trend chart
  - Interpretation

- **Cash Ratio**:
  - Formula: Cash & Equivalents / Current Liabilities
  - Current value
  - Trend chart
  - Liquidity assessment

**Efficiency Ratios Section:**
- **Asset Turnover**:
  - Formula: Revenue / Total Assets
  - Current value
  - Previous period value
  - Trend chart
  - Efficiency assessment

- **Inventory Turnover**:
  - Formula: COGS / Average Inventory
  - Current value
  - Industry benchmark
  - 12-month trend
  - Assessment (fast-moving vs slow-moving)

- **Receivables Turnover**:
  - Formula: Revenue / Average Receivables
  - Current value
  - Previous period
  - Trend chart
  - Collection efficiency

- **Payables Period** (Days):
  - Formula: 365 / Payables Turnover
  - Current value in days
  - Trend
  - Payment policy assessment

**Profitability Ratios Section:**
- **Gross Margin %**:
  - Formula: (Revenue - COGS) / Revenue × 100
  - Current value
  - Target value
  - 12-month trend
  - Category breakdown

- **Operating Margin %**:
  - Formula: Operating Profit / Revenue × 100
  - Current value
  - Previous period
  - Trend chart
  - Efficiency comparison

- **Net Margin %**:
  - Formula: Net Profit / Revenue × 100
  - Current value
  - Industry benchmark
  - Trend chart
  - Profitability assessment

- **Return on Assets (ROA)**:
  - Formula: Net Income / Total Assets × 100
  - Current value
  - Industry benchmark
  - Trend
  - Asset efficiency

- **Return on Equity (ROE)**:
  - Formula: Net Income / Shareholder Equity × 100
  - Current value
  - Industry benchmark
  - Trend
  - Shareholder return

**DuPont Analysis** (if available):
- ROE breakdown into three components
- Net Margin × Asset Turnover × Equity Multiplier
- Component trends
- Driver identification

#### Working Capital Tab

**Cash Conversion Cycle (CCC):**
- Days Inventory Outstanding (DIO)
- Days Sales Outstanding (DSO)
- Days Payables Outstanding (DPO)
- CCC = DIO + DSO - DPO
- 12-month trend
- Target comparison
- Efficiency assessment

**Components Breakdown:**
- **DIO (Days Inventory Outstanding)**:
  - Days inventory sits before sale
  - Trend chart
  - By product category
  - Optimization recommendations

- **DSO (Days Sales Outstanding)**:
  - Days to collect payment
  - Trend chart
  - By customer segment
  - Collection efficiency

- **DPO (Days Payables Outstanding)**:
  - Days taken to pay suppliers
  - Trend chart
  - Payment policy analysis

**Working Capital Chart:**
- Components stacked bar chart
- CCC trend line
- Target line
- Period comparison

**Cash Flow Bridge:**
- Opening cash balance
- Operating cash flow
- Investing cash flow
- Financing cash flow
- Closing cash balance
- Waterfall chart visualization

#### Receivables Analysis Tab

**Receivables Aging Table:**
- **Columns**: Age Bucket, Amount, Count of Invoices, % of Total, Days Overdue
- **Age Buckets**:
  - Current (0-30 days)
  - 31-60 days overdue
  - 61-90 days overdue
  - >90 days overdue
- **Color Coding**:
  - Green: Current invoices
  - Yellow: 31-60 days overdue
  - Orange: 61-90 days overdue
  - Red: >90 days overdue
- **Sorting & Filtering**: By amount, count, age

**Top Overdue Customers:**
- Customer name
- Outstanding amount
- Days overdue
- Invoice details
- Contact information link

**Days Sales Outstanding (DSO) Trend:**
- 12-month trend chart
- Industry benchmark line
- Target line
- Trend direction indicator

**Bad Debt Reserve Estimate:**
- Estimated uncollectible amount
- Based on aging and historical write-offs
- Percentage of total receivables
- Reserve adequacy assessment

**Collection Metrics:**
- Collection rate %
- Average days to collect
- Collection efficiency score

#### Payables Analysis Tab

**Payables Aging Table:**
- **Columns**: Age Bucket, Amount, Count of Bills, % of Total, Days Due/Overdue
- **Age Buckets**:
  - Current/Due Soon (0-15 days)
  - 16-30 days
  - 31-60 days
  - >60 days
- **Color Coding**:
  - Green: Current payables
  - Yellow: 16-30 days old
  - Orange: 31-60 days old
  - Red: >60 days old (overdue)
- **Aggregation**: By supplier, category

**Top Payables:**
- Supplier name
- Outstanding amount
- Due date / Days overdue
- Bill details
- Payment terms

**Days Payables Outstanding (DPO) Trend:**
- 12-month trend chart
- Previous period comparison
- Payment policy baseline
- Trend direction

**Payment Schedule:**
- Upcoming payment dates
- Amount due by date
- Cash requirement forecast
- Payment obligations by supplier

**Payables Metrics:**
- Average days to pay
- On-time payment rate
- Overdue percentage
- Supplier relationship health

#### Profitability by Department Tab (if applicable)

**Department Profitability Table:**
- **Columns**: Department, Revenue, COGS, Gross Profit, Operating Costs, Net Profit, Margin %
- **Sortable & Filterable**: By metric
- **Comparison**: Current vs previous period with delta
- **Trend Indicators**: Up/down arrows
- **Details Link**: Click for department drill-down

**Department Performance Summary:**
- Top performing department
- Lowest performing department
- Department growth rates
- Efficiency comparison

**Department Comparison Chart:**
- Revenue and profit by department (side-by-side bars)
- Margin % comparison
- Trend lines

#### Profitability by Product Tab

**Product Profitability Ranking:**
- **Columns**: Product Name, Units Sold, Revenue, Cost, Gross Profit, Margin %, Trend
- **Sorting**: By revenue, profit, margin %
- **Filtering**: By category, supplier
- **Pagination**: For large product lists

**Product Category Performance:**
- Revenue and profit by category
- Category margin comparison
- Top categories by profit
- Growth rates

**Fast/Slow Movers Analysis:**
- **Fast Movers**: High velocity, high profit items
- **Slow Movers**: Low velocity items (consider discontinuing)
- **Dead Stock**: Items with no sales in period
- **Recommendations**: Stock optimization suggestions

**Product Performance Chart:**
- Scatter plot (units sold vs margin %)
- Bubble size = revenue
- Category color-coding
- Quadrant analysis (stars, cash cows, dogs, question marks)

#### Variance Analysis Tab (if budget available)

**Budget vs Actual Analysis:**
- **Columns**: Line Item, Budget, Actual, Variance ($), Variance (%), Status
- **Categories**:
  - Revenue variances
  - COGS variances
  - Operating expense variances
  - Profit variances
- **Color Coding**:
  - Green: Favorable variance
  - Red: Unfavorable variance
  - Neutral: Within tolerance

**Variance Breakdown:**
- Revenue variance analysis
- Cost variance analysis
- Controllable vs uncontrollable variances
- Trend of variances

**Root Cause Analysis** (if available):
- Explanation of significant variances
- Contributing factors
- Recommended actions

#### KPI Trends Tab

**KPI Line Chart (Multiple Metrics):**
- Y-axis: KPI value
- X-axis: Time periods (months/quarters)
- Multiple metric lines (different colors)
- Legend for metric identification

**Metric Selector:**
- Checkboxes for available metrics
- Multi-select capability
- Preset metric combinations
- Custom metric combinations

**Period Selector:**
- Granularity: Monthly / Quarterly / Yearly
- Date range selection
- Preset ranges (Last 6 months, Year-to-date, etc.)

**Forecast Line** (if available):
- Projected trend based on historical data
- Forecast confidence interval
- ML-based forecasting

**Benchmark Line** (if available):
- Industry standard benchmark
- Best-in-class benchmark
- Performance gap visualization

**Interactive Features:**
- Hover tooltip showing exact values
- Click legend to toggle metric visibility
- Zoom and pan capabilities
- Export chart as image

---

## Backend API Requirements

### GET /api/business-kpi/financial-detail/

Retrieve detailed financial analysis data.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format
- `comparison_start_date` (optional): For period comparison
- `comparison_end_date` (optional): For period comparison

**Response Format:**
```
{
  "revenue_detail": {
    "sales_revenue": {
      "current": 130000.00,
      "previous": 125000.00,
      "change_pct": 4.0
    },
    "service_revenue": {
      "current": 15000.00,
      "previous": 12000.00,
      "change_pct": 25.0
    },
    "other_revenue": {
      "current": 5000.00,
      "previous": 3000.00,
      "change_pct": 66.67
    },
    "returns_refunds": {
      "current": -2000.00,
      "previous": -1500.00,
      "change_pct": 33.33
    },
    "total_net_revenue": {
      "current": 150000.00,
      "previous": 140000.00,
      "change_pct": 7.14
    }
  },
  "cogs_detail": {
    "amount": 97500.00,
    "percentage_of_revenue": 65.0,
    "previous_percentage": 64.29,
    "by_category": [...]
  },
  "gross_profit": {
    "amount": 52500.00,
    "margin_pct": 35.0,
    "previous_margin": 35.71
  },
  "operating_expenses": {
    "salaries_wages": 15000.00,
    "rent_utilities": 5000.00,
    "marketing": 3000.00,
    "other": 2000.00,
    "total": 25000.00
  },
  "operating_profit": {
    "amount": 27500.00,
    "margin_pct": 18.33
  },
  "profitability_analysis": {
    "net_profit": 30000.00,
    "net_margin_pct": 20.0
  }
}
```

### GET /api/business-kpi/ratios-detail/

Retrieve detailed financial ratio analysis.

**Query Parameters:**
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "liquidity_ratios": {
    "current_ratio": {
      "value": 1.8,
      "formula": "Current Assets / Current Liabilities",
      "industry_benchmark": 1.5,
      "interpretation": "Company has $1.80 in current assets for every $1 in current liabilities",
      "assessment": "healthy"
    },
    "quick_ratio": {
      "value": 1.2,
      "formula": "(Current Assets - Inventory) / Current Liabilities",
      "industry_benchmark": 1.0,
      "assessment": "healthy"
    },
    "cash_ratio": {
      "value": 0.6,
      "formula": "Cash & Equivalents / Current Liabilities",
      "assessment": "adequate"
    }
  },
  "efficiency_ratios": {
    "asset_turnover": {
      "value": 2.5,
      "formula": "Revenue / Total Assets",
      "previous": 2.4,
      "trend": "improving",
      "interpretation": "Company generates $2.50 in revenue for every $1 in assets"
    },
    "inventory_turnover": {
      "value": 8.5,
      "formula": "COGS / Average Inventory",
      "industry_benchmark": 8.0,
      "dio_days": 45,
      "trend": "stable"
    },
    "receivables_turnover": {
      "value": 12.5,
      "formula": "Revenue / Average Receivables",
      "dso_days": 29,
      "previous_dso": 30,
      "trend": "improving"
    },
    "payables_turnover": {
      "value": 10.0,
      "dpo_days": 36
    }
  },
  "profitability_ratios": {
    "gross_margin_pct": {
      "value": 35.0,
      "target": 36.0,
      "previous": 35.71,
      "trend": "declining",
      "by_category": [...]
    },
    "operating_margin_pct": {
      "value": 18.33,
      "previous": 20.0,
      "trend": "declining"
    },
    "net_margin_pct": {
      "value": 20.0,
      "industry_benchmark": 18.0,
      "previous": 20.0,
      "trend": "stable"
    },
    "roa": {
      "value": 15.0,
      "formula": "Net Income / Total Assets × 100",
      "previous": 14.5,
      "trend": "improving"
    },
    "roe": {
      "value": 22.0,
      "formula": "Net Income / Shareholder Equity × 100",
      "previous": 21.0,
      "industry_benchmark": 20.0,
      "trend": "improving"
    }
  },
  "dupont_analysis": {
    "net_margin": 20.0,
    "asset_turnover": 2.5,
    "equity_multiplier": 1.8,
    "roe": 22.0,
    "component_contribution": {...}
  }
}
```

### GET /api/business-kpi/working-capital/

Retrieve working capital analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "dio_days": {
    "value": 45,
    "formula": "365 / Inventory Turnover",
    "previous": 47,
    "trend": "improving",
    "by_category": [...]
  },
  "dso_days": {
    "value": 29,
    "formula": "365 / Receivables Turnover",
    "previous": 30,
    "trend": "improving",
    "by_customer_segment": [...]
  },
  "dpo_days": {
    "value": 36,
    "formula": "365 / Payables Turnover",
    "previous": 35,
    "trend": "increasing"
  },
  "cash_conversion_cycle": {
    "value": 38,
    "formula": "DIO + DSO - DPO",
    "previous": 42,
    "trend": "improving",
    "interpretation": "Takes 38 days to convert investment back to cash"
  },
  "working_capital": {
    "current_assets": 250000.00,
    "current_liabilities": 150000.00,
    "working_capital_amount": 100000.00,
    "trend": "improving"
  },
  "cash_flow_bridge": {
    "opening_balance": 70000.00,
    "operating_cash_flow": 35000.00,
    "investing_cash_flow": -10000.00,
    "financing_cash_flow": -20000.00,
    "closing_balance": 75000.00
  }
}
```

### GET /api/business-kpi/receivables-detail/

Retrieve receivables analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format
- `days_overdue_thresholds` (optional): Custom aging buckets

**Response Format:**
```
{
  "total_receivables": 45000.00,
  "aging_buckets": [
    {
      "bucket": "0-30 days",
      "amount": 30000.00,
      "count": 60,
      "percentage": 66.67,
      "status": "current"
    },
    {
      "bucket": "31-60 days",
      "amount": 10000.00,
      "count": 15,
      "percentage": 22.22,
      "status": "overdue"
    },
    {
      "bucket": "61-90 days",
      "amount": 3000.00,
      "count": 5,
      "percentage": 6.67,
      "status": "severely_overdue"
    },
    {
      "bucket": ">90 days",
      "amount": 2000.00,
      "count": 3,
      "percentage": 4.44,
      "status": "critical"
    }
  ],
  "overdue_customers": [
    {
      "customer_id": "C123",
      "customer_name": "Customer A",
      "outstanding_amount": 8000.00,
      "days_overdue": 65,
      "invoices": [
        {"number": "INV001", "amount": 5000.00, "due_date": "2026-03-31"}
      ]
    }
  ],
  "dso_trend": [
    {"period": "2026-05-01", "dso_days": 29},
    {"period": "2026-04-01", "dso_days": 30}
  ],
  "bad_debt_estimate": {
    "estimated_uncollectible": 2000.00,
    "percentage_of_receivables": 4.44,
    "reserve_adequacy": "adequate"
  },
  "collection_metrics": {
    "collection_rate_pct": 95.0,
    "average_days_to_collect": 29,
    "collection_efficiency_score": 92
  }
}
```

### GET /api/business-kpi/payables-detail/

Retrieve payables analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "total_payables": 35000.00,
  "aging_buckets": [
    {
      "bucket": "0-15 days",
      "amount": 20000.00,
      "count": 25,
      "percentage": 57.14,
      "status": "current"
    },
    {
      "bucket": "16-30 days",
      "amount": 10000.00,
      "count": 12,
      "percentage": 28.57,
      "status": "due_soon"
    },
    {
      "bucket": "31-60 days",
      "amount": 3000.00,
      "count": 4,
      "percentage": 8.57,
      "status": "overdue"
    },
    {
      "bucket": ">60 days",
      "amount": 2000.00,
      "count": 2,
      "percentage": 5.71,
      "status": "critical"
    }
  ],
  "top_payables": [
    {
      "supplier_id": "S456",
      "supplier_name": "Supplier X",
      "outstanding_amount": 15000.00,
      "due_date": "2026-06-15",
      "days_overdue": 0,
      "terms": "Net 30"
    }
  ],
  "dpo_trend": [
    {"period": "2026-05-01", "dpo_days": 36},
    {"period": "2026-04-01", "dpo_days": 35}
  ],
  "payment_schedule": [
    {
      "date": "2026-06-05",
      "amount": 5000.00,
      "count": 3
    }
  ],
  "payables_metrics": {
    "average_days_to_pay": 36,
    "on_time_payment_rate": 92.0,
    "overdue_percentage": 5.71,
    "supplier_health": "healthy"
  }
}
```

### GET /api/business-kpi/profitability-by-department/

Retrieve department profitability analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format

**Response Format:**
```
[
  {
    "department_id": "D1",
    "department_name": "Sales",
    "revenue": 100000.00,
    "cogs": 60000.00,
    "gross_profit": 40000.00,
    "operating_costs": 15000.00,
    "net_profit": 25000.00,
    "margin_pct": 25.0,
    "previous_period": {
      "revenue": 95000.00,
      "net_profit": 23000.00,
      "margin_pct": 24.21
    },
    "trend": "improving"
  },
  {
    "department_id": "D2",
    "department_name": "Operations",
    "revenue": 50000.00,
    "net_profit": 5000.00,
    "margin_pct": 10.0,
    "previous_period": {...},
    "trend": "stable"
  }
]
```

### GET /api/business-kpi/profitability-by-product/

Retrieve product profitability analysis.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format
- `limit` (optional): Number of products to return
- `offset` (optional): Pagination offset

**Response Format:**
```
{
  "total_count": 250,
  "limit": 50,
  "offset": 0,
  "products": [
    {
      "product_id": "P001",
      "product_name": "Product A",
      "category": "Electronics",
      "units_sold": 500,
      "revenue": 50000.00,
      "cost": 30000.00,
      "gross_profit": 20000.00,
      "margin_pct": 40.0,
      "trend": "improving",
      "velocity_classification": "fast_mover",
      "profitability_classification": "star"
    },
    {
      "product_id": "P002",
      "product_name": "Product B",
      "category": "Electronics",
      "units_sold": 50,
      "revenue": 10000.00,
      "cost": 7000.00,
      "gross_profit": 3000.00,
      "margin_pct": 30.0,
      "trend": "declining",
      "velocity_classification": "slow_mover",
      "profitability_classification": "dog"
    }
  ],
  "category_summary": [
    {
      "category": "Electronics",
      "revenue": 60000.00,
      "profit": 23000.00,
      "margin_pct": 38.33
    }
  ],
  "fast_movers": {
    "count": 50,
    "revenue": 120000.00,
    "profit": 50000.00
  },
  "slow_movers": {
    "count": 30,
    "revenue": 15000.00,
    "profit": 3000.00
  },
  "dead_stock": {
    "count": 5,
    "last_sale_date": "2025-11-01",
    "holding_cost": 5000.00
  }
}
```

### GET /api/business-kpi/variance-analysis/

Retrieve budget vs actual analysis (if budget data available).

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format

**Response Format:**
```
{
  "budget_vs_actual": [
    {
      "line_item": "Revenue",
      "budget": 140000.00,
      "actual": 150000.00,
      "variance_amount": 10000.00,
      "variance_pct": 7.14,
      "status": "favorable"
    },
    {
      "line_item": "COGS",
      "budget": 84000.00,
      "actual": 97500.00,
      "variance_amount": -13500.00,
      "variance_pct": -16.07,
      "status": "unfavorable"
    }
  ],
  "variance_summary": {
    "revenue_variance_pct": 7.14,
    "cost_variance_pct": -16.07,
    "profit_variance_pct": 42.86
  },
  "root_causes": [
    {
      "variance": "COGS Unfavorable",
      "causes": [
        "Higher raw material costs (+$5000)",
        "Labor overages (+$8500)"
      ],
      "recommended_actions": [...]
    }
  ]
}
```

### GET /api/business-kpi/trends-detail/

Retrieve detailed KPI trends with forecasts and benchmarks.

**Query Parameters:**
- `start_date` (required): ISO date format
- `end_date` (required): ISO date format
- `metrics` (optional): Comma-separated metric names (revenue, profit, margin_pct, dio, dso, etc.)
- `granularity` (optional): monthly/quarterly/yearly (default: monthly)

**Response Format:**
```
[
  {
    "period": "2026-05-01",
    "period_name": "May 2026",
    "metric_name": "revenue",
    "value": 150000.00,
    "forecast_value": 155000.00,
    "forecast_lower_bound": 148000.00,
    "forecast_upper_bound": 162000.00,
    "benchmark_value": 140000.00,
    "benchmark_name": "Industry Average"
  },
  {
    "period": "2026-04-01",
    "period_name": "April 2026",
    "metric_name": "revenue",
    "value": 140000.00,
    "forecast_value": 142000.00,
    "benchmark_value": 140000.00
  }
]
```

---

## Database Requirements

### Existing Models to Leverage
- Sale / SaleItem models
- Order / OrderItem models
- Invoice / InvoiceItem models
- Bill / BillItem models
- Product model (with cost data)
- Customer / Account model (with segment data)
- Department model (if applicable)
- Budget model (if available)
- Tenant model (for multi-tenancy)

### Required Indexes
- `(tenant_id, created_at)` - for tenant and date filtering
- `(status, created_at)` - for status filtering
- `(product_id, created_at)` - for product analysis
- `(customer_id, created_at)` - for customer analysis
- `(department_id, created_at)` - for department analysis (if applicable)
- `(category_id, created_at)` - for category analysis

### Performance Considerations
- Aggregate calculations for large datasets
- Consider pre-calculated daily aggregations
- Query optimization for ratio calculations

---

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Financial detail breakdown | ⚠️ PARTIAL | May exist in fragmented views |
| Ratio calculations | ❌ NOT IMPLEMENTED | Need calculation service |
| Working capital analysis | ❌ NOT IMPLEMENTED | All components needed |
| Receivables aging | ⚠️ PARTIAL | May exist, needs enhancement |
| Payables aging | ⚠️ PARTIAL | May exist, needs enhancement |
| Department profitability | ❌ NOT IMPLEMENTED | Needs implementation |
| Product profitability | ⚠️ PARTIAL | May have basic analytics |
| Variance analysis | ❌ NOT IMPLEMENTED | Requires budget data |
| KPI trends detail | ❌ NOT IMPLEMENTED | Needs trend service |
| Forecast lines | ❌ NOT IMPLEMENTED | Requires ML/statistical service |
| Benchmarking | ❌ NOT IMPLEMENTED | Need benchmark data |

---

## Validation & Edge Cases

### Date Range Validation
- Start date must be <= end date
- End date must not exceed current date
- Range must not exceed 24 months for performance

### Ratio Calculations
- Handle zero-division in denominator
- Use absolute values where appropriate
- Year-over-year comparisons use aligned periods
- Null handling for missing data

### Aging Bucket Definitions
- Configurable age thresholds
- Consistent bucket definitions across analysis
- Handle edge cases (invoices dated in future)

### Negative Values
- Negative inventory handled appropriately
- Refunds and returns treated correctly
- Write-offs excluded from aging

### Large Datasets
- Pagination for product/customer lists
- Lazy loading for charts
- Summary-level aggregation for display

### Multi-tenant Isolation
- All queries filtered by tenant_id
- Cross-tenant data access prevented
- Comparison periods within same tenant

---

## Testing Checklist

### Financial Performance Tab
- [ ] Revenue breakdown displays correctly
- [ ] Revenue calculations accurate
- [ ] COGS breakdown correct
- [ ] Gross profit calculations accurate
- [ ] Operating expense breakdown correct
- [ ] Net profit calculations accurate
- [ ] Margin % calculations correct
- [ ] Period comparison works
- [ ] Profitability chart renders

### Financial Ratios Tab
- [ ] Current ratio calculated correctly
- [ ] Quick ratio calculated correctly
- [ ] Cash ratio calculated correctly
- [ ] Asset turnover accurate
- [ ] Inventory turnover accurate
- [ ] Receivables turnover accurate
- [ ] Payables period accurate
- [ ] Gross margin % correct
- [ ] Operating margin % correct
- [ ] Net margin % correct
- [ ] ROA calculated correctly
- [ ] ROE calculated correctly
- [ ] DuPont analysis (if available) correct
- [ ] Trend charts render
- [ ] Industry benchmarks display

### Working Capital Tab
- [ ] DIO calculated correctly
- [ ] DSO calculated correctly
- [ ] DPO calculated correctly
- [ ] CCC calculated correctly (DIO + DSO - DPO)
- [ ] Trend charts render
- [ ] Cash conversion cycle interpretation correct
- [ ] Cash flow bridge accurate
- [ ] Waterfall visualization correct

### Receivables Analysis Tab
- [ ] Aging table displays correctly
- [ ] Age buckets correct
- [ ] Amount and count accurate
- [ ] Percentage calculations correct
- [ ] Color coding appropriate
- [ ] Overdue customers identified correctly
- [ ] DSO trend chart renders
- [ ] Bad debt estimate reasonable
- [ ] Collection metrics calculated correctly

### Payables Analysis Tab
- [ ] Aging table displays correctly
- [ ] Age buckets correct
- [ ] Amount accurate
- [ ] Color coding appropriate
- [ ] Top payables identified
- [ ] DPO trend chart renders
- [ ] Payment schedule accurate
- [ ] Payables metrics calculated correctly

### Profitability by Department (if applicable)
- [ ] Department profitability table displays
- [ ] Revenue accurate by department
- [ ] Profit calculations correct
- [ ] Margin % accurate
- [ ] Comparison with previous period works
- [ ] Department comparison chart renders
- [ ] Sorting and filtering work

### Profitability by Product
- [ ] Product list displays with pagination
- [ ] Units sold accurate
- [ ] Revenue correct
- [ ] Cost accurate
- [ ] Profit margin calculated correctly
- [ ] Product category breakdown correct
- [ ] Fast/slow mover classification accurate
- [ ] Dead stock identified correctly
- [ ] Product performance chart renders
- [ ] Quadrant analysis meaningful

### Variance Analysis (if budget available)
- [ ] Budget vs actual comparison accurate
- [ ] Variance calculations correct
- [ ] Favorable/unfavorable identification correct
- [ ] Root cause analysis displays (if available)
- [ ] Trend of variances shows

### KPI Trends Tab
- [ ] Chart renders with selected metrics
- [ ] Multiple metrics display correctly
- [ ] Metric selection works
- [ ] Period selector works
- [ ] Forecast line displays (if available)
- [ ] Benchmark line displays (if available)
- [ ] Interactive features work (hover, click, zoom)

### User Experience
- [ ] Tab switching works smoothly
- [ ] Filter panel opens/closes
- [ ] Filters apply correctly
- [ ] Clear filters button works
- [ ] Export/download works
- [ ] Responsive design on mobile/tablet
- [ ] Large datasets load efficiently
- [ ] Error states display helpful messages
- [ ] Loading states appear during fetch

---

## Implementation Checklist

### Frontend Components
- [ ] Detailed analysis page component
- [ ] Tab navigation component
- [ ] Financial performance component
- [ ] Ratio analysis component
- [ ] Working capital component
- [ ] Receivables analysis component
- [ ] Payables analysis component
- [ ] Profitability by department component (if applicable)
- [ ] Profitability by product component
- [ ] Variance analysis component (if budget available)
- [ ] KPI trends component
- [ ] Filter panel component
- [ ] Data table component with sorting/filtering
- [ ] Chart components (line, bar, scatter, waterfall)
- [ ] Pagination component
- [ ] Loading skeleton component
- [ ] Empty state component
- [ ] Error state component

### API Integration
- [ ] API client methods for all endpoints
- [ ] Request parameter handling
- [ ] Response parsing and transformation
- [ ] Error handling and retry logic
- [ ] Caching strategy for API responses

### State Management
- [ ] Redux/Context store setup
- [ ] Slices/reducers for analysis data
- [ ] Actions for fetching data
- [ ] Selectors for data access
- [ ] Loading/error states

### Backend Services
- [ ] Financial detail calculation service
- [ ] Financial ratio calculation service
- [ ] Working capital calculation service
- [ ] Receivables analysis service
- [ ] Payables analysis service
- [ ] Department profitability service (if applicable)
- [ ] Product profitability service
- [ ] Variance analysis service (if budget available)
- [ ] KPI trends service
- [ ] Data transformation and formatting service

### Backend API Endpoints
- [ ] GET /api/business-kpi/financial-detail/
- [ ] GET /api/business-kpi/ratios-detail/
- [ ] GET /api/business-kpi/working-capital/
- [ ] GET /api/business-kpi/receivables-detail/
- [ ] GET /api/business-kpi/payables-detail/
- [ ] GET /api/business-kpi/profitability-by-department/ (if applicable)
- [ ] GET /api/business-kpi/profitability-by-product/
- [ ] GET /api/business-kpi/variance-analysis/ (if budget available)
- [ ] GET /api/business-kpi/trends-detail/

### Testing
- [ ] Unit tests for calculation services
- [ ] Unit tests for data transformation
- [ ] Integration tests for API endpoints
- [ ] Component tests for UI components
- [ ] E2E tests for analysis workflows
- [ ] Performance tests for large datasets

### Documentation
- [ ] Component API documentation
- [ ] Backend service documentation
- [ ] Ratio calculation guide
- [ ] Working capital guide
- [ ] Aging analysis guide
- [ ] Profitability analysis guide
- [ ] API endpoint documentation

### Styling & UX
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Accessibility support (ARIA, keyboard navigation)
- [ ] Dark mode support (if applicable)
- [ ] Color scheme for tables/charts
- [ ] Sorting/filtering UX
- [ ] Loading animations
- [ ] Error notifications
- [ ] Success notifications

---

## Deployment Strategy

### Phase 1: Backend Services
1. Deploy financial analysis services
2. Deploy ratio calculation services
3. Deploy all analysis endpoints
4. Run database migrations (if needed)
5. Validate calculations with production data

### Phase 2: Frontend
1. Deploy detailed analysis page
2. Deploy all component modules
3. Deploy API client methods
4. Verify all components render correctly

### Phase 3: Monitoring & Validation
1. Monitor analysis page usage
2. Monitor calculation times
3. Verify data accuracy with manual checks
4. Validate multi-tenant isolation
5. Check performance under load

### Phase 4: Training & Documentation
1. Staff training on detailed analysis
2. Documentation release
3. Internal wiki updates
4. Support team briefing

### Rollback Plan
- Maintain analysis data availability
- Keep API versions running during transition
- Database rollback scripts prepared
- Feature flag for page visibility

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Page load time | <500ms | Quick initial render |
| Tab switch time | <300ms | Smooth navigation |
| Large table load | <1s | Acceptable for data-heavy operations |
| Chart render | <500ms | Visual feedback |
| API endpoint response | <500ms | Fast data retrieval |

### Optimization Strategies
- Implement pagination for large tables
- Lazy load charts and detail sections
- Use database indexes for aggregations
- Implement virtual scrolling for tables
- Memoize calculation results
- Cache API responses appropriately

---

## Monitoring & Alerting

### Metrics to Track
- Analysis page view frequency
- Calculation execution times
- API endpoint response times
- Error rates for endpoints
- User engagement with different tabs

### Alerts to Configure
- Calculation exceeds 1s
- API endpoint response > 500ms
- Data quality issues
- Missing required data
- Zero-division handling

### Dashboards to Create
- Detailed analysis performance monitoring
- User engagement metrics
- Calculation time trends

---

## Documentation Requirements

### User Documentation
1. **Ratio Definitions Guide** - Define each ratio, interpretation, and benchmarks
2. **Working Capital Guide** - CCC, DIO, DSO, DPO explanation
3. **Aging Analysis Guide** - Receivables and payables aging interpretation
4. **Profitability Analysis Guide** - Department and product analysis
5. **Variance Analysis Guide** - Budget vs actual interpretation
6. **Troubleshooting Guide** - Common issues and solutions

### Technical Documentation
- Architecture overview
- API endpoint specifications
- Data transformation logic
- Performance optimization techniques

---

## Future Enhancements

1. **Predictive Analysis** - ML-based forecasting
2. **Anomaly Detection** - Automatic outlier identification
3. **Custom Metrics** - User-defined KPI combinations
4. **Budget Integration** - Full budget module integration
5. **Scenario Analysis** - What-if analysis capability
6. **Drill-down Navigation** - Navigate from summary to detail
7. **Report Generation** - Automated analysis report creation
8. **Benchmark Library** - Industry benchmark comparison

---

## Success Criteria

- ✅ All tabs load and display correct data
- ✅ Calculations verified as accurate
- ✅ Performance within targets
- ✅ No data quality issues
- ✅ Multi-tenant isolation verified
- ✅ Users can interpret and act on analysis
- ✅ Positive staff feedback
