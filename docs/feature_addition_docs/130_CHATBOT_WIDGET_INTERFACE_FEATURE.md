# Feature 130: Chatbot Widget Interface

**Executive Summary:** Chatbot Widget Interface providing customer-facing AI-powered chat support with intelligent responses, human escalation, and conversation history management.

## Current State Analysis

### EXISTING
- Customer management system (CRM)
- Notification system (basic messaging)
- User accounts with roles

### MISSING (Entirely or partially)
- Chatbot widget component
- Conversation history model
- Chat message storage
- NLP-based intent recognition
- Chatbot response generation
- Human escalation mechanism
- Typing indicators
- Message persistence
- Conversation context tracking
- Quick reply buttons
- Escalation to support
- Chat transcript storage

---

## Frontend Features

### Chatbot Widget (visible on store/dashboard pages)

#### Floating Chat Button
- **Position:** Bottom-right corner (customizable)
- **Icon:** Chat bubble icon
- **Badge:** Unread message count (if applicable)
- **Hover effect:** Shows "Chat with us" label
- **Animated pulse:** (if new message)
- **Click to expand:** Chat window

#### Chat Window (when expanded)

**Header:**
- Chatbot name (e.g., "LankaCommerce Support Bot")
- Status indicator (online/offline)
- Minimize button (collapse window)
- Close button (hide window)

**Message Area:**
- Conversation history display
- Messages scroll area
- Scrollbar with position indicator
- Message bubbles:
  - Bot messages (left-aligned, bot color scheme)
  - User messages (right-aligned, user color scheme)
  - Timestamp on each message (optional, on hover)
  - Message status indicator (sent, delivered, read - for user messages)
- Typing indicator (bot is typing):
  - Animated dots
  - "Bot is typing..." text

**Quick Reply Buttons:**
- Context-aware quick replies
- Examples:
  - "Order tracking"
  - "Product information"
  - "Billing questions"
  - "Technical support"
  - "Speak to agent"
- Button styling (pill-shaped, clickable)
- Max 4-5 quick reply buttons at a time

**Message Input Area:**
- Text input field (placeholder: "Type your message...")
- Send button (arrow icon)
- Attachment button (if applicable - document/image upload)
- Emoji picker button (optional)
- Character count (if max length enforced)

**Escalation Option:**
- "Connect to human agent" button (visible in chat or quick reply)
- Alternative: Escalate button in header

**Footer:**
- "Powered by LankaCommerce" text (optional)
- Timestamp (e.g., "Chat started at 10:30 AM")
- Privacy policy link

#### Chat Window Customization (Admin)
- Widget color scheme (primary color, chat colors)
- Widget position (bottom-right, bottom-left, top-right, top-left)
- Widget size (height, width)
- Welcome message text
- Placeholder text in input
- Greeting message before first interaction
- Off-hours message

#### Pre-chat Form (optional, triggered on first interaction)
- Customer name field (pre-fill if logged in)
- Email field (pre-fill if logged in)
- Inquiry category selector (dropdown)
- Subject/brief description (optional)
- Start chat button
- Close form button

#### Offline Message (when bot is offline)
- Message: "Chat is currently unavailable"
- Reason/Expected return time
- Leave email option (for follow-up)
- Contact support alternative

---

## Backend API Requirements

