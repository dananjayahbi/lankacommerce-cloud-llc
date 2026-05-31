# Feature 131: Chatbot Admin Console

**Executive Summary:** Chatbot Admin Console providing comprehensive chat management, conversation monitoring, training data management, and support team tools for managing customer conversations and improving chatbot responses.

## Current State Analysis

### EXISTING
- Customer management (CRM)
- Support infrastructure (basic)
- User accounts with roles
- Notification system

### MISSING (Entirely or partially)
- Chat admin console/management interface
- Conversation history management
- Conversation filtering/search
- Support agent assignment
- Internal notes on conversations
- Chatbot training data UI
- Fallback response management
- Conversation analytics
- Performance monitoring
- Knowledge base management

---

## Frontend Features

### Support Dashboard - Chatbot Console Tab

#### Chat Overview

**Key Metrics:**
- Active conversations count
- Total conversations (today)
- Avg. response time
- Customer satisfaction score (avg)
- Escalation rate (%)
- Resolution rate (%)

**Conversations Queue:**
- Waiting/unassigned conversations count
- Avg wait time
- Queue visualization (chart)

#### Conversations List

**Table Structure:**
- Columns: Customer name | Issue | Status | Duration | Assigned agent | Rating | Start time | Actions

**Status Types:**
- Open (unassigned)
- In progress (assigned)
- Escalated
- Resolved
- Closed

**Filter Options:**
- Filter by status (open, escalated, resolved, etc.)
- Filter by date range (date picker)
- Filter by customer (dropdown/searchable)
- Filter by assigned agent (dropdown)
- Filter by satisfaction rating (slider)
- Filter by category (if categorized)

**Search & Sort:**
- Search box (search by customer name, email, issue)
- Sort options:
  - By start time (newest/oldest)
  - By duration (longest/shortest)
  - By rating (highest/lowest)
  - By status

**Row Actions (per conversation):**
- View conversation button
- Assign to me button
- Assign to agent (dropdown)
- Take over conversation button (if assigned to other)
- Mark resolved button
- Close conversation button

**Bulk Actions:**
- Select multiple conversations checkbox
- Bulk assign button
- Bulk mark as resolved button
- Bulk close button
- Bulk export button

**Pagination:**
- Results per page selector (10, 25, 50, 100)
- Previous/Next buttons
- Page indicator

#### Conversation Detail View

**Header Section:**
- Customer name, email, customer ID
- Conversation start time
- Status badge (color-coded)
- Assigned agent name
- Satisfaction rating (if provided)
- Last updated timestamp

**Message Thread:**
- Full conversation history (scrollable)
- Messages with timestamps
- Sender indicators (Customer, Bot, Agent name)
- Message types (text, image, attachment)
- Quick reply history (show which quick replies were clicked)
- Message reactions/feedback

**Conversation Info Sidebar:**

**Customer Information:**
- Name, email, phone
- Customer tier (if applicable)
- Account age
- Previous conversations count
- Previous issues list

**Conversation Metadata:**
- Start time
- Duration
- Assigned agent
- Category/Topic
- Priority level
- Tags

**Internal Notes Section:**
- Add note field (textarea)
- Existing notes list (with timestamps and author)
- Delete note button (if author)
- Edit note button (if author)
- Notes sorted by timestamp (newest first)

**Quick Actions:**
- Assign to agent dropdown
- Change status dropdown
- Add tag button
- Create follow-up task button
- Send survey button
- Transfer to another agent button

**Message Input Area (for agents):**
- Text input for agent response
- Send button
- Canned responses dropdown (pre-written responses)
- Attachment option (image/file upload)
- Customer close conversation option
- Typing indicator (show when agent is typing)

**Bottom Actions:**
- Mark as resolved button
- Escalate button (if applicable)
- Request satisfaction survey button
- Assign to another agent button
- Close conversation button
- Export transcript button

#### Chatbot Training Console

