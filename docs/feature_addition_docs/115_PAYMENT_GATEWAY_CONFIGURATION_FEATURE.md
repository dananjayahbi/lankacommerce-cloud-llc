# 115: PAYMENT GATEWAY CONFIGURATION FEATURE

**Executive Summary:** Payment Gateway Configuration providing comprehensive payment gateway setup, merchant account configuration, and payment method management enabling businesses to configure PayHere, Stripe, KOKO, bank transfer, and cash on delivery payment options.

---

## Current State Analysis

### EXISTING:
- PayHere service with merchant configuration support
- Stripe service with publishable/secret key support
- Payment method enum (CASH, CARD, CHECK, STORE_CREDIT, SPLIT)
- Constants for PayHere URLs (sandbox and production)
- Webhook infrastructure for payment confirmations
- Multiple payment gateway services
- Payment model with gateway support
- Invoice payment tracking

### MISSING (Partially implemented or incomplete):
- Payment Methods Configuration UI page (self-service admin)
- Payment gateway credentials entry forms (UI not exposed)
- Test/Live mode toggle per gateway (API exists, UI doesn't)
- Payment method enable/disable toggles
- Payment method display order configuration (drag & drop)
- Bank transfer details configuration form
- Cash on delivery settings form
- Payment gateway status indicator
- Test gateway connectivity button
- Payment gateway webhook configuration UI
- Webhook secret management
- Payment method-specific settings (e.g., card processor settings)
- Payment method display order UI
- Payment gateway rate display
- Transaction fee configuration
- Payment success/failure notification customization
- Payment timeout configuration
- Currency configuration per payment method
- Minimum/maximum transaction amounts
- Payment method restrictions (by customer type, order type, etc.)
- Payment gateway performance metrics display
- Failed payment handling configuration
- Chargeback/dispute notification settings
- Payment reconciliation settings
- PCI compliance status indicator
- Multi-currency payment support configuration

---

## Frontend Features

### Settings Navigation
- Settings navigation with Payment Processing tab (new)

### Payment Methods Configuration Page
- **Available payment methods list:**
  - Cash
  - Card (PayHere or Stripe)
  - Bank Transfer
  - Check
  - Store Credit
  - KOKO/Buy Now Pay Later
  - Other methods
  
- **Payment methods table:**
  - Enabled status, Method name, Gateway, Status indicator
  - Enable/Disable toggles for each method
  - Reorder methods (drag & drop) for display priority
  - Configure button (per method)

### Cash Payment Configuration
- Description and notes
- Enable/disable toggle
- Max transaction amount (optional)
- Min transaction amount (optional)
- Save button

### Card Payment Configuration (PayHere)
- PayHere status: Connected/Not Configured
- Merchant ID field (required if configuring)
- Merchant Secret Key field (required, masked input)
- Business Registration Number
- Test/Live mode selector (radio buttons):
  - Test Mode (Sandbox)
  - Live Mode (Production)
- Test gateway connection button
- Connection status indicator (green/red)
- Transaction fee display (%) (read-only, from PayHere)
- Supported currencies display
- Save button
- Disconnect button (with confirmation)

### Card Payment Configuration (Stripe)
- Stripe status: Connected/Not Configured
- Publishable Key field (required)
- Secret Key field (required, masked)
- Test/Live mode selector
- Test gateway connection button
- Connection status indicator
- Save button
- Disconnect button

### Bank Transfer Configuration
- Enable/disable toggle
- Bank name field
- Account holder name field
- Account number field
- SWIFT/IBAN code (optional)
- Bank address (optional)
- Reference/memo template field
- Auto-reconciliation toggle (if configured)
- Save button

### Check Payment Configuration
- Enable/disable toggle
- Check processing notes field
- Max check amount (optional)
- Min check amount (optional)
- Save button

### Store Credit Configuration
- Enable/disable toggle
- Store credit rules (display only, from system settings)
- Save button

### KOKO Configuration (if available)
- KOKO status: Connected/Not Configured
- Merchant ID (required)
- API Key (required, masked)
- Test/Live mode selector
- Test connection button
- Status indicator
- Save button
- Disconnect button

### Payment Method Display Priority Section
- Drag & drop interface to reorder payment methods
- Shows how methods will appear in checkout/POS
- Preview of order
- Save button

### Payment Security Section
- PCI Compliance status (indicator)
- Data encryption toggle (if applicable)
- SSL certificate status (if applicable)
- Security settings link (to external docs)

---

## Backend API Requirements

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/methods/` | GET | Get enabled payment methods - Response: [{ method, name, gateway, enabled, config }] |
| `/api/payments/methods/{method}/` | PATCH | Update payment method - Request: { enabled, gateway_config } |
| `/api/payments/gateways/test/` | POST | Test gateway connection - Request: { gateway_name, config } |
| `/api/payments/gateways/config/` | GET | Get gateway configurations (sanitized) - Response: { gateways: [...] } |
| `/api/payments/gateways/{gateway}/` | PATCH | Update gateway configuration - Request: { merchant_id, api_keys, test_mode, etc. } |
| `/api/payments/methods/reorder/` | POST | Reorder payment methods - Request: { order: [method1, method2, ...] } |
| `/api/payments/gateways/{gateway}/` | DELETE | Disconnect gateway - Response: { success } |
| `/api/payments/gateways/{gateway}/status/` | GET | Get gateway health status - Response: { status, latency, last_transaction, errors } |

---

## Database Requirements

### Models
- **PaymentMethodConfiguration:** tenant_id, method_type, enabled, gateway, configuration (JSON encrypted), display_order, created_at, updated_at
- **PaymentGatewayConfiguration:** tenant_id, gateway_name, merchant_id, api_key (encrypted), secret_key (encrypted), test_mode, enabled, created_at
- **PaymentGatewayStatus:** gateway_id, last_checked, status, latency_ms, error_message

### Indexes
- (tenant_id, method_type)
- (tenant_id, display_order)
- (tenant_id, gateway_name)

---

## Current Implementation Status

| Component | Status |
|-----------|--------|
| PayHere service | EXISTS |
| Stripe service | EXISTS |
| Payment methods in POS | EXISTS |
| Configuration API endpoints | PARTIALLY exist (internal) |
| Test/Live mode toggle | EXISTS (backend) |
| Payment methods configuration UI | NOT implemented |
| Gateway credentials configuration UI | NOT implemented |
| Payment method reorder UI | NOT implemented |
| Test gateway connection UI button | NOT implemented |
| Payment gateway status indicator | NOT implemented |

---

## Validation & Edge Cases

- At least one payment method must be enabled
- Gateway credentials must be valid before enabling
- Test mode and Live mode cannot both be active simultaneously
- Sensitive data (API keys, secrets) must be encrypted
- Payment methods cannot be deleted, only disabled
- Reordering must preserve all methods
- Gateway status must be checked before processing
- Configuration changes should not affect in-progress transactions
- Test transactions must not be charged

---

## Testing Checklist

- [ ] PayHere gateway configuration works
- [ ] Stripe gateway configuration works
- [ ] Test/Live mode toggle works
- [ ] Connection test succeeds (or fails gracefully)
- [ ] Payment methods list displays
- [ ] Enable/disable toggles work
- [ ] Reorder functionality works
- [ ] Configuration saves correctly
- [ ] Credentials are masked on display
- [ ] Sensitive data is encrypted
- [ ] Responsive design works

---

## Implementation Checklist

- [ ] Payment methods configuration page
- [ ] Payment method selector component
- [ ] Gateway credential form component
- [ ] Test/Live mode toggle component
- [ ] Connection test component
- [ ] Payment method reorder component
- [ ] Gateway status indicator component
- [ ] API client methods
- [ ] State management
- [ ] Form validation
- [ ] Backend configuration endpoints
- [ ] Encryption service for credentials
- [ ] Gateway service enhancements

---

## Deployment Strategy

1. Deploy payment configuration API endpoints
2. Deploy credentials encryption
3. Deploy frontend payment configuration page
4. Testing: Configure gateways, test connections
5. Staff training: Payment gateway setup
6. Rollback: Maintain gateway configurations

---

## Performance Targets

- Configuration load: <500ms
- Gateway test connection: <3s
- Configuration save: <500ms

---

## Monitoring & Alerting

- Track gateway status
- Alert on gateway unavailability
- Monitor failed connection tests
- Alert on configuration errors
- Track payment method usage

---

## Documentation Requirements

- PayHere setup guide
- Stripe setup guide
- KOKO setup guide
- Bank transfer setup
- Payment gateway troubleshooting guide
- PCI compliance guide

---

## Future Enhancements

- Multiple gateway redundancy
- Automatic failover
- Payment method recommendations by region
- Multi-currency support
- White-label payment processing
- Advanced fraud detection integration
- Payment method optimization suggestions
