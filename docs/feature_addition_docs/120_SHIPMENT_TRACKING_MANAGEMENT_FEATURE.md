# Shipment Tracking Management Feature

## Executive Summary

Shipment Tracking Management provides real-time shipment tracking, status updates, label generation, and delivery management enabling visibility into shipment lifecycle and customer communication.

## Current State Analysis

### EXISTING:
- No shipment model
- No tracking status model
- No label generation integration
- No tracking event logging
- No customer tracking portal
- No shipment status notifications
- No delivery management UI

### MISSING (ENTIRE FEATURE NOT IMPLEMENTED):
- Shipment model (order → shipment relationship)
- ShipmentLineItem model (product-level tracking)
- TrackingEvent model (status history)
- TrackingStatus enum (pending pickup, in transit, out for delivery, delivered, failed, returned)
- Label generation for each shipment
- QR code generation for tracking
- Shipment search interface
- Shipment detail view
- Tracking history display
- Delivery confirmation UI
- Failed delivery handling
- Return shipment creation
- Bulk shipment management
- Shipment status webhook handlers
- Customer shipment notifications
- Delivery proof capture (photo/signature)
- Delivery notes capture
- Multiple delivery attempts tracking
- RTO (Return to Origin) handling
- Shipment delay notifications
- Estimated delivery time display
- Delivery exception handling
- Shipment merge/split (if items consolidated)

## Frontend Features

### Store Dashboard Shipments Widget:

- Recent shipments card (5 most recent)
- Pending shipments count
- In-transit count
- Delivered (today) count
- Failed deliveries count
- View all shipments button

### Shipments List Page (Store - Operations):

**Shipments table:**
- Shipment ID (with link to details)
- Order ID (with link to order)
- Customer name
- Destination
- Status (visual indicator)
- Courier
- Estimated delivery date
- Current location (last update)
- Actions

**Filters:**
- Status filter (pending, in-transit, out-for-delivery, delivered, failed, returned)
- Courier filter
- Date range filter
- Search by shipment ID or order ID

**Sort options:** date, status, courier, delivery date

**Row actions:**
- View shipment details button
- Print label button
- Reprint label button
- Cancel shipment button (if not yet picked up)
- Create return button (if applicable)

**Bulk Actions:**
- Select multiple shipments
- Bulk print labels
- Bulk generate manifest
- Bulk cancel shipments

### Shipment Detail View:

**Header section:**
- Shipment ID, Status badge, Courier logo
- Order ID (with link), Customer name
- Created date, Estimated delivery date

**Shipment Items Table:**
- Product name, SKU, Quantity, Weight
- Each item tracked separately

**Shipment Details Section:**
- Recipient information:
  - Name, phone, address
  - Delivery instructions
- Pickup information:
  - Pickup location, pickup time, pickup status
- Package information:
  - Total weight, dimensions, package count
  - Special handling requirements (fragile, cold chain, etc.)
- Courier information:
  - Courier name, service type
  - Reference number (from courier)
  - Tracking number

**Label Section:**
- Shipment label display (thermal format)
- Print label button
- Download label as PDF button
- Reprint label button
- QR code for quick tracking

**Tracking Timeline:**
- Visual timeline of status changes
- Events in chronological order:
  - Shipment created
  - Pickup scheduled
  - Picked up
  - In transit (from → to)
  - Out for delivery
  - Delivered
  - Failed delivery (with reason)
  - Returned to origin
- Each event shows timestamp, location (if available), notes
- Delivery proof (photo) display (if captured)

**Delivery Confirmation Section (if delivered):**
- Delivery date/time
- Delivered by (if available)
- Recipient signature (if captured)
- Delivery photo (if captured)
- Delivery notes

**Failed Delivery Section (if failed):**
- Failure reason (not home, address invalid, refused, etc.)
- Failure timestamp and location
- Next retry date/time
- Manual retry button
- Return to origin button

