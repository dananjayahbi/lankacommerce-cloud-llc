# Smart Search Bar & Auto-complete Feature Specification

## Executive Summary

The Smart Search Bar & Auto-complete feature provides intelligent real-time search suggestions, fuzzy matching, and quick access to frequently searched items enabling users to find products, orders, and customers rapidly. This feature integrates seamlessly across the LankaCommerce system, reducing search time and improving user productivity.

---

## Current State Analysis

### EXISTING Infrastructure
- Product, order, customer, and invoice models
- Basic data in database (PostgreSQL)
- User interface infrastructure (React/Next.js frontend)
- User authentication and session management
- Header component structure

### MISSING Infrastructure (Entirely or Partially)
- Full-text search engine (Elasticsearch, Solr, or PostgreSQL FTS)
- Auto-complete indexing and ranking system
- Fuzzy search algorithm implementation
- Search history model and storage
- Search analytics and tracking
- Autocomplete suggestions API endpoint
- Real-time search indexing system
- Search ranking and relevance scoring
- Typo tolerance and correction
- Synonym and abbreviation handling

---

## Frontend Features

### Search Bar (Header Component - Visible Across All Pages)

#### Search Input Field
- **Search Icon**: Positioned on the left side of input field
- **Placeholder Text**: "Search products, orders, customers..."
- **Input Field**: Full available width or max-width constraint
- **Clear Button**: X icon appears when text is entered
- **Search Button**: Magnifying glass icon or press Enter to execute search
- **Search Scope Selector** (optional, near input):
  - All (default)
  - Products only
  - Orders only
  - Customers only
  - Invoices only

#### Auto-complete Dropdown
- **Trigger Condition**: Appears when user types 2+ characters
- **Debounced Requests**: Updates as user types (150-300ms debounce to prevent excessive requests)
- **Dismissal**: 
  - Press Escape key
  - Click outside dropdown
  - Tab to next element
  - Press Enter to select

**Dropdown Sections** (organized hierarchy):

1. **Recent Searches Section** (if available):
   - Display max 5 recent search terms
   - Show search type icon (product, order, customer, invoice)
   - Recent search item with result preview
   - Click action: repeat search
   - X icon: remove from history
   - Timestamp display

2. **Quick Suggestions Section**:
   
   - **Product Suggestions** (max 3 displayed):
     - Product image thumbnail (80x80px)
     - Product name with query terms highlighted
     - SKU display
     - Price in primary currency
     - Stock status badge (in stock, low stock, out of stock)
     - Rating display (if applicable)
     - Click action: navigate to product detail page
   
   - **Order Suggestions** (max 2 displayed):
     - Order number with highlighting
     - Customer name
     - Order date (formatted)
     - Order status badge (colored: pending, processing, completed, cancelled)
     - Order total
     - Click action: navigate to order detail page
   
   - **Customer Suggestions** (max 2 displayed):
     - Customer name with highlighting
     - Email or primary phone
     - Customer tier badge (if applicable)
     - Last order date
     - Total orders count
     - Click action: navigate to customer detail page
   
   - **See All Results Link** (at dropdown bottom):
     - "See X results for '[query]'" text
     - Click action: navigate to full search results page

#### Auto-complete Algorithm Features

- **Real-time Updates**: Debounced to avoid excessive backend requests
- **Fuzzy Matching** (typo tolerance):
  - "produc" matches "product"
  - "sku123" matches "SKU-123"
  - "iphone1" matches "iPhone 12"
  - Levenshtein distance or similar algorithm
- **Case-insensitive Matching**: "PRODUCT" matches "product"
- **Special Character Handling**: Hyphens, spaces, slashes in SKU/order numbers
- **Ranking/Relevance Scoring**:
  - Exact matches displayed first
  - Fuzzy matches ranked by similarity score
  - Popular searches ranked higher
  - Recent searches ranked higher for same user
- **Smart Grouping**: Results grouped by entity type with clear separators

#### Keyboard Navigation
- **Up/Down Arrow Keys**: Navigate between suggestions
- **Enter Key**: Select highlighted suggestion or execute search
- **Escape Key**: Close dropdown
- **Tab Key**: Move to next interactive element (closes dropdown)
- **Left/Right Arrow**: Edit text in search field