### Conversation Endpoints
**POST /api/v1/chat/conversations/**
- Start new conversation
- Request body: `{ customer_id (optional), name, email (optional) }`
- Response: `{ conversation_id, status }`

**GET /api/v1/chat/conversations/{id}/**
- Get conversation history
- Response: `[{ id, sender_type (bot/user/agent), message, timestamp, status }]`

**PATCH /api/v1/chat/conversations/{id}/**
- Update conversation status
- Request body: `{ status (open/resolved/escalated), metadata }`
- Response: updated conversation

### Message Endpoints
**POST /api/v1/chat/messages/**
- Send message
- Request body: `{ conversation_id, message_text, sender_type }`
- Response: `{ message_id, timestamp, bot_response (auto-generated) }`

**GET /api/v1/chat/messages/{id}/**
- Get message details
- Response: message with metadata

### Support Endpoints
**POST /api/v1/chat/escalate/**
- Escalate to human agent
- Request body: `{ conversation_id, reason }`
- Response: `{ success, agent_assigned }`

**GET /api/v1/chat/suggested-replies/**
- Get AI-suggested replies
- Query params: `conversation_id`
- Response: `[suggested replies]`

### Feedback Endpoints
**POST /api/v1/chat/feedback/**
- Submit conversation feedback
- Request body: `{ conversation_id, rating, comment }`
- Response: `{ success }`

---

## Database Requirements

### Conversation Model
Fields:
- `id` (UUID, Primary Key)
- `customer_id` (FK to Customer)
- `start_time` (DateTime)
- `end_time` (DateTime, nullable)
- `status` (Enum: open, resolved, escalated, closed)
- `topic` (String, nullable - if categorized)
- `assigned_agent_id` (FK to User, nullable - if escalated)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Indexes:
- `(customer_id, created_at DESC)`
- `(status, created_at DESC)`
- `(assigned_agent_id, created_at DESC)`

### ChatMessage Model
Fields:
- `id` (UUID, Primary Key)
- `conversation_id` (FK to Conversation)
- `sender_type` (Enum: bot, user, agent)
- `message_text` (Text)
- `message_type` (Enum: text, image, attachment)
- `timestamp` (DateTime)
- `status` (Enum: sent, delivered, read)
- `metadata` (JSON - storing intent, confidence, etc.)
- `created_at` (DateTime)

Indexes:
- `(conversation_id, timestamp)`
- `(sender_type)`

### QuickReplyButton Model
Fields:
- `id` (UUID, Primary Key)
- `text` (String)
- `value` (String)
- `context` (String - when to show)

### ConversationFeedback Model
Fields:
- `id` (UUID, Primary Key)
- `conversation_id` (FK to Conversation)
- `rating` (Integer, 1-5)
- `comment` (Text, nullable)
- `created_at` (DateTime)

Indexes:
- `(conversation_id)`
- `(rating)`
- `(created_at DESC)`

---

## Current Implementation Status

- ❌ Chatbot widget NOT implemented
- ❌ Conversation model NOT implemented
- ❌ Chat message storage NOT implemented
- ❌ NLP processing NOT configured
- ❌ Escalation workflow NOT implemented
- ❌ Admin console NOT implemented

---

## Validation & Edge Cases

### State Management
- Conversation state must be tracked (open, escalated, closed)
- Messages must be stored with sender type
- Status transitions must be validated (open → escalated → resolved)

### Message Handling
- Messages must be stored with sender type
- Escalation must notify available agents
- Offline messages must not be lost

### User Experience
- Quick replies must be context-aware
- Typing indicator must be real-time (<100ms latency)
- Chat history must persist across sessions
- Widget must not interfere with page functionality

### Performance
- Message send/receive must complete in <500ms
- Widget load must not block page rendering
- Conversation history query must be <1s (1000 messages)

### Security
- Only authenticated users can access their own conversations
- Agent authentication for taking conversations
- Sensitive data in messages must be handled securely
- CSRF protection on message endpoints

---

## Testing Checklist

- [ ] Chat widget opens and closes
- [ ] Messages send and receive
- [ ] Typing indicator shows
- [ ] Quick replies work
- [ ] Escalation works
- [ ] Offline message works
- [ ] Chat history persists
- [ ] Responsive on mobile
- [ ] Performance acceptable (real-time)
- [ ] Accessibility features work (ARIA labels, keyboard navigation)
- [ ] Message status updates correctly
- [ ] Multiple conversations per user works
- [ ] Widget doesn't interfere with page interactions
- [ ] Messages render with correct styling
- [ ] Timestamps display correctly
- [ ] Pre-chat form validation works
- [ ] Escalation notification sent to agents

---

## Implementation Checklist

- [ ] Create Conversation model
- [ ] Create ChatMessage model
- [ ] Create ConversationFeedback model
- [ ] Create QuickReplyButton model
- [ ] Create database migrations
- [ ] Set up WebSocket/real-time messaging
- [ ] Implement NLP intent recognition (basic or third-party)
- [ ] Create escalation workflow
- [ ] Implement API endpoints
- [ ] Build chatbot widget component (React/Vue/etc.)
- [ ] Implement message persistence
- [ ] Create typing indicator mechanism
- [ ] Implement conversation context tracking
- [ ] Set up message queue (for reliability)
- [ ] Create admin configuration UI
- [ ] Add comprehensive error handling

---

## Deployment Strategy

1. **Pre-deployment:**
   - Deploy chat models to database
   - Deploy NLP/intent recognition service
   - Verify WebSocket connectivity

2. **Deployment:**
   - Deploy API endpoints
   - Deploy frontend widget
   - Configure NLP/intent recognition parameters

3. **Post-deployment testing:**
   - Start chat conversation
   - Send messages and verify delivery
   - Test escalation workflow
   - Check conversation history persistence
   - Verify real-time updates

4. **Staff training:**
   - Using chat support interface
   - Escalation process
   - Handling conversations

5. **Rollback procedure:**
   - Archive conversation history
   - Revert API endpoints
   - Disable widget in frontend

---

## Performance Targets

- **Message send/receive:** <500ms
- **Typing indicator update:** <100ms
- **Chat widget load:** <200ms
- **Conversation history query:** <1s (1000 messages)
- **Widget initialization:** <300ms
- **Message rendering:** <50ms per message

---

## Monitoring & Alerting

### Metrics to Track
- Active conversations count (real-time)
- Message throughput (messages/second)
- Escalation requests count
- Average escalation time
- Chat satisfaction scores
- Bot response quality (confidence scores)
- Widget load times
- API response times
- WebSocket connection failures

### Alerts
- Alert on extended wait times (>5 min)
- Alert on high escalation rate (>50%)
- Alert on WebSocket disconnections
- Alert on message delivery failures
- Alert on low bot confidence (<30%)

---

## Documentation Requirements

- Chatbot user guide (customer-facing)
- Escalation procedure guide (staff)
- Admin chatbot configuration guide
- NLP training guide (for ML team)
- Customer support team guide
- API documentation
- Architecture documentation

---

## Future Enhancements

- Multi-language chatbot support
- Sentiment analysis on conversations
- Proactive chat invitations (based on page visit duration)
- Chat routing to specialized agents (by topic)
- Chatbot analytics dashboard
- A/B testing for responses and UI
- Rich message types (cards, buttons, forms)
- Screen capture integration for troubleshooting
- Voice-based chat support
- Chat transcription and summarization
