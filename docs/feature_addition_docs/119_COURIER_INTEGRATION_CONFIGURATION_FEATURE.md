# Courier Integration Configuration Feature

## Executive Summary

Courier Integration Configuration provides courier API setup, credential management, and pickup schedule configuration enabling businesses to integrate with delivery partners (Koombiyo, Domex, etc.) and manage shipments.

## Current State Analysis

### EXISTING:
- No courier models
- No courier service integrations
- No API credential storage
- No pickup schedule management
- No courier connectivity testing
- No courier status webhook handlers

### MISSING (ENTIRE FEATURE NOT IMPLEMENTED):
- Courier model and configuration storage
- Koombiyo API integration
- Domex API integration
- Other courier integrations
- Courier credential encryption
- Pickup schedule model
- Pickup location management
- Pickup time slot management
- Courier connectivity test
- Courier health status monitoring
- Webhook handlers for courier confirmations
- Courier rate fetching
- Shipment label generation integration
- Courier API documentation UI
- Courier priority selection
- Fallback courier configuration
- Courier capacity management
- Bulk shipment creation interface
- Manual shipment upload to courier
- Courier performance tracking
- SLA monitoring (delivery time)

## Frontend Features

### Settings - Courier Integration Tab (new):

#### Configured Couriers Section:

**Couriers list/cards:**
- Courier name, logo, status (connected/not configured)
- Last health check timestamp
- Number of shipments this month
- Configure button (per courier)
- Disconnect button (per courier)
- View documentation button

#### Courier Configuration Wizard:

**Koombiyo Configuration:**
- API Endpoint field (pre-filled)
- API Username field
- API Password field (masked)
- Merchant ID field
- Contact person name
- Contact email
- Contact phone
- Test credentials button
- Connection status indicator
- Save configuration button
- Clear credentials button (with confirmation)

**Domex Configuration:**
- API Endpoint field
- API Key field (masked)
- API Secret field (masked)
- Account ID field
- Account email
- Test credentials button
- Connection status indicator
- Save configuration button

**Other Courier Configuration:**
- Courier selector
- Dynamic form based on courier requirements
- API documentation link
- Save configuration button

#### Pickup Schedule Configuration:

**Pickup location setup:**
- Location name field
- Address fields (street, city, postal code)
- GPS coordinates (lat/long)
- Contact person name
- Contact phone
- Default location toggle
- Save location button

**Pickup time slots:**
- Days of week checkboxes (Mon-Sun)
- Morning pickup time (time picker)
- Afternoon pickup time (time picker)
- Evening pickup time (time picker) - optional
- Cutoff time for pickup
- Maximum pickups per slot
- Set as default schedule button
- Save schedule button

**Multiple pickup schedules:**
- Schedule selector (by location)
- Schedule details display
- Edit schedule button
- Duplicate schedule button
- Delete schedule button

#### Courier Health & Status:

- Status indicator (green = operational, red = down)
- Last health check timestamp
- Health check frequency selector
- Last 10 transactions status
- Error rate percentage
- Average response time
- Monthly statistics
- Test courier connectivity button
- View connectivity log button

#### Courier Priorities:

- Primary courier selector (radio)
- Secondary courier selector (radio)
- Fallback courier selector (radio)
- Automatic failover toggle
- Save priorities button
- Priority decision rules (display):
  - By zone
  - By order value
  - By delivery urgency
  - By courier availability

#### Shipment Preferences:

- Default shipping method selector
- Allow customer to choose courier toggle
- Automatic shipment creation on order toggle
- Batch shipment processing schedule
- COD (cash on delivery) support toggle (per courier)
- Insurance option toggle
- Special handling requirements (fragile, cold chain, etc.)

#### Webhook Configuration:

- Webhook URLs display (for each courier)
- Copy webhook URL button
- Test webhook button (send test payload)
- Webhook events subscribed to
- Webhook retry configuration
- Webhook delivery logs link

#### Courier Performance Metrics:

- On-time delivery rate (%)
- Failed delivery rate (%)
- Average delivery time (days)
- Customer satisfaction rating
- Cost per shipment (average)
- Total shipments (month)

## Backend API Requirements