##### Intent Management

**Intents List:**
- Table: Intent name | Examples count | Responses | Status | Actions
- Create new intent button
- Edit intent button (per row)
- Delete intent button (per row)
- Search intents box
- Filter by status (active/inactive)

**Intent Editor (Modal or Page):**
- Intent name field (required)
- Intent description (textarea)
- Status selector (active/inactive)

**Training Examples Section:**
- Add example button
- Example input field (text)
- Remove example button (per row)
- Bulk add examples button (paste multiple examples)
- Examples list

**Expected Responses Section:**
- Add response button
- Response field (template with variables)
- Priority/order field (determines which response to use)
- Remove response button (per row)
- Confidence threshold field

**Save & Test:**
- Save intent button
- Cancel button
- Test intent button (try matching examples against intent)

##### Fallback Response Management

**Fallback Responses:**
- Current fallback responses list (table)
- Edit fallback response button (per row)
- Delete button (per row)

**Fallback Response Editor:**
- Response text field (textarea - large)
- Multiple fallback options (for variety)
- Add another fallback button
- Save button

##### Knowledge Base Import

- Upload CSV/JSON file button
- File type selector (CSV, JSON)
- Preview data (table showing first few rows)
- Map columns to fields (dropdown for each column)
- Import button
- Import history (table showing previous imports)
- Undo last import button

#### Conversation Analytics

**Charts:**
- Conversations per day (line chart, last 30 days)
- Satisfaction ratings distribution (pie chart)
- Response time distribution (histogram)
- Resolution rate trend (line chart)
- Escalation rate trend (area chart)
- Most common issues (bar chart)
- Bot vs agent responses (pie chart)

**Metrics Summary:**
- Total conversations (this month)
- Avg. response time (seconds)
- Avg. resolution time (minutes)
- Customer satisfaction (score 0-5)
- Escalation rate (%)
- Resolution rate (%)
- First response time (minutes)
- Chat completion rate (%)

**Peak Hours Analysis:**
- Peak hours table (hour and conversation count)
- Peak day of week

**Top Agents:**
- Agents table (agent name, resolved conversations, avg rating, response time)

**Period Selector:**
- Last 7 days
- Last 30 days
- Last 90 days
- Last year
- Custom date range

**Export Analytics:**
- Export as PDF button
- Export as CSV button
- Email report option

**Drill-down:**
- Click on data point (e.g., day on chart) to see details

#### Escalation Management

##### Escalation Rules Configuration

- Trigger conditions (configurable):
  - "Customer requests human"
  - "Bot confidence < threshold"
  - "Conversation duration > time limit"
  - "Customer sentiment negative"
- Target agent/queue selector
- Max wait time before escalation
- Notification settings (email, in-app, SMS)
- Priority level for escalated conversations
- Save rules button
- Add rule button
- Delete rule button

##### Escalation History

- Recent escalations table
- Columns: Conversation ID | Customer | Reason | Time to escalation | Resolution status | Assigned agent
- View conversation button (per row)

#### Chatbot Health Monitoring