#### Search Button & Enter Key Action
- Click search button or press Enter
- Navigates to `/search?q={encoded_query}&scope={scope}`
- Records search in history (if not already recent)
- Clears search dropdown
- Focuses on search results page

#### Advanced Search Link
- "Advanced search" link below auto-complete dropdown (or in results page)
- Keyboard shortcut: Ctrl+Shift+F (customizable)
- Opens advanced search modal or navigates to `/search/advanced`
- Allows complex query construction

#### Mobile Optimization
- **Responsive Design**:
  - Search bar takes full width on mobile
  - Auto-complete dropdown full width
  - Touch-friendly suggestion buttons (min 44x44px)
  - Dismissible by swiping down
- **Mobile Keyboard Handling**:
  - Android keyboard suggestions suppressed
  - iOS keyboard optimized for search
  - Return key text: "Search" instead of "Go"
- **Performance**: Minimal requests on mobile networks (caching)

---

## Backend API Requirements

### GET /api/v1/search/autocomplete/

**Purpose**: Retrieve auto-complete suggestions based on partial query

**Query Parameters**:
- `q` (required): Search query string (minimum 2 characters)
- `scope` (optional): Search scope - "products", "orders", "customers", "invoices", "all" (default: "all")
- `limit` (optional): Maximum suggestions per category (default: 5)
- `user_id` (optional): For personalized recent searches

**Response** (200 OK):
```
{
  "query": "iph",
  "total_suggestions": 8,
  "recent_searches": [
    {
      "id": "search_123",
      "term": "iphone 12",
      "result_type": "products",
      "result_id": "prod_456",
      "result_name": "iPhone 12 Pro",
      "created_at": "2026-05-30T10:00:00Z",
      "search_count": 3
    }
  ],
  "suggestions": {
    "products": [
      {
        "id": "prod_789",
        "name": "iPhone 13 Pro",
        "sku": "IPHONE-13-PRO",
        "price": 999.99,
        "currency": "USD",
        "image_url": "/images/products/iphone-13-pro.jpg",
        "stock_status": "in_stock",
        "stock_quantity": 45,
        "rating": 4.8,
        "review_count": 234,
        "relevance_score": 0.95
      },
      {
        "id": "prod_790",
        "name": "iPhone 12",
        "sku": "IPHONE-12",
        "price": 799.99,
        "currency": "USD",
        "image_url": "/images/products/iphone-12.jpg",
        "stock_status": "in_stock",
        "stock_quantity": 12,
        "rating": 4.6,
        "review_count": 189,
        "relevance_score": 0.88
      }
    ],
    "orders": [
      {
        "id": "order_101",
        "order_number": "ORD-2026-001234",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "order_date": "2026-05-28T14:30:00Z",
        "order_status": "processing",
        "order_total": 1299.98,
        "currency": "USD",
        "item_count": 2,
        "relevance_score": 0.72
      }
    ],
    "customers": [
      {
        "id": "cust_456",
        "name": "iPhone Store Manager",
        "email": "manager@iphonestore.com",
        "phone": "+1-555-0123",
        "tier": "vip",
        "last_order_date": "2026-05-25T09:15:00Z",
        "total_orders": 47,
        "lifetime_value": 28000.00,
        "relevance_score": 0.65
      }
    ],
    "invoices": []
  },
  "see_all_link": {
    "url": "/search?q=iph&scope=all",
    "text": "See all results for 'iph'"
  },
  "response_time_ms": 145
}
```

**Error Responses**:
- 400 Bad Request: Query too short or invalid
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Search engine failure

---

### GET /api/v1/search/history/

**Purpose**: Retrieve user's search history

**Query Parameters**:
- `limit` (optional): Maximum history items to return (default: 20, max: 100)
- `days` (optional): History within last N days (default: 90)

