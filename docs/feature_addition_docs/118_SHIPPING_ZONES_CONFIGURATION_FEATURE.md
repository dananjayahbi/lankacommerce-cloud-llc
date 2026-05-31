# Shipping Zones Configuration Feature

## Executive Summary

Shipping Zones Configuration provides geographic zone management, district-wise shipping rate configuration, and shipping method setup enabling businesses to define delivery areas and associated costs for Sri Lanka operations.

## Current State Analysis

### EXISTING:
- Operations app created but empty
- No shipping models
- No zone management infrastructure
- No district configuration
- No shipping rate calculation engine
- No courier assignment system

### MISSING (ENTIRE FEATURE NOT IMPLEMENTED):
- Shipping zones model
- District definitions (Sri Lankan districts)
- Shipping zones list page
- Zone creation form
- Zone editing functionality
- Zone deletion (with child handling)
- District-wise rate configuration UI
- Free shipping threshold configuration
- Enable/disable zones UI
- Zone-wise courier assignment UI
- Shipping rate matrix display
- Zone visualization (map or table)
- Zone availability toggle
- Bulk zone import (from template)
- Zone reordering (drag & drop)
- Zone status indicators
- Shipping rate history tracking
- Zone exclusion handling (areas not serviced)
- Zone-level free shipping rules
- Zone-specific delivery timeframes
- Zone cost breakdown display
- Courier availability per zone
- API endpoints for zone management
- Zone-based shipping cost calculation
- Rate override for special zones
- Island-specific shipping (main island vs other islands)
- Bulk zone assignment to orders

## Frontend Features

### Settings - Shipping Configuration Tab (new):

#### Shipping Zones Overview:

**Zones table/map display:**
- Zone name, districts covered, status, courier count
- Filter by status (active, inactive)
- Search by zone name
- Create new zone button
- Edit zone button
- Delete zone button
- View details button

**Zone Statistics:**
- Total active zones
- Total districts covered
- Number of couriers assigned
- Average shipping cost
- Status indicator

#### Shipping Zones Management:

**Zone Creation Wizard:**

*Step 1: Zone Details*
- Zone name field
- Zone description
- Status selector (active/inactive)
- Zone type selector (urban, suburban, rural, island)

*Step 2: District Assignment*
- Available districts list:
  - Colombo, Galle, Matara, Hamantota, Kandy, etc.
  - Checkbox for each district
  - Select all button
  - Deselect all button
- Selected districts preview

*Step 3: Shipping Rates*
- Base shipping cost field
- Per-KG additional cost field
- Minimum order for free shipping field
- Free shipping threshold field
- Estimated delivery time field (days)
- Save zone button

*Step 4: Courier Assignment*
- Available couriers list (Koombiyo, Domex, etc.)
- Assign courier checkbox
- Primary courier selector (radio)
- Courier-specific rates (if variable)
- Courier availability toggle
- Save zone button

**Zone Detail View:**
- Zone information (name, type, status)
- Districts covered (list)
- Shipping rates breakdown
- Assigned couriers (list with status)
- Edit zone button
- Delete zone button (with confirmation)
- Zone activation/deactivation toggle
- View orders in zone button

**Zone Editing Page:**
- All creation fields
- Current settings display
- Save changes button
- Cancel changes button
- Revert to defaults button

#### Shipping Rate Configuration:

**Rate matrix table:**
- Zone name, Base cost, Per-KG, Min-order-free, Free threshold, Est. delivery
- Edit button (per row)
- Bulk edit button
- Export rates button
- Import rates button

**Bulk Rate Update Modal:**
- Zone selector (for batch update)
- Base cost field
- Per-KG cost field
- Free shipping threshold field
- Apply changes button

**Rate History:**
- Historical rate changes log
- Date, zone, old rate, new rate, changed by
- Revert to previous rate button (if applicable)

#### Free Shipping Configuration:

**Global settings:**
- Enable free shipping toggle
- Global minimum order threshold
- Free shipping discount type (percentage/fixed)
- Free shipping label customization

**Zone-specific overrides:**
- Override global settings toggle (per zone)
- Zone minimum order field
- Apply button

#### Island-Specific Configuration:

- Main Island zones
- Other Islands zones (Jaffna Peninsula, Trincomalee, etc.)
- Different rate structures per island
- Island-specific courier availability

## Backend API Requirements

