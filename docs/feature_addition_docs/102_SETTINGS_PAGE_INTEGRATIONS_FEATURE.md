# Settings Page - Integrations Feature Specification

## Executive Summary

Integration Settings providing configuration of external service integrations including payment gateways (PayHere, WebXPay, KOKO), shipping providers (Koombiyo, Domex), email/SMS services, and third-party APIs enabling seamless external system connectivity.

## Current State Analysis

### EXISTING:
- PayHere service integration (apps/billing/services/payhere_service.py)
- Webhook system (webhooks settings page exists)
- Email service configuration (apps/billing/services/email_service.py)
- Payment gateway handling (apps/billing/views/)
- Audit log page (for integration tracking)

### MISSING (Partially implemented or incomplete):
- Integration Settings Tab UI (comprehensive configuration UI)
- Payment Gateway Configuration UI for:
  - PayHere (merchant ID, secret key, test/live mode)
  - WebXPay (credentials, endpoints)
  - KOKO/MintPay (credentials, endpoints)
  - Bank transfer configuration UI
  - Cash on delivery settings UI
- Payment Gateway Test buttons
- Shipping Provider Configuration UI for:
  - Koombiyo (credentials, pickup locations, zones)
  - Domex (credentials, pickup locations, zones)
  - Zone-based courier assignment
  - Rate calculation configuration
- Email Service Configuration UI
  - SMTP server settings
  - Sender configuration
  - Test send
- SMS Service Configuration UI
  - Provider selection
  - Credentials
  - Message format
- WhatsApp Service Configuration UI
- API Key Management UI
- Third-Party Integrations Management
- Webhook Configuration UI (beyond current webhooks page)
- Integration Health Dashboard
- Integration Logs & Error Tracking

## Frontend Features

### Page Structure
- Page header:
  - "Integration Settings" subtitle
- Settings navigation (continues from Documents 100-101):
  - Integration Settings (active)

### Payment Gateways Section

#### Payment Methods Header
- "Add Payment Method" button

#### PayHere Configuration (Collapsible Card)
- Enable toggle
- Merchant ID field (text input, required if enabled)
- Secret Key field (password input, required if enabled)
- Currency selector (LKR)
- Test Mode toggle
- Display Order field (number input)
- Connection Test button
- Success indicator (if credentials valid)
- Configuration instructions link

#### WebXPay Configuration (Collapsible Card)
- Enable toggle
- API Key field (password input)
- Secret Key field (password input)
- Merchant Code field
- Endpoint selector (test/production)
- Test Mode toggle
- Connection Test button
- Success indicator

#### KOKO/MintPay Configuration (Collapsible Card)
- Enable toggle
- API Key field
- Secret Key field
- Merchant ID field
- API Endpoint field (URL)
- Test Mode toggle
- Connection Test button

#### Bank Transfer Configuration (Collapsible Card)
- Enable toggle
- Bank Name field
- Account Number field
- Account Holder Name field
- Bank Code field (optional)
- Branch Code field (optional)
- Instructions text area
- Display Order field

#### Cash On Delivery Configuration (Collapsible Card)
- Enable toggle
- Delivery Fee field (optional)
- Max amount allowed (optional)
- Display Order field

#### Payment Method Reordering
- Visual representation of payment method order
- Drag handles on each method

### Shipping Providers Section

#### Shipping Zones Header
- "Add Zone" button

#### Koombiyo Configuration (Collapsible Card)
- Enable toggle
- API Key field (password input)
- API Secret field (password input)
- Warehouse Code field
- Pickup Phone Number field
- Pickup Location Name field
- Connection Test button

#### Koombiyo Zone Configuration Subsection
- Zone table (District, Base Rate, Per-KM Rate, Enabled)
- Add Zone button
- Edit/Delete buttons

#### Domex Configuration (Collapsible Card)
- Similar structure to Koombiyo
- API credentials
- Pickup configuration
- Zone configuration

#### Shipping Zone Management
- Zone list (District, Courier, Rate, Status)
- Edit zone button
- Delete zone button
- Reorder zones (drag & drop)

### Email Service Section

#### Email Service Provider Configuration
- Service selector (dropdown: SMTP, SendGrid, AWS SES, etc.)

#### Configuration Fields (Based on Selected Provider)
- SMTP fields: Server, Port, Username, Password, TLS toggle
- SendGrid: API Key
- AWS SES: Access Key, Secret Key, Region