**Response** (200 OK):
```
{
  "total_items": 15,
  "search_history": [
    {
      "id": "history_123",
      "term": "iphone 12",
      "result_type": "products",
      "result_id": "prod_456",
      "result_name": "iPhone 12 Pro",
      "search_count": 3,
      "last_searched": "2026-05-30T10:00:00Z",
      "created_at": "2026-05-28T14:30:00Z"
    },
    {
      "id": "history_124",
      "term": "order status",
      "result_type": "orders",
      "result_id": null,
      "result_name": null,
      "search_count": 1,
      "last_searched": "2026-05-29T16:45:00Z",
      "created_at": "2026-05-29T16:45:00Z"
    }
  ]
}
```

---

### POST /api/v1/search/history/

**Purpose**: Record a search in user's history (called internally after search execution)

**Request Body**:
```
{
  "query": "iphone 12",
  "result_type": "products",
  "result_id": "prod_456",
  "result_name": "iPhone 12 Pro",
  "result_count": 23
}
```

**Response** (201 Created):
```
{
  "success": true,
  "history_id": "history_123",
  "message": "Search recorded successfully"
}
```

---

### DELETE /api/v1/search/history/{id}/

**Purpose**: Remove a specific search from user's history

**Response** (200 OK):
```
{
  "success": true,
  "message": "Search history item deleted"
}
```

**Alternative**: DELETE /api/v1/search/history/all/ - Clear all search history
```
{
  "success": true,
  "deleted_count": 45,
  "message": "All search history cleared"
}
```

---

### POST /api/v1/search/query-suggestions/

**Purpose**: Get query suggestions (typo correction, synonyms, related searches)

**Request Body**:
```
{
  "query": "iphne 12",
  "context": "products"
}
```

**Response** (200 OK):
```
{
  "original_query": "iphne 12",
  "corrections": [
    {
      "suggested_query": "iphone 12",
      "type": "typo_correction",
      "confidence": 0.95,
      "reason": "Did you mean: iphone 12?"
    }
  ],
  "expansions": [
    {
      "suggested_query": "iphone",
      "type": "synonym",
      "confidence": 0.80
    },
    {
      "suggested_query": "iphone 12 pro",
      "type": "expansion",
      "confidence": 0.75
    }
  ],
  "related_searches": [
    {
      "query": "iphone 12 pro max",
      "popularity_rank": 1,
      "search_count": 1450
    },
    {
      "query": "iphone 12 price",
      "popularity_rank": 2,
      "search_count": 980
    }
  ]
}
```

---

## Database Requirements

### SearchHistory Model

**Table**: `search_search_history`

**Columns**:
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to User model
- `query_text`: VARCHAR(500), indexed
- `result_type`: VARCHAR(50) (products, orders, customers, invoices)
- `result_id`: UUID (nullable, foreign key)
- `result_name`: VARCHAR(500) (denormalized for display)
- `search_count`: INTEGER (how many times this user searched this exact query)
- `last_searched_at`: TIMESTAMP with timezone, indexed
- `created_at`: TIMESTAMP with timezone
- `updated_at`: TIMESTAMP with timezone

**Indexes**:
- `(user_id, last_searched_at DESC)` - For retrieving user's recent searches
- `(user_id, created_at DESC)` - For analytics
- `(query_text)` - For deduplication
- `(result_type, created_at)` - For analytics by type

**Constraints**:
- `UNIQUE(user_id, query_text, result_id)` - Prevent exact duplicates

---

### SearchQuery Model (Global Analytics)

**Table**: `search_search_query`

**Columns**:
- `id`: UUID, primary key
- `query_text`: VARCHAR(500), indexed, unique
- `result_type`: VARCHAR(50) (or NULL for cross-entity)
- `total_search_count`: BIGINT (total times searched globally)
- `popular_count`: INTEGER (trending score)
- `no_result_count`: INTEGER (times query returned 0 results)
- `avg_result_count`: FLOAT (average results returned)
- `last_searched_at`: TIMESTAMP with timezone
- `created_at`: TIMESTAMP with timezone
- `updated_at`: TIMESTAMP with timezone

**Indexes**:
- `(query_text)` - For lookup
- `(total_search_count DESC)` - For trending
- `(created_at)` - For time-series
- `(popular_count DESC)` - For popularity ranking