**Actions:**
- Edit shipment (if not yet picked up)
- Cancel shipment (if not yet picked up)
- Contact courier (opens contact modal)
- Create return (button)
- Resend delivery notification (button)
- Print label (button)
- Download shipment details (button)

### Manual Shipment Creation (for non-order shipments):

- Customer selector
- Recipient details (pre-fill if customer)
- Items selector (from inventory or manual entry)
- Weight and dimensions
- Delivery address
- Preferred courier selector
- Service level selector (standard, express, etc.)
- Special handling requirements
- Create shipment button
- Auto-generate and print label toggle

### Shipment Manifest/Batch:

- Generate shipment manifest (group shipments for pickup)
- Manifest details:
  - Manifest ID, date, location
  - Shipment list
  - Total shipments, total weight
  - Barcode for manifest
- Print manifest button
- Export manifest as Excel button
- Mark as picked up button (on courier pickup)

### Tracking Portal (Customer-Facing):

- Tracking page (accessible via order link)
- Enter tracking number field
- Search button
- Tracking results:
  - Current status display (large, with icon)
  - Timeline of events
  - Estimated delivery
  - Last location update
  - Delivery instructions (if customer provided)
- Status notifications:
  - Email tracking link
  - SMS tracking link
  - WhatsApp tracking link

### Shipment Status Dashboard:

- Status summary (pie chart):
  - % pending pickup
  - % in transit
  - % out for delivery
  - % delivered
  - % failed
  - % returned
- Status filters (to drill down)
- KPI cards:
  - Average delivery time (days)
  - On-time delivery %
  - Failed delivery %
  - Return rate %

## Backend API Requirements