- **GET /api/shipping/zones/** - Get all shipping zones
  - Query params: status, country, limit, offset
  - Response: [{ id, name, districts, status, couriers, base_cost }]

- **POST /api/shipping/zones/** - Create shipping zone
  - Request body: { name, type, districts, base_cost, per_kg_cost, free_shipping_threshold }
  - Response: created zone

- **GET /api/shipping/zones/{id}/** - Get zone details
  - Response: complete zone with all rates and couriers

- **PATCH /api/shipping/zones/{id}/** - Update shipping zone
  - Request body: { name, status, rates, couriers, etc. }
  - Response: updated zone

- **DELETE /api/shipping/zones/{id}/** - Delete shipping zone
  - Response: { success }

- **GET /api/shipping/zones/{id}/rates/** - Get zone rates
  - Response: { base_cost, per_kg_cost, free_shipping_threshold, estimated_delivery }

- **PATCH /api/shipping/zones/{id}/rates/** - Update zone rates
  - Request body: { base_cost, per_kg_cost, free_shipping_threshold }
  - Response: updated rates

- **GET /api/shipping/districts/** - Get all Sri Lankan districts
  - Response: [{ code, name, region, island }]

- **POST /api/shipping/zones/bulk-import/** - Bulk import zones
  - Request body: file upload (CSV/Excel)
  - Response: { imported_count, errors }

- **GET /api/shipping/calculate-cost/** - Calculate shipping cost
  - Query params: origin_district, destination_district, weight, order_value
  - Response: { cost, free_shipping_applied, estimated_delivery }

- **POST /api/shipping/zones/reorder/** - Reorder zones
  - Request body: { order: [zone_id1, zone_id2, ...] }
  - Response: { success }

## Database Requirements

- **ShippingZone model**: tenant_id, name, type, status, base_cost, per_kg_cost, free_shipping_threshold, estimated_delivery_days, created_at, updated_at
- **ShippingZoneDistrict model**: zone_id, district_code, is_primary
- **ShippingRate model**: zone_id, courier_id, base_cost, per_kg_cost, min_order_free, free_shipping_threshold
- **District model**: code, name, region, island, status (reference data)
- **Indexes**: (tenant_id, status), (zone_id, courier_id), (tenant_id, created_at DESC)

## Current Implementation Status

- Shipping zones NOT implemented
- District configuration NOT implemented
- Shipping rates UI NOT implemented
- Courier assignment UI NOT implemented
- Free shipping configuration NOT in UI
- Shipping cost calculation NOT exposed in UI
- API endpoints NOT implemented

## Validation & Edge Cases

- At least one zone must be active
- All districts must belong to exactly one zone
- Shipping cost must be positive
- Free shipping threshold cannot be negative
- Estimated delivery days must be positive
- Courier must be assigned to at least one zone
- Zone deletion must reassign districts to another zone (or prevent if only zone)
- Rate changes should not affect existing orders
- Bulk import must validate all rows before import
- District codes must match system reference
- Island-specific rates must override default rates

## Testing Checklist

- [ ] Create shipping zone works
- [ ] Edit zone works
- [ ] Delete zone works (with district reassignment)
- [ ] Add districts to zone works
- [ ] Update shipping rates works
- [ ] Free shipping threshold works
- [ ] Zone enable/disable toggle works
- [ ] Courier assignment works
- [ ] Bulk import zones works
- [ ] Calculate shipping cost works (with free shipping logic)
- [ ] Island-specific rates work
- [ ] Responsive design works

## Implementation Checklist

- [ ] ShippingZone model
- [ ] ShippingRate model
- [ ] District reference model
- [ ] Shipping zone list page component
- [ ] Zone creation wizard component
- [ ] Zone detail view component
- [ ] Rate configuration component
- [ ] Bulk import component
- [ ] Free shipping configuration component
- [ ] Island-specific configuration component
- [ ] API client methods
- [ ] Backend API endpoints
- [ ] Shipping cost calculation service
- [ ] Database migrations
- [ ] District seed data

## Deployment Strategy

- Deploy shipping models and migrations
- Deploy district reference data
- Deploy shipping API endpoints
- Deploy frontend shipping zones page
- Testing: Create zones, test cost calculation
- Staff training: Shipping zone setup
- Rollback: Maintain zone configurations

## Performance Targets

- Zone list load: <500ms
- Zone creation: <1s
- Shipping cost calculation: <100ms
- Bulk import (1000 zones): <5s

## Monitoring & Alerting

- Track zone coverage
- Alert on missing zone coverage (for orders)
- Monitor shipping cost calculation errors
- Alert on unused zones
- Track district assignments

## Documentation Requirements

- District code reference guide
- Shipping zone setup guide
- Rate configuration guide
- Free shipping rules guide
- Island-specific shipping guide

## Future Enhancements

- Predictive shipping cost optimization
- ML-based rate recommendations
- Dynamic rate adjustment based on demand
- Zone performance analytics
- Seasonal rate variations
- Customer location-based zone preview