---

### SearchAnalytics Model (Denormalized Time-Series)

**Table**: `search_search_analytics`

**Columns**:
- `id`: UUID, primary key
- `query_text`: VARCHAR(500)
- `result_type`: VARCHAR(50)
- `result_count`: INTEGER
- `click_count`: INTEGER (users clicked on results)
- `no_result_searches_count`: INTEGER
- `avg_response_time_ms`: INTEGER
- `unique_users`: INTEGER
- `date`: DATE, indexed
- `created_at`: TIMESTAMP with timezone

**Indexes**:
- `(date DESC, query_text)` - For analytics queries
- `(result_type, date)` - For breakdown by type

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Search bar UI | ✓ Exists | Basic search input present |
| Auto-complete UI | ✗ Missing | No dropdown suggestions |
| Auto-complete API | ✗ Missing | No backend endpoint |
| Search history storage | ✗ Missing | Not tracked |
| Search history display | ✗ Missing | Not shown in UI |
| Full-text search engine | ✗ Missing | Using basic SQL LIKE (if any) |
| Fuzzy matching | ✗ Missing | Not implemented |
| Search ranking | ✗ Missing | No relevance scoring |
| Advanced search | ✗ Missing | No advanced search interface |
| Query suggestions | ✗ Missing | No typo correction |

---

## Validation & Edge Cases

### Query Validation
- **Minimum Length**: Enforce 2 character minimum before sending requests
- **Maximum Length**: Limit queries to 500 characters
- **Special Characters**: Handle hyphens, slashes, dots in SKU/order numbers properly
  - Example: "SKU-12-345" should be searchable as "SKU 12 345"
- **Leading/Trailing Spaces**: Strip automatically
- **Multiple Spaces**: Collapse to single space

### Fuzzy Matching Constraints
- **Accuracy**: Must not match too broadly (e.g., "a" should not match all products)
- **Performance**: Fuzzy matching must complete within 200ms
- **Threshold**: Set minimum similarity score (typically 0.6-0.8)
- **Special Cases**: Handle common abbreviations
  - "qty" matches "quantity"
  - "ref" matches "reference"
  - "SKU" matches "sku"

### Typo Correction
- **Dictionary**: Use domain-specific dictionary (product names, order statuses, etc.)
- **Confidence Threshold**: Only suggest corrections with >80% confidence
- **User Intent**: Don't aggressively autocorrect if original query is valid
- **Context**: Consider result type scope when suggesting corrections

### Recent Searches
- **User-Specific**: Each user has their own history
- **Deduplication**: Don't show same query multiple times (increment counter instead)
- **Privacy**: Don't display sensitive information (full customer emails, payment info)
- **Retention**: Retention policy (e.g., keep 90 days)

### Rate Limiting
- **Autocomplete Requests**: Max 10 requests per minute per user
- **History Operations**: Standard API rate limits
- **Suggestion Requests**: Max 30 per minute

### Performance Constraints
- **Autocomplete Response**: <200ms from user typing
- **Debounce Delay**: 150-300ms to balance responsiveness and load
- **Dropdown Rendering**: <100ms in browser
- **Network Latency**: Must work with 3G+ networks

---

## Testing Checklist

### Functional Tests
- [ ] Auto-complete shows suggestions with 2+ characters typed
- [ ] Auto-complete updates as user types
- [ ] Fuzzy matching works correctly (typo tolerance)
- [ ] Fuzzy matching doesn't match irrelevant results
- [ ] Recent searches display correctly
- [ ] Recent searches are user-specific
- [ ] Keyboard navigation works (Up/Down/Enter/Escape)
- [ ] Mouse selection works
- [ ] Mobile keyboard navigation works
- [ ] Special characters handled properly
- [ ] Search history records correctly
- [ ] Search history persists across sessions
- [ ] Search history can be cleared
- [ ] Search button executes search
- [ ] Enter key executes search
- [ ] Advanced search link navigates correctly
- [ ] Clear button removes text
- [ ] Search scope selector works