- **POST /api/shipping/shipments/** - Create shipment
  - Request body: { order_id, courier, destination_address, weight, items }
  - Response: { shipment_id, tracking_number, label_url, manifest_id }

- **GET /api/shipping/shipments/** - Get shipments list
  - Query params: status, courier, date_range, search, limit, offset
  - Response: [{ id, order_id, status, courier, estimated_delivery, current_location }]

- **GET /api/shipping/shipments/{id}/** - Get shipment details
  - Response: complete shipment with tracking history

- **PATCH /api/shipping/shipments/{id}/** - Update shipment (edit before pickup)
  - Request body: { recipient_info, delivery_address, weight }
  - Response: updated shipment

- **DELETE /api/shipping/shipments/{id}/** - Cancel shipment
  - Response: { success, status }

- **GET /api/shipping/shipments/{id}/label/** - Get shipment label
  - Query params: format (pdf, thermal)
  - Response: label data or PDF file

- **POST /api/shipping/shipments/{id}/retry-delivery/** - Retry failed delivery
  - Request body: { retry_date, retry_time }
  - Response: { success, new_attempt_date }

- **POST /api/shipping/shipments/{id}/return/** - Create return shipment
  - Request body: { return_reason }
  - Response: { return_shipment_id, tracking_number }

- **GET /api/shipping/tracking/{tracking_number}/** - Public tracking (no auth)
  - Response: tracking events and current status

- **POST /api/shipping/manifest/** - Create shipment manifest
  - Request body: { shipment_ids }
  - Response: { manifest_id, manifest_url }

- **POST /api/shipping/webhook/{courier}/track/** - Courier tracking update webhook
  - Request body: { shipment_id, status, location, timestamp, delivery_proof }
  - Response: { success }

- **GET /api/shipping/stats/** - Get shipment statistics
  - Query params: date_range, courier, status
  - Response: { avg_delivery_time, on_time_rate, failed_rate, status_breakdown }

- **GET /api/shipping/shipments/{id}/proof/** - Get delivery proof (photo/signature)
  - Response: proof file/image

- **POST /api/shipping/shipments/{id}/notify/** - Send tracking notification
  - Request body: { channel (email/sms/whatsapp), message_template }
  - Response: { sent_to, confirmation }

## Database Requirements

- **Shipment model**: tenant_id, order_id, courier_id, shipment_number, tracking_number, status, weight, dimensions, recipient_info (JSON), delivery_address, estimated_delivery, actual_delivery, created_at, updated_at
- **ShipmentLineItem model**: shipment_id, product_id, quantity, weight
- **TrackingEvent model**: shipment_id, event_type, status, location, timestamp, notes, event_data (JSON), proof_file
- **TrackingStatus enum**: PENDING_PICKUP, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED, CANCELLED
- **ShipmentManifest model**: manifest_number, location, created_at, status, shipments (JSON or M2M)
- **Indexes**: (tenant_id, status, created_at DESC), (tracking_number), (order_id), (courier_id, created_at DESC)

## Current Implementation Status

- Shipment model NOT implemented
- Tracking event logging NOT implemented
- Label generation NOT integrated
- Shipment list page NOT implemented
- Tracking portal NOT implemented
- Manifest generation NOT implemented
- API endpoints NOT implemented
- Webhook handlers NOT implemented
- Customer notifications NOT implemented

## Validation & Edge Cases

- Shipment must have valid order
- Recipient address must be valid
- Weight must be positive
- Tracking number must be unique (per courier)
- Cannot modify shipment after pickup
- Cannot delete shipped shipment (only cancel if not picked up)
- Failed delivery retry must have new date/time
- Return shipment must reference original shipment
- Delivery proof must be captured on successful delivery
- Multiple delivery attempts must be logged
- Manifest must contain valid shipments
- Status updates from courier must be idempotent
- Estimated delivery must be after pickup date
- Public tracking must not expose sensitive data (only order reference)

## Testing Checklist

- [ ] Create shipment works
- [ ] Shipment details display works
- [ ] Edit shipment (before pickup) works
- [ ] Cancel shipment works
- [ ] Print/download label works
- [ ] Generate manifest works
- [ ] Courier webhook updates status works
- [ ] Tracking history displays correctly
- [ ] Failed delivery handling works
- [ ] Return shipment creation works
- [ ] Public tracking page works
- [ ] Status notifications send works
- [ ] Bulk operations work
- [ ] Responsive design works

## Implementation Checklist

- [ ] Shipment model
- [ ] TrackingEvent model
- [ ] ShipmentManifest model
- [ ] Shipment list page component
- [ ] Shipment detail view component
- [ ] Shipment form component (create/edit)
- [ ] Tracking timeline component
- [ ] Label generation component
- [ ] Manifest generation component
- [ ] Public tracking component
- [ ] Status notification component
- [ ] API client methods
- [ ] Backend shipment API endpoints
- [ ] Courier webhook handlers
- [ ] Notification service integration
- [ ] Label printing service integration
- [ ] Database migrations

## Deployment Strategy

- Deploy shipment models and migrations
- Deploy shipment API endpoints
- Deploy label generation integration
- Deploy frontend shipment pages
- Configure courier webhook handlers
- Testing: Create shipments, verify tracking updates
- Staff training: Shipment management and tracking
- Customer notification: Enable tracking notifications
- Rollback: Maintain shipment history

## Performance Targets

- Shipment creation: <2s
- Shipment list load: <500ms
- Tracking update webhook: <200ms
- Label generation: <1s
- Public tracking: <300ms

## Monitoring & Alerting

- Track shipment delivery rates
- Alert on failed deliveries
- Monitor tracking update delays
- Alert on stuck shipments (no updates)
- Track label generation failures
- Monitor webhook delivery failures

## Documentation Requirements

- Shipment management guide
- Tracking portal user guide
- Label printing guide
- Manifest generation guide
- Failed delivery handling guide
- Return shipment guide
- Tracking webhook format guide

## Future Enhancements

- Real-time shipment tracking map (Google Maps integration)
- Predictive delivery time estimates
- AI-powered delivery optimization
- Exception management automation
- Customer self-service return processing
- Shipment insurance options
- Multi-pickup scheduling
- Proof of delivery with customer signature
- Blockchain-based shipment verification
