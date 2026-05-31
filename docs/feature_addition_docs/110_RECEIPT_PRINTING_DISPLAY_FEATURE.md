# Receipt Printing & Display Feature Specification

## Executive Summary

Receipt Printing & Display providing comprehensive receipt generation and printing capabilities for thermal printers, PDF export, and on-screen preview enabling businesses to print or deliver receipts through various channels with appropriate formatting.

## Current State Analysis

### EXISTING IMPLEMENTATION

- Thermal receipt HTML rendering (build_thermal_receipt_html function)
- Return receipt HTML rendering (build_return_receipt_renderer function)
- Receipt preview dialog in POS (ReceiptPreviewDialog component)
- Printer hardware service (print_sale_receipt function)
- Hardware printer configuration (printer type, host, port, paper width)
- Sale data model with all transaction details
- Receipt data context available (sale, customer, items, payment)

### MISSING / INCOMPLETE IMPLEMENTATION

- Thermal receipt printing UI from sales history (not just POS)
- PDF receipt generation service
- Receipt printing queue/batch operations
- Print preview (browser print preview)
- Printer selection UI (if multiple printers)
- Printer connectivity status display
- Failed print retry mechanism
- Receipt printing logs/history
- Reprint receipt from sales list
- Bulk receipt printing
- Receipt printing settings (copy count, auto-print, etc.)
- On-screen receipt display (without printing)
- Receipt zoom/scale controls
- Receipt export as image (PNG/JPG)
- Barcode/QR code generation on receipt
- Signature line for returns
- Return receipt printing UI
- Receipt duplicate indicator
- Receipt printing permissions
- Receipt printing performance optimization
- Network printer discovery

## Frontend Features

### POS Terminal Receipt Preview (Enhanced)

**Receipt display area** (shows complete receipt layout):
  - Store name and branding
  - Sale ID, date, time
  - Cashier name
  - Customer information (if customer linked)
  - Item list (product, quantity, price):
    - Subtotal per item
    - Discount indicators
  - Subtotal amount
  - Tax breakdown (amount, rate)
  - Discount amount (if applied)
  - Grand total (large, prominent display)
  - Payment method (cash, card, check, credit)
  - Change amount (if cash payment)
  - Thank you message
  - Return policy
  - Business contact information

**Print button** (primary):
  - Prints to configured thermal printer
  - Loading state while printing
  - Success message: "Receipt printed"
  - Error message if print fails
  - Retry button on error

**Print preview button**:
  - Opens browser print dialog
  - Shows full receipt layout
  - Allows user to select printer
  - Allows user to save as PDF

**Email button** (links to receipt distribution)

**SMS button** (links to receipt distribution)

**WhatsApp button** (existing, enhanced)

**New Sale button** (when done with current)

**Settings/gear icon** (opens receipt format settings)

### Receipt History & Reprint Page

**Sales list view with receipt actions**:
  - Sales table (Sale ID, Date, Customer, Total, Payment method)
  - Filter by date range
  - Filter by payment method
  - Search by sale ID or customer
  - Each row has actions:
    - View receipt button
    - Print receipt button
    - Email receipt button
    - SMS receipt button
    - WhatsApp receipt button

**Receipt Detail View** (modal or new page):
  - Full receipt display
  - Print button
  - Preview button
  - Send buttons (email, SMS, WhatsApp)
  - Re-print counter (shows how many times printed)
  - Original print date/time
  - Last reprint date/time
  - Print history link (shows all print attempts)

### Printer Selection UI

**Printer selector dropdown** (in POS):
  - Available printers list
  - Current selected printer (highlight)
  - Printer status indicator (online, offline, error)
  - Configure printers button

**Printer configuration modal**:
  - Printer type selector (thermal 80mm, 58mm, network)
  - Network printer settings (host, port)
  - Paper width selector
  - Test print button
  - Connection status indicator

### Receipt Print Preview (Browser Print)

**Print preview window**:
  - Full receipt layout as it will print
  - Zoom controls (100%, 150%, 200%, fit to page)
  - Print button (direct to printer)
  - Save as PDF button
  - Cancel button
  - Printer selection (from browser)
  - Paper size (if applicable)
  - Print quality settings

### Receipt Printing Settings

- **Auto-print toggle**
  - Automatically print receipt on sale completion
  - Useful for high-volume POS

- **Print copy count**
  - Number of copies to print per receipt
  - Selector (1-5 copies)

- **Print delay (optional)**
  - Delay before automatic printing
  - Prevents printer queue overload

- **Failed print notification**
  - Alert user if print fails
  - Provide retry option

### Receipt Printing Status/Logs

**Printer status indicator** (in POS):
  - Green: Ready
  - Yellow: Warming up
  - Red: Error/Offline
  - Click for printer details

**Print error display**:
  - Shows printer error message
  - Suggests troubleshooting
  - Retry button
  - Manual fallback options (email/SMS)

### Return Receipt Printing

**Return receipt generation**:
  - Triggers when return processed
  - Shows original sale info
  - Shows returned items
  - Refund amount
  - New balance (if store credit)

**Return receipt display**:
  - Similar layout to sale receipt
  - Marked as "RETURN" or "REFUND RECEIPT"
  - Date and reason for return
  - Signature line (for proof)

**Print return receipt button**

**Send return receipt option**

### Receipt Export Options

**Export receipt as PDF**:
  - Dialog to select location/name
  - Downloaded file named by sale ID and date