### Performance Tests
- [ ] Auto-complete response <200ms (90th percentile)
- [ ] Debounce prevents excessive requests
- [ ] Mobile performance acceptable
- [ ] Memory usage reasonable with large history
- [ ] Database queries optimized (indexes working)
- [ ] Frontend rendering performant

### Edge Case Tests
- [ ] Query length limits enforced
- [ ] Empty query handled
- [ ] Query with only spaces handled
- [ ] Very long product names handled
- [ ] No matching results handled
- [ ] Rate limiting works
- [ ] User with no search history
- [ ] Concurrent searches don't interfere
- [ ] Logout clears search context
- [ ] Login restores search context

### Mobile/Responsive Tests
- [ ] Mobile layout responsive (<375px width)
- [ ] Tablet layout responsive (768px width)
- [ ] Desktop layout responsive (>1024px width)
- [ ] Touch interactions work
- [ ] Keyboard interactions work on mobile
- [ ] Dropdown doesn't overflow viewport

### Accessibility Tests
- [ ] ARIA labels present
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

### Browser Compatibility Tests
- [ ] Chrome/Edge latest 2 versions
- [ ] Firefox latest 2 versions
- [ ] Safari latest 2 versions
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

---

## Implementation Checklist

### Backend Implementation
- [ ] Set up full-text search engine (PostgreSQL FTS or Elasticsearch)
- [ ] Create SearchHistory model
- [ ] Create SearchQuery model
- [ ] Create SearchAnalytics model
- [ ] Implement database migrations
- [ ] Create indexes on all models
- [ ] Implement autocomplete endpoint (`GET /api/v1/search/autocomplete/`)
- [ ] Implement search history endpoints (GET, POST, DELETE)
- [ ] Implement query suggestions endpoint (`POST /api/v1/search/query-suggestions/`)
- [ ] Implement fuzzy matching algorithm (or use search engine's native)
- [ ] Implement typo correction service
- [ ] Implement search ranking algorithm
- [ ] Set up search indexing/reindexing logic
- [ ] Configure rate limiting
- [ ] Add API authentication and authorization
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add logging for debugging

### Frontend Implementation
- [ ] Create/enhance Search Bar component
- [ ] Create Auto-complete Dropdown component
- [ ] Implement keyboard navigation logic
- [ ] Implement debouncing for autocomplete requests
- [ ] Implement fuzzy matching display logic
- [ ] Integrate with backend API
- [ ] Add mobile optimizations
- [ ] Add responsive design
- [ ] Add accessibility features
- [ ] Add error handling and loading states
- [ ] Add analytics tracking
- [ ] Test all browsers
- [ ] Test responsive design
- [ ] Optimize performance

### Testing & QA
- [ ] Unit tests for autocomplete logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows
- [ ] Performance tests
- [ ] Security tests (SQL injection, XSS)
- [ ] Browser compatibility testing
- [ ] Mobile testing
- [ ] Accessibility testing
- [ ] Manual QA testing

### Infrastructure & DevOps
- [ ] Set up full-text search infrastructure
- [ ] Configure search engine cluster
- [ ] Set up monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure backups
- [ ] Set up reindexing jobs (if needed)
- [ ] Load testing

---

## Deployment Strategy

### Pre-Deployment
1. **Prepare Full-Text Search Engine** (if using Elasticsearch):
   - Set up cluster (dev, staging, prod)
   - Configure indexes and mappings
   - Set up authentication and security

2. **Database Migrations**:
   - Create SearchHistory table
   - Create SearchQuery table
   - Create SearchAnalytics table
   - Create all required indexes

3. **Staging Environment**:
   - Deploy to staging
   - Copy production data for testing
   - Run full test suite
   - Performance test with realistic load
   - Security audit

### Deployment Steps
1. **Deploy Backend**:
   - Deploy search API endpoints
   - Deploy models and migrations
   - Deploy ranking algorithm
   - Verify all APIs working

2. **Index Existing Data**:
   - Script to index all existing products
   - Script to index all existing orders
   - Script to index all existing customers
   - Script to index all existing invoices
   - Verify index health

3. **Deploy Frontend**:
   - Deploy enhanced Search Bar component
   - Deploy Auto-complete Dropdown component
   - Verify components rendering correctly
   - Verify API integration working

4. **Canary Deployment** (for large deployments):
   - Deploy to 10% of users
   - Monitor for issues
   - Gradually increase to 100%

5. **Post-Deployment Validation**:
   - Test autocomplete functionality
   - Test search history recording
   - Test fuzzy matching
   - Monitor error rates
   - Monitor performance metrics

### Rollback Plan
1. **If Issues Detected**:
   - Disable autocomplete feature flag
   - Revert frontend to previous version
   - Revert backend API changes
   - Verify system stability

2. **Data Preservation**:
   - Archive search analytics data
   - Preserve search history data
   - Keep full-text search indexes (for future use)

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Autocomplete response time | <200ms | 90th percentile, including network |
| Debounce delay | 150-300ms | Balance responsiveness and load |
| Fuzzy matching time | <100ms | Per query |
| Ranking calculation | <50ms | Per result set |
| Typo suggestion time | <150ms | Per query |
| Frontend rendering | <100ms | Dropdown render after API response |
| Full-text search query | <500ms | Complex queries |
| Dropdown show latency | <300ms total | From user keystroke to visible |
| Search history retrieval | <100ms | Fetch user's history |

---

## Monitoring & Alerting

### Key Metrics to Monitor
- **Autocomplete Response Time**: Alert if >300ms (p95)
- **Search Engine Health**: Alert on unavailable indexes or cluster issues
- **API Error Rate**: Alert if >1% autocomplete errors
- **Database Query Performance**: Alert on slow queries
- **Cache Hit Rate**: Monitor full-text search index efficiency
- **Search Query Volume**: Track growth and patterns

### Dashboards
- Real-time autocomplete performance
- Search engine health status
- API error rates and types
- Top searches trending
- Search performance by entity type
- System resource usage

### Logging
- All search queries (for analytics)
- API response times
- Error logs with stack traces
- Authentication failures
- Rate limit violations
- Search engine index changes

---

## Documentation Requirements

### User Documentation
- **Search Usage Guide**: How to use basic search
- **Advanced Search Guide**: How to use advanced search features
- **Search Tips and Tricks**: Best practices for effective searching
- **Fuzzy Matching Explanation**: How typo tolerance works
- **Keyboard Shortcuts Guide**: All keyboard shortcuts

### Developer Documentation
- **API Reference**: Full autocomplete API documentation
- **Search Engine Configuration**: Setup and tuning
- **Ranking Algorithm**: How results are ranked
- **Fuzzy Matching Algorithm**: Implementation details
- **Performance Tuning Guide**: Optimization tips
- **Troubleshooting Guide**: Common issues and solutions

### Admin Documentation
- **Search Analytics Guide**: Understanding analytics
- **Trending Searches**: Monitoring popular searches
- **Performance Optimization**: Index tuning
- **Data Reindexing**: How to reindex data
- **Backup and Recovery**: Disaster recovery

---

## Future Enhancements

### Phase 2 Features
1. **Voice Search**: Search using voice input
2. **Image-Based Product Search**: Find products by image
3. **Query Expansion**: Automatic query expansion with synonyms
4. **Personalized Search**: Personalized results based on user history and preferences
5. **Search Filters**: More sophisticated filtering options
6. **Search Analytics Dashboard**: User-facing search analytics

### Phase 3 Features
1. **Advanced NLP Query Parsing**: Natural language understanding
2. **Semantic Search**: Search by meaning, not just keywords
3. **Predictive Search**: Predict what users are looking for
4. **ML-Based Ranking**: Machine learning for relevance ranking
5. **Collaborative Filtering**: Learn from other users' searches
6. **Context-Aware Search**: Search aware of current page/context

### Long-Term Enhancements
1. **Federated Search**: Search across multiple databases/systems
2. **Real-time Search**: Live search results as typing
3. **Search Result Caching**: Cache popular searches
4. **Search Mining**: Extract insights from search data
5. **Query Expansion Library**: Maintain synonym and related search library
6. **A/B Testing Framework**: Test search algorithm variations

---