#### Email Display Settings
- Sender Name field
- Sender Email field
- Reply-to Email field
- Connection Test button
- Test Send button (send test email to current user's email)
- Success indicator

### SMS Service Section

#### SMS Service Provider Configuration
- Service selector (dropdown: Twilio, AWS SNS, local provider)

#### Configuration Fields (Based on Selected Provider)
- Twilio: Account SID, Auth Token, Phone Number
- AWS SNS: Access Key, Secret Key, Region

#### SMS Settings
- Default Sender ID field
- Test Send button (send test SMS to configured number)
- Success indicator

### WhatsApp Service Section
(If enabled)

#### WhatsApp Business Account Configuration
- Service selector (Meta WhatsApp Business API, other providers)

#### Configuration Fields
- Business Phone Number ID
- Access Token (password field)
- Webhook URL (auto-generated, read-only)
- Webhook Verify Token (generated, copy button)

#### WhatsApp Management
- Test Send button
- Template Management link
- Connection Test button

### Third-Party Integrations Section

#### Active Integrations Table
- Name, Status, Last Sync, Actions
- Add Integration button

#### Integration Configuration
- Integration type selector (CRM, ERP, Analytics, etc.)
- Integration-specific credentials
- Sync frequency selector
- Test Connection button
- Enable/Disable toggle

### API Keys & Webhooks Section

#### API Keys Subsection
- API Keys list:
  - Key name, Status, Created Date, Last Used
- Create API Key button
- Revoke Key button
- Copy Key button
- Permissions configuration per key

#### Webhook Configuration
- Webhook URL field
- Webhook Endpoints list (payment, shipping, order, etc.)
- Event subscription (checkboxes for events to receive)
- Test Webhook button
- Webhook Logs (recent webhook calls)

### Integration Status Dashboard

#### Health Status Display
- Payment gateways status
- Shipping providers status
- Email service status
- SMS service status
- WhatsApp service status
- Last sync time for each
- Error count for each
- Manual sync button (if applicable)

### Integration Logs Section

#### Recent Integration Calls Table
- Timestamp, Integration Name, Action, Status, Response Code
- Filter by integration
- Filter by status (success, failed, pending)
- Filter by date range
- View log details (modal)
- Error details visibility

## Backend API Requirements

### Payment Gateway Management
- **GET /api/settings/payment-gateways/** - Get payment gateway config
  - Response: [{ type, enabled, credentials, test_mode, display_order }]
  
- **PATCH /api/settings/payment-gateways/{type}/** - Update payment gateway
  - Request body: { enabled, credentials, test_mode }
  - Response: updated config
  
- **POST /api/settings/payment-gateways/{type}/test/** - Test payment gateway
  - Response: { success, message }

### Shipping Provider Management
- **GET /api/settings/shipping-providers/** - Get shipping config
  - Response: [{ provider, enabled, credentials, zones }]
  
- **PATCH /api/settings/shipping-providers/{provider}/** - Update shipping
  - Request body: configuration updates
  - Response: updated config

### Shipping Zone Management
- **GET /api/settings/shipping-zones/** - Get shipping zones
  - Response: [{ district, provider, base_rate, per_km_rate }]
  
- **POST /api/settings/shipping-zones/** - Create shipping zone
  - Request body: zone details
  - Response: created zone

### Email Service Configuration
- **GET /api/settings/email-service/** - Get email service config
  - Response: { provider, settings, test_status }
  
- **PATCH /api/settings/email-service/** - Update email service
  - Request body: configuration updates
  - Response: updated config
  
- **POST /api/settings/email-service/test/** - Test email service
  - Request body: { recipient_email }
  - Response: { success, message_id }

### SMS Service Configuration
- **GET /api/settings/sms-service/** - Get SMS config
  - Response: { provider, settings, test_status }
  
- **PATCH /api/settings/sms-service/** - Update SMS service
  - Request body: configuration updates
  - Response: updated config
  
- **POST /api/settings/sms-service/test/** - Test SMS service
  - Request body: { phone_number }
  - Response: { success, message_id }

### Third-Party Integration Management
- **GET /api/settings/integrations/** - Get third-party integrations
  - Response: [{ name, type, enabled, last_sync, status }]
  
- **POST /api/settings/integrations/** - Add integration
  - Request body: { type, credentials, sync_frequency }
  - Response: created integration
  
- **PATCH /api/settings/integrations/{id}/** - Update integration
  - Request body: updates
  - Response: updated integration

### API Key Management
- **GET /api/settings/api-keys/** - Get API keys (limited info for security)
  - Response: [{ id, name, created_at, last_used, permissions }]
  
- **POST /api/settings/api-keys/** - Create API key
  - Request body: { name, permissions }
  - Response: { key, secret } (returned only once)
  
- **DELETE /api/settings/api-keys/{id}/** - Revoke API key
  - Response: { success: true }

### Integration Logs
- **GET /api/settings/integrations/logs/** - Get integration logs
  - Query params: integration, status, date_range, limit, offset
  - Response: [{ timestamp, integration, action, status, response_code, details }]

## Database Requirements

### Core Models
- **IntegrationConfig model**:
  - Fields: type, provider, enabled, credentials (encrypted), test_mode, display_order
  
- **ShippingZone model**:
  - Fields: tenant_id, district, provider, base_rate, per_km_rate, enabled
  
- **APIKey model**:
  - Fields: tenant_id, name, key_hash, permissions, created_at, last_used_at, created_by
  
- **IntegrationLog model**:
  - Fields: tenant_id, integration_type, action, status, response_code, error_message, timestamp

### Data Security
- Encrypt sensitive credentials (API keys, secrets) at rest
- Indexes: (tenant_id, type), (integration_type, timestamp DESC)

### Data Integrity
- Maintain audit trail for all integration changes
- Support integration health tracking
- Archive old logs based on retention policy

## Current Implementation Status

- PayHere integration exists (partial, backend only)
- Payment gateway configuration NOT fully exposed in UI
- WebXPay, KOKO NOT fully configured
- Shipping provider configuration NOT in settings UI
- Email service configuration NOT fully exposed
- SMS service configuration NOT exposed
- WhatsApp configuration NOT exposed
- API Key management NOT exposed
- Integration health dashboard NOT implemented
- Integration logs NOT exposed
- Test buttons NOT fully implemented
- Webhook management NOT fully exposed

## Validation & Edge Cases

### Credential Validation
- API credentials must be non-empty
- Credential encryption required
- Test mode should not process real transactions

### Shipping Configuration Validation
- Shipping zones must not overlap for same provider
- Rates must be positive numbers

### Email/SMS Configuration Validation
- SMTP port must be valid (25, 465, 587, 993)
- Email address validation
- Phone number format validation

### Transaction Safety
- Integration changes should not affect active transactions
- Payment gateway disable should warn if orders pending
- Shipping provider disable should warn if shipments pending

## Testing Checklist

### Payment Gateway Tests
- [ ] PayHere config saves correctly
- [ ] Test button sends test payment
- [ ] WebXPay config saves
- [ ] KOKO config saves
- [ ] Bank transfer config saves
- [ ] Cash on delivery config saves
- [ ] Payment methods reorder saves

### Shipping Provider Tests
- [ ] Koombiyo config saves
- [ ] Koombiyo test button works
- [ ] Domex config saves
- [ ] Shipping zones can be added
- [ ] Shipping zones reorder works

### Email/SMS/WhatsApp Tests
- [ ] Email service selector changes form
- [ ] SMTP config saves
- [ ] Email test send works
- [ ] SMS service config saves
- [ ] SMS test send works
- [ ] WhatsApp config saves
- [ ] WhatsApp test send works

### API Key & Webhook Tests
- [ ] API key generation works
- [ ] API key revocation works
- [ ] Webhook config saves
- [ ] Integration status displays
- [ ] Integration logs display
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components
- [ ] Integration settings page component
- [ ] Payment gateway configuration component
- [ ] Payment method reordering component
- [ ] Shipping provider configuration component
- [ ] Shipping zone management component
- [ ] Email service configuration component
- [ ] SMS service configuration component
- [ ] WhatsApp service configuration component
- [ ] Third-party integration component
- [ ] API key management component
- [ ] Webhook configuration component
- [ ] Integration status dashboard component
- [ ] Integration logs component
- [ ] Test buttons and functionality

### Backend Implementation
- [ ] Backend API endpoints
- [ ] Integration service
- [ ] Credential storage service
- [ ] Encryption/decryption utilities
- [ ] Credentials encryption service
- [ ] Integration logging service
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Validation service
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states
- [ ] Permission checks

## Deployment Strategy

1. Deploy integration settings API endpoints
2. Deploy credential encryption utilities
3. Deploy frontend integration settings component
4. Deploy integration health monitoring
5. Testing: Test all payment, shipping, email, SMS integrations
6. Staff training: Integration configuration
7. Rollback: Maintain integration service availability

## Performance Targets

- Settings load: <500ms
- Credential save: <500ms
- Test connection: <3s
- Log queries: <500ms

## Monitoring & Alerting

- Track integration success rates
- Alert on integration failures
- Monitor credential expiry
- Alert on suspicious API key usage

## Documentation Requirements

- Payment gateway setup guide (PayHere, WebXPay, KOKO)
- Shipping provider setup guide (Koombiyo, Domex)
- Email service setup guide (SMTP, SendGrid, AWS)
- SMS provider setup guide (Twilio, AWS SNS)
- API key management guide
- Webhook setup guide
- Troubleshooting guide
- Integration security best practices

## Future Enhancements

- Integration marketplace (one-click installs)
- Custom integration builder
- Integration rate limiting
- Integration caching
- Failover mechanisms (redundant gateways)
- Integration health scoring
- Integration usage analytics
- OAuth integration support
- GraphQL support