**Export receipt as PNG/JPG**:
  - For sharing on social media
  - Image quality selector

**Email receipt** (native):
  - Not print preview, but direct email delivery
  - Links to receipt distribution feature

## Backend API Requirements

### Receipt Retrieval Endpoints

- **GET /api/pos/sales/{id}/receipt/**
  - Get receipt data
  - Response: `{ sale_id, date, items, total, payment_method, cashier, customer }`

### Print Endpoints

- **POST /api/pos/sales/{id}/print/**
  - Trigger receipt print
  - Request body: `{ printer_id, copies, format }`
  - Response: `{ success, job_id, message }`

- **POST /api/pos/sales/{id}/receipt-preview/**
  - Get receipt HTML
  - Request body: `{ format }`
  - Response: `{ html, file_path }`

### PDF Generation Endpoints

- **POST /api/pos/sales/{id}/receipt-pdf/**
  - Generate PDF receipt
  - Request body: `{ }`
  - Response: PDF file or `{ pdf_url }`

### Printer Management Endpoints

- **GET /api/hardware/printers/**
  - Get configured printers
  - Response: `[{ id, name, type, status, last_used }]`

- **POST /api/hardware/printers/{id}/test/**
  - Test print
  - Response: `{ success, message }`

### Print History Endpoints

- **GET /api/pos/print-history/**
  - Get print history
  - Query params: sale_id, date_range, limit, offset
  - Response: `[{ sale_id, printed_at, printer_id, copies, status }]`

### Return Receipt Endpoints

- **POST /api/pos/returns/{id}/receipt-print/**
  - Print return receipt
  - Response: `{ success }`

## Database Requirements

### Models

- **PrinterConfiguration**
  - tenant_id
  - printer_type
  - host
  - port
  - paper_width
  - is_active
  - status

- **PrintHistory**
  - sale_id
  - printer_id
  - printed_at
  - copies
  - status
  - error_message

- **ReturnReceiptLog**
  - return_id
  - printed_at
  - status

### Database Indexes

- `(tenant_id, is_active)`
- `(sale_id, printed_at DESC)`

## Current Implementation Status

- Receipt rendering service EXISTS
- Printer service EXISTS
- Receipt preview dialog EXISTS (POS)
- Thermal receipt HTML generation EXISTS
- Return receipt generation EXISTS
- Hardware printer configuration PARTIALLY EXISTS
- Print history/logs NOT implemented
- Reprint functionality PARTIALLY implemented (WhatsApp message resend)
- PDF receipt generation NOT fully implemented
- Receipt printing queue NOT implemented
- Failed print retry mechanism NOT implemented
- Bulk receipt printing NOT implemented
- Auto-print setting NOT fully implemented
- Printer status display NOT implemented

## Validation & Edge Cases

- Printer must be online and available
- Receipt format must match printer capabilities
- Thermal printer paper width constraints
- Print queue management (prevent overload)
- Failed prints must be logged and retriable
- Receipt data must not change after printing (for audit)
- Multiple concurrent print requests handling
- Network printer timeout handling
- Printer discovery and auto-detection
- Print job status tracking
- Receipt duplication detection (reprint vs duplicate)

## Testing Checklist

- [ ] Receipt prints to thermal printer
- [ ] Receipt displays in print preview
- [ ] Receipt exports to PDF
- [ ] Receipt can be saved as image
- [ ] Multiple copies print correctly
- [ ] Print preview shows accurate layout
- [ ] Printer selection works
- [ ] Test print succeeds
- [ ] Failed print is logged
- [ ] Retry print works
- [ ] Return receipt prints
- [ ] Return receipt displays correctly
- [ ] Print history logs all prints
- [ ] Reprint counter increments
- [ ] Print permissions enforced
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components

- [ ] Receipt preview component (enhanced)
- [ ] Print button and handler
- [ ] Print preview component
- [ ] Printer selector component
- [ ] Printer test component
- [ ] Receipt history page
- [ ] Receipt detail view
- [ ] Return receipt display component
- [ ] Export PDF component
- [ ] Export image component
- [ ] Print settings component
- [ ] Printer status indicator
- [ ] Print error dialog
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Error handling
- [ ] Loading states

### Backend Implementation

- [ ] Backend print API endpoints
- [ ] Printer service implementation
- [ ] Print history service
- [ ] PDF generation service
- [ ] Thermal receipt rendering
- [ ] Return receipt rendering
- [ ] Audit logging

## Deployment Strategy

- Deploy printer service
- Deploy print history service
- Deploy receipt API endpoints
- Deploy frontend print/preview pages
- Testing: Print receipts, verify output
- Staff training: Printer setup and troubleshooting
- Rollback: Maintain printer configuration

## Performance Targets

- Receipt generation: <500ms
- Print job submission: <1s
- Print preview generation: <2s
- PDF generation: <3s

## Monitoring & Alerting

- Track print success/failure rates
- Monitor printer connectivity
- Alert on print failures
- Track printer usage by shift/cashier

## Documentation Requirements

- Printer setup guide
- Receipt printing troubleshooting
- Print preview guide
- PDF export guide
- Return receipt printing guide

## Future Enhancements

- Cloud printing (Google Cloud Print, Apple AirPrint)
- Mobile receipt printing (Bluetooth printers)
- Receipt template variations by printer
- Receipt compression for mobile printing
- Print queue visualization
- Printer maintenance alerts
- Receipt printing cost tracking
- Receipt archive and retrieval