- **POST /api/shipping/couriers/configure/** - Configure courier
  - Request body: { courier_name, api_credentials (encrypted), pickup_location, contact_info }
  - Response: configuration saved

- **GET /api/shipping/couriers/list/** - Get configured couriers
  - Response: [{ name, status, last_check, shipment_count }]

- **PATCH /api/shipping/couriers/{courier}/** - Update courier configuration
  - Request body: { api_credentials, pickup_location, priorities }
  - Response: updated configuration

- **DELETE /api/shipping/couriers/{courier}/** - Disconnect courier
  - Response: { success }

- **POST /api/shipping/couriers/test-connection/** - Test courier connectivity
  - Request body: { courier_name }
  - Response: { connected, status, latency, message }

- **GET /api/shipping/couriers/health/** - Get courier health status
  - Response: { status, last_check, error_rate, avg_response_time }

- **POST /api/shipping/pickup-locations/** - Create pickup location
  - Request body: { name, address, coordinates, contact_info }
  - Response: created location

- **GET /api/shipping/pickup-schedules/** - Get pickup schedules
  - Response: [{ location_id, days, times, cutoff }]

- **PATCH /api/shipping/pickup-schedules/{id}/** - Update pickup schedule
  - Request body: { days, times, cutoff, max_pickups }
  - Response: updated schedule

- **GET /api/shipping/couriers/performance/** - Get courier performance metrics
  - Query params: courier_name, date_range
  - Response: { on_time_rate, failed_rate, avg_time, satisfaction, cost_per_shipment }

- **POST /api/shipping/shipment/create/** - Create shipment with courier
  - Request body: { order_id, courier, shipment_details }
  - Response: { shipment_id, tracking_number, label_url }

- **POST /api/shipping/webhook/{courier}/** - Courier webhook handler
  - Request body: { event_type, shipment_id, status, timestamp }
  - Response: { success }

## Database Requirements

- **CourierConfiguration model**: tenant_id, courier_name, api_credentials (encrypted), api_endpoint, status, last_health_check, created_at, updated_at
- **PickupLocation model**: tenant_id, location_name, address, coordinates, contact_info, is_default
- **PickupSchedule model**: tenant_id, location_id, days_of_week, pickup_times (JSON), cutoff_time, max_pickups
- **CourierHealthLog model**: courier_id, check_timestamp, status, latency_ms, error_message
- **CourierPriority model**: tenant_id, primary_courier, secondary_courier, fallback_courier, priority_rules (JSON)
- **Indexes**: (tenant_id, courier_name), (tenant_id, is_default), (courier_id, check_timestamp DESC)

## Current Implementation Status

- Courier models NOT implemented
- Koombiyo integration NOT implemented
- Domex integration NOT implemented
- Pickup schedule management NOT implemented
- Courier health monitoring NOT implemented
- Courier configuration UI NOT implemented
- Shipment creation NOT exposed in UI
- API endpoints NOT implemented

## Validation & Edge Cases

- At least one courier must be configured
- API credentials must be valid before saving
- Pickup times must be within business hours
- At least one pickup day must be selected
- Courier credentials must be encrypted
- Coordinate validation (latitude -90 to 90, longitude -180 to 180)
- Cutoff time must be before pickup times
- Multiple courier fallback chain must be valid
- Health check must not block operations
- Webhook validation must verify sender authenticity
- Shipment batch size must respect courier limits

## Testing Checklist

- [ ] Configure Koombiyo works
- [ ] Configure Domex works
- [ ] Test courier connectivity works
- [ ] Courier health check works
- [ ] Pickup location creation works
- [ ] Pickup schedule setup works
- [ ] Shipment creation works
- [ ] Courier webhook receipt works
- [ ] Courier priority selection works
- [ ] Fallback routing works
- [ ] Bulk shipment creation works
- [ ] Responsive design works

## Implementation Checklist

- [ ] CourierConfiguration model
- [ ] PickupLocation model
- [ ] PickupSchedule model
- [ ] CourierHealthLog model
- [ ] Koombiyo service integration
- [ ] Domex service integration
- [ ] Courier configuration page component
- [ ] Pickup schedule component
- [ ] Courier health indicator component
- [ ] Shipment creation component
- [ ] API client methods
- [ ] Backend courier API endpoints
- [ ] Webhook handlers for each courier
- [ ] Health check background task
- [ ] Encryption service for credentials
- [ ] Database migrations

## Deployment Strategy

- Deploy courier models and migrations
- Deploy courier integration services
- Deploy courier API endpoints
- Deploy frontend courier configuration page
- Configure credentials for production couriers
- Testing: Create shipments, verify tracking
- Staff training: Courier setup and shipment management
- Rollback: Maintain courier configurations

## Performance Targets

- Courier configuration save: <1s
- Health check execution: <3s
- Shipment creation: <2s
- Webhook processing: <500ms

## Monitoring & Alerting

- Track courier availability
- Alert on courier API failures
- Monitor health check results
- Alert on low success rate
- Track shipment creation errors
- Monitor webhook delivery failures

## Documentation Requirements

- Koombiyo setup guide
- Domex setup guide
- Pickup schedule setup guide
- Webhook configuration guide
- Courier troubleshooting guide
- API credential security guide

## Future Enhancements

- Multi-courier load balancing
- Automatic courier selection by zone
- Rate comparison and optimization
- Courier capacity planning
- Predictive delivery time estimation
- Real-time courier availability
- Integration with third-party courier aggregators