**Bot Performance:**
- Average confidence score (%)
- Unmatched intents count
- Most common unmatched messages (table - showing messages bot couldn't understand)
- Response success rate (%)
- Error logs (if any - table with errors)

**Training Recommendations:**
- Suggested intents to add (list with rationale)
- Suggested responses to improve (list)
- Low-confidence interactions (table showing problematic patterns)
- Create training from recommendation button (per recommendation)

**System Health:**
- NLP model status (active/inactive)
- Last model training date
- Model accuracy score
- API response times (graph)
- Database health status

---

## Backend API Requirements

### Conversation Management

**GET /api/v1/admin/conversations/**
- Get all conversations
- Query params: `status`, `date_range`, `customer_id`, `agent_id`, `limit`, `offset`, `search`
- Response: `[{ id, customer_id, status, start_time, assigned_agent, satisfaction_rating, duration }]`

**GET /api/v1/admin/conversations/{id}/**
- Get conversation details with full message history
- Response: `{ id, customer_id, messages: [...], status, assigned_agent, internal_notes: [...], metadata }`

**PATCH /api/v1/admin/conversations/{id}/**
- Update conversation
- Request body: `{ status, assigned_agent_id, tags, priority_level }`
- Response: updated conversation

### Internal Notes

**POST /api/v1/admin/conversations/{id}/notes/**
- Add internal note
- Request body: `{ note_text }`
- Response: `{ note_id, timestamp, author }`

**DELETE /api/v1/admin/conversations/{id}/notes/{note_id}/**
- Delete note
- Response: `{ success }`

**PATCH /api/v1/admin/conversations/{id}/notes/{note_id}/**
- Update note
- Request body: `{ note_text }`
- Response: updated note

### Intent Management

**GET /api/v1/admin/intents/**
- Get all intents
- Query params: `status`, `limit`, `offset`
- Response: `[{ id, name, examples_count, responses_count, status }]`

**POST /api/v1/admin/intents/**
- Create intent
- Request body: `{ name, description, examples, responses, status }`
- Response: created intent

**PATCH /api/v1/admin/intents/{id}/**
- Update intent
- Request body: `{ name, description, examples, responses, status }`
- Response: updated intent

**DELETE /api/v1/admin/intents/{id}/**
- Delete intent
- Response: `{ success }`

**POST /api/v1/admin/intents/test/**
- Test intent matching
- Request body: `{ intent_id, test_message }`
- Response: `{ matched, confidence_score, matched_examples }`

### Analytics

**GET /api/v1/admin/analytics/chat/**
- Get chat analytics
- Query params: `date_range`, `metrics` (comma-separated list)
- Response: `{ metrics: {...}, trends: [...], top_agents: [...], peak_hours: [...] }`

**GET /api/v1/admin/analytics/export/**
- Export analytics
- Query params: `date_range`, `format` (pdf, csv)
- Response: file download

### Escalation Rules

**GET /api/v1/admin/escalation-rules/**
- Get escalation rules
- Response: `[{ id, trigger_condition, target_queue, max_wait_seconds }]`

**POST /api/v1/admin/escalation-rules/**
- Create escalation rule
- Request body: `{ trigger_condition, target_agent_id, max_wait_seconds, notification_settings }`
- Response: created rule

**PATCH /api/v1/admin/escalation-rules/{id}/**
- Update escalation rule
- Request body: `{ trigger_condition, target_agent_id, max_wait_seconds, notification_settings }`
- Response: updated rule

**DELETE /api/v1/admin/escalation-rules/{id}/**
- Delete rule
- Response: `{ success }`

**GET /api/v1/admin/escalations/**
- Get escalation history
- Query params: `limit`, `offset`, `date_range`
- Response: `[{ id, conversation_id, reason, time_to_escalation, assigned_agent }]`

### Fallback Responses

**GET /api/v1/admin/fallback-responses/**
- Get fallback responses
- Response: `[{ id, response_text, usage_count }]`

**PATCH /api/v1/admin/fallback-responses/{id}/**
- Update fallback response
- Request body: `{ response_text }`
- Response: updated response

**POST /api/v1/admin/fallback-responses/**
- Create fallback response
- Request body: `{ response_text }`
- Response: created response

**DELETE /api/v1/admin/fallback-responses/{id}/**
- Delete fallback response
- Response: `{ success }`

### Chatbot Health

**GET /api/v1/admin/chatbot-health/**
- Get chatbot health metrics
- Response: `{ confidence_score, unmatched_count, success_rate, error_count, recommendations: [...] }`

**GET /api/v1/admin/unmatched-intents/**
- Get unmatched intents (messages bot couldn't understand)
- Query params: `limit`, `offset`
- Response: `[{ message_text, count, examples }]`

**POST /api/v1/admin/training-from-unmatched/**
- Create training data from unmatched intent
- Request body: `{ unmatched_message, intended_response, intent_id }`
- Response: `{ success, training_created }`

---

## Database Requirements

### Intent Model
Fields:
- `id` (UUID, Primary Key)
- `name` (String, unique)
- `description` (Text, nullable)
- `examples` (JSON Array - strings)
- `responses` (JSON Array - response templates)
- `confidence_threshold` (Float, 0-1)
- `status` (Enum: active, inactive)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Indexes:
- `(status, created_at DESC)`
- `(name)`

### IntentTrainingExample Model
Fields:
- `id` (UUID, Primary Key)
- `intent_id` (FK to Intent)
- `example_text` (Text)
- `created_at` (DateTime)

Indexes:
- `(intent_id)`

### IntentResponse Model
Fields:
- `id` (UUID, Primary Key)
- `intent_id` (FK to Intent)
- `response_text` (Text)
- `priority_order` (Integer)
- `variables` (JSON - list of variable names)
- `created_at` (DateTime)

Indexes:
- `(intent_id, priority_order)`

### ConversationInternalNote Model
Fields:
- `id` (UUID, Primary Key)
- `conversation_id` (FK to Conversation)
- `author_id` (FK to User)
- `note_text` (Text)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Indexes:
- `(conversation_id, created_at DESC)`
- `(author_id)`

### ConversationAnalytics Model (Denormalized)
Fields:
- `id` (UUID, Primary Key)
- `date` (Date)
- `total_conversations` (Integer)
- `avg_response_time` (Float - in seconds)
- `satisfaction_score` (Float - 0-5)
- `resolution_rate` (Float - percentage)
- `escalation_rate` (Float - percentage)
- `created_at` (DateTime)

Indexes:
- `(date DESC)`

### EscalationRule Model
Fields:
- `id` (UUID, Primary Key)
- `trigger_condition` (String - e.g., "confidence < 0.5")
- `target_agent_id` (FK to User, nullable)
- `target_queue` (String, nullable)
- `max_wait_seconds` (Integer, nullable)
- `notification_enabled` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### FallbackResponse Model
Fields:
- `id` (UUID, Primary Key)
- `response_text` (Text)
- `usage_count` (Integer, default 0)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### UnmatchedIntent Model
Fields:
- `id` (UUID, Primary Key)
- `message_text` (Text)
- `conversation_id` (FK to Conversation, nullable)
- `count` (Integer - how many times this message appeared)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Indexes:
- `(count DESC)`
- `(created_at DESC)`

### ChatbotHealthMetric Model
Fields:
- `id` (UUID, Primary Key)
- `metric_name` (String - e.g., "avg_confidence")
- `value` (Float)
- `timestamp` (DateTime)

Indexes:
- `(metric_name, timestamp DESC)`

---

## Current Implementation Status

- ❌ Admin console NOT implemented
- ❌ Conversation history viewing NOT implemented
- ❌ Intent management NOT implemented
- ❌ Analytics NOT implemented
- ❌ Internal notes NOT implemented
- ❌ Escalation rules NOT implemented
- ❌ Dashboard/metrics NOT implemented

---

## Validation & Edge Cases

### Access Control
- Conversations must be accessible only to assigned agents or admins
- Agents can only view conversations assigned to them (unless admin)
- Admins can view all conversations

### Data Privacy
- Internal notes must not be visible to customers
- Sensitive customer data must be masked in some views
- Conversation history must be archived after retention period

### Training Data
- Training data must be validated before import
- Duplicate intents must not be allowed
- Training examples must be non-empty

### Intent Matching
- Intent matching must have confidence scoring
- Fallback responses must be used when confidence is low
- Unmatched intents must be logged for training

### Escalation
- Escalation must have priority queue
- Escalation must notify available agents
- Max wait time must be enforced

### Analytics
- Analytics must handle high conversation volume (>10k per day)
- Data must be aggregated for performance
- Time zone handling must be consistent

---

## Testing Checklist

- [ ] View all conversations works
- [ ] Filter conversations by status works
- [ ] Filter conversations by customer works
- [ ] Filter conversations by date range works
- [ ] Search conversations works
- [ ] View conversation details works
- [ ] Add internal note works
- [ ] Edit internal note works
- [ ] Delete internal note works
- [ ] Create new intent works
- [ ] Edit intent works
- [ ] Test intent matching works
- [ ] View analytics works
- [ ] Export analytics works
- [ ] Create escalation rule works
- [ ] Edit escalation rule works
- [ ] View escalation history works
- [ ] Assign conversation to agent works
- [ ] Transfer conversation to another agent works
- [ ] Mark conversation as resolved works
- [ ] Close conversation works
- [ ] Bulk operations work
- [ ] Performance acceptable (large dataset)
- [ ] Pagination works
- [ ] Responsive design works
- [ ] Access control works (agents can't see other conversations)

---

## Implementation Checklist

- [ ] Create Intent model
- [ ] Create IntentTrainingExample model
- [ ] Create IntentResponse model
- [ ] Create ConversationInternalNote model
- [ ] Create ConversationAnalytics model
- [ ] Create EscalationRule model
- [ ] Create FallbackResponse model
- [ ] Create UnmatchedIntent model
- [ ] Create ChatbotHealthMetric model
- [ ] Create database migrations
- [ ] Build conversations list component
- [ ] Build conversation detail view component
- [ ] Build intent editor component
- [ ] Build analytics dashboard component
- [ ] Build escalation rules configuration UI
- [ ] Implement analytics calculation service
- [ ] Create all API endpoints
- [ ] Implement role-based access control
- [ ] Add comprehensive error handling
- [ ] Implement pagination and filtering
- [ ] Create search functionality
- [ ] Add bulk action handlers

---

## Deployment Strategy

1. **Pre-deployment:**
   - Back up existing conversation data (if any)
   - Prepare analytics calculation scripts
   - Test all new endpoints

2. **Deployment:**
   - Deploy models to database
   - Run migrations
   - Deploy API endpoints
   - Deploy admin console UI
   - Enable feature flag (if using)

3. **Post-deployment testing:**
   - Create sample conversations
   - Test all filters and searches
   - Test analytics calculation
   - Test escalation rules
   - Verify access control

4. **Staff training:**
   - Admin console usage
   - Intent training best practices
   - Escalation configuration
   - Analytics interpretation

5. **Rollback procedure:**
   - Archive conversation data
   - Disable feature flag
   - Revert API endpoints

---

## Performance Targets

- Conversations list load: <500ms (100 conversations)
- Conversation detail load: <1s
- Analytics query: <2s
- Intent matching: <100ms per message
- Search results: <500ms
- Bulk operations: <5s (100 conversations)

---

## Monitoring & Alerting

### Metrics to Track
- API response times
- Query performance
- Conversation volume
- Escalation rate
- Intent match accuracy
- Admin console usage patterns

### Alerts
- Alert on high API response time (>1s)
- Alert on query failures
- Alert on high escalation rate (>50%)
- Alert on low intent match accuracy (<70%)
- Alert on unmatched intent spikes

---

## Documentation Requirements

- Admin console user guide
- Intent training guide
- Analytics interpretation guide
- Escalation configuration guide
- API documentation
- Architecture documentation

---

## Future Enhancements

- Machine learning-based intent matching improvement
- Sentiment analysis on conversations
- Automated response suggestions based on conversation
- Advanced analytics (cohort analysis, funnel analysis)
- Conversation routing optimization
- Agent performance analytics
- Customer lifetime value analysis
- Predictive escalation (escalate before customer requests)
- Automated quality scoring of agent responses
