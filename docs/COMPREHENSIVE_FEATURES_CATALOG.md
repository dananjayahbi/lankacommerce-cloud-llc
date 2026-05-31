# LankaCommerce Cloud - Comprehensive Features Catalog

> **Document Type:** Feature Pages & Modules Inventory  
> **Date Created:** May 31, 2026  
> **Scope:** Self-Registering SaaS Platform for POS/ERP/SME  
> **Note:** Webstore functionality excluded per requirements  

---

## Table of Contents

1. [Authentication Pages](#authentication-pages)
2. [Dashboard Home](#dashboard-home)
3. [Product Management Page](#product-management-page)
4. [Product Category Management Page](#product-category-management-page)
5. [Product Attributes Page](#product-attributes-page)
6. [Inventory Management Page](#inventory-management-page)
7. [Stock Transfer Page](#stock-transfer-page)
8. [Low Stock Alerts Page](#low-stock-alerts-page)
9. [Orders Management Page](#orders-management-page)
10. [Quote Management Page](#quote-management-page)
11. [Invoice Management Page](#invoice-management-page)
12. [POS Terminal Interface](#pos-terminal-interface)
13. [POS Shift Management](#pos-shift-management)
14. [Customer Management Page](#customer-management-page)
15. [Customer Profile Page](#customer-profile-page)
16. [Vendor Management Page](#vendor-management-page)
17. [Purchase Orders Page](#purchase-orders-page)
18. [Vendor Bills Page](#vendor-bills-page)
19. [Employee Management Page](#employee-management-page)
20. [Department & Organizational Structure](#department--organizational-structure)
21. [Attendance Management Page](#attendance-management-page)
22. [Leave Management Page](#leave-management-page)
23. [Salary Structure Page](#salary-structure-page)
24. [Payroll Processing Page](#payroll-processing-page)
25. [Payslip Page](#payslip-page)
26. [Chart of Accounts Page](#chart-of-accounts-page)
27. [Journal Entries Page](#journal-entries-page)
28. [Bank Reconciliation Page](#bank-reconciliation-page)
29. [Financial Reports Page](#financial-reports-page)
30. [Sales Analytics Dashboard](#sales-analytics-dashboard)
31. [Inventory Analytics Dashboard](#inventory-analytics-dashboard)
32. [Financial Analytics Dashboard](#financial-analytics-dashboard)
33. [Customer Analytics Dashboard](#customer-analytics-dashboard)
34. [Business KPI Dashboard](#business-kpi-dashboard)
35. [Settings Page](#settings-page)
36. [User Management Page](#user-management-page)
37. [Tenant Configuration Page](#tenant-configuration-page)
38. [Receipt Printing & Email](#receipt-printing--email)
39. [Document Generator (Invoices, POs)](#document-generator-invoices-pos)
40. [Payment Processing Page](#payment-processing-page)
41. [Shipping Integration Console](#shipping-integration-console)
42. [Notification Management Page](#notification-management-page)
43. [API Documentation Interface](#api-documentation-interface)
44. [AI Chatbot Interface](#ai-chatbot-interface)
45. [Smart Search Interface](#smart-search-interface)
46. [Recommendation Engine Console](#recommendation-engine-console)
47. [Multi-Tenancy Management (Admin)](#multi-tenancy-management-admin)

---

## Authentication Pages

### Login Page
- Email/Username login field
- Password field
- "Remember me" checkbox
- "Forgot password?" link
- Sign-up redirect
- Form validation
- Error message display
- Loading state
- Responsive design (mobile/tablet/desktop)

### Registration Page
- Email input field
- Password input field
- Password confirmation field
- Business name input
- Phone number input
- Business type selector
- Terms & conditions checkbox
- Privacy policy link
- Already have account? login link
- Form validation
- Error handling
- Email verification after signup

### Password Reset Page
- Email/username field
- "Send reset link" button
- Success message display
- Link validity tracking
- Redirect to new password form

### Email Verification Page
- Verification code input
- Resend code option
- Countdown timer
- Success message
- Redirect to login

---

## Dashboard Home

### Home Overview Dashboard
- Key metrics cards (Revenue, Orders, Customers, Inventory)
- Sales trend chart (Last 30 days)
- Top products widget
- Recent orders list
- Low stock alerts widget
- Quick action buttons
- Business health status
- Calendar view
- Notifications panel
- User profile quick access

---

## Product Management Page

### Product List Page
- Data table with columns (ID, Name, SKU, Category, Price, Stock, Status)
- Search functionality (by name, SKU, barcode)
- Filter options (category, status, price range)
- Sort options (by name, price, stock, date)
- Pagination or infinite scroll
- Bulk action options (delete, archive, export)
- Create new product button
- Edit product (inline or modal)
- Delete product with confirmation
- Product status toggle (active/inactive)
- Export to CSV/Excel

### Product Creation Page
- Product name field
- Description (rich text editor)
- Category selector (hierarchical dropdown)
- Brand selector/input
- Product type selector (simple, variable, bundle, composite)
- SKU field
- Barcode field
- Unit of measure selector
- Visibility toggles (POS, Webstore - webstore excluded)
- Status selector (draft, active, archived)
- Tax classification selector
- Media upload section (images/video)
- Save, Save & continue, Cancel buttons

### Product Edit Page
- All fields from creation page
- Additional fields for tracking (created date, created by, last modified)
- Variant management section (for variable products)
- Pricing section (base price, sale price, cost price)
- Tiered pricing table
- Pricing history view
- Product bundle/composition section (for bundle/composite types)
- Related products section
- Delete product option
- Revision history

---

## Product Category Management Page

### Category List Page
- Category tree view (hierarchical)
- Category table (with nesting indicators)
- Search by category name
- Filter by status
- Create new category button
- Edit category (inline or modal)
- Delete category with child handling
- Reorder categories (drag & drop)
- Category status toggle
- View products in category

### Category Creation Page
- Category name field
- Parent category selector (for subcategories)
- Description (text area)
- Category image upload
- SEO fields (slug, meta title, meta description)
- Display order field
- Status selector
- Active/Inactive toggle
- Save & Continue option

### Category Edit Page
- All creation fields
- View associated products count
- Move to different parent option
- Category hierarchy visualization
- Delete category option

---

## Product Attributes Page

### Attributes List Page
- Attributes table (Name, Type, Group, Options count)
- Search by attribute name
- Filter by attribute type
- Filter by attribute group
- Create new attribute button
- Edit attribute
- Delete attribute
- Bulk delete
- Attribute type indicator (text, number, select, etc.)

### Attribute Creation Page
- Attribute name field
- Attribute type selector (text, number, select, multi-select, boolean)
- Attribute group selector
- Description field
- Is filterable toggle
- Is searchable toggle
- Options input (for select/multi-select types)
  - Option name field
  - Option value field
  - Add more options button
- Save button

### Attribute Edit Page
- All creation fields
- View associated products count
- Option management (add, edit, delete)
- Attribute usage statistics

---

## Inventory Management Page

### Stock Levels Page
- Inventory table (SKU, Product name, Current stock, Reserved, Available, Warehouse)
- Multi-warehouse filter
- Search by product name/SKU
- Filter by status (low stock, out of stock, ok)
- Sort options
- Stock adjustment button (modal to adjust quantities)
- Stock history view (clicking on row)
- Export inventory list
- Bulk stock adjustment

### Stock Adjustment Form
- Product selector
- Warehouse selector
- Current stock display (read-only)
- Adjustment quantity field
- Adjustment reason selector (physical count, damaged, lost, correction)
- Notes field
- Save button

### Stock History View
- Historical stock changes table
- Date, time, quantity changed, reason, user
- Filter by date range
- Filter by transaction type
- Export history

---

## Stock Transfer Page

### Stock Transfer List Page
- Transfer table (From Location, To Location, Date, Quantity, Status)
- Filter by status (pending, in-transit, completed)
- Filter by date range
- Search by product
- Create new transfer button
- View transfer details (modal)
- Edit pending transfers
- Cancel transfer option
- Confirm receipt

### Stock Transfer Creation Page
- Source warehouse/location selector
- Destination warehouse/location selector
- Product selector (with current stock display)
- Quantity field
- Expected delivery date
- Notes field
- Save & Send button

### Stock Transfer Detail View
- Transfer information (ID, dates, quantities)
- Status timeline
- Line items table
- Edit option (if pending)
- Print transfer slip
- Confirm receipt button

---

## Low Stock Alerts Page

### Alerts Dashboard
- Low stock products table (Product, Current stock, Reorder point, Alert level)
- Filter by severity (critical, warning, info)
- Filter by category
- Search by product name
- Create PO button (quick action)
- Dismiss alert option
- Alert history link
- Auto-reorder suggestions

### Alert Settings Page
- Low stock threshold percentage/quantity selector
- Reorder point configuration
- Alert notification preferences
- Email alerts toggle
- In-app alerts toggle
- SMS alerts toggle (if enabled)
- Recipient configuration

---

## Orders Management Page

### Orders List Page
- Orders table (Order ID, Customer, Date, Total, Status, Actions)
- Filter by status (pending, confirmed, processing, shipped, delivered)
- Filter by date range
- Filter by payment status
- Search by order ID or customer name
- Sort options
- Create new order button
- View order details
- Edit order (if pending)
- Cancel order
- Print order/receipt
- Export orders list

### Order Creation/Edit Page
- Order date (auto-populated)
- Customer selector (with quick create option)
- Order line items section
  - Product selector
  - Quantity field
  - Unit price
  - Discount field
  - Tax field
  - Line total (auto-calculated)
  - Add more items button
  - Remove item button
- Subtotal (auto-calculated)
- Tax total (auto-calculated)
- Discount (order-level)
- Grand total (auto-calculated)
- Payment method selector
- Shipping address selector/input
- Billing address selector/input
- Order notes field
- Save button

### Order Detail View
- Complete order information
- Customer information (with link to profile)
- Line items table
- Timeline view (order status changes)
- Payment details
- Shipping details
- Order notes
- Print invoice button
- Edit order (if editable)
- Create shipment button
- Create return button

---

## Quote Management Page

### Quotes List Page
- Quotes table (Quote ID, Customer, Date, Amount, Validity, Status)
- Filter by status (draft, sent, accepted, rejected, expired)
- Filter by date range
- Search by quote ID or customer
- Create new quote button
- View quote details
- Edit quote (if draft)
- Send quote (changes status to sent)
- Delete quote
- Convert to order
- Print quote

### Quote Creation Page
- Quote number (auto-generated)
- Quote date (auto-populated)
- Validity period selector
- Customer selector
- Line items section (similar to orders)
- Quote template selector (optional)
- Customer-specific pricing note
- Notes field
- Terms & conditions section
- Save as draft button
- Save & send button

### Quote Detail View
- Full quote details
- Validity countdown timer
- Customer response status
- Convert to order button
- Send reminder option
- Resend quote button
- Edit quote (if draft)
- Print quote PDF

---

## Invoice Management Page

### Invoices List Page
- Invoices table (Invoice #, Order ID, Customer, Date, Amount, Tax, Total, Status)
- Filter by status (draft, sent, paid, partially paid, overdue)
- Filter by date range
- Search by invoice number
- Create invoice button (from unpaid orders)
- View invoice details
- Edit invoice (if draft)
- Send invoice (via email)
- Mark as paid/partially paid
- Refund option
- Print invoice
- Export invoices

### Invoice Creation Page
- Invoice number (auto-generated)
- Invoice date (auto-populated)
- Due date selector
- Customer selector
- Order selector (pre-fill items)
- Line items table
  - Description
  - Quantity
  - Unit price
  - Discount
  - Tax
  - Amount
- Subtotal (auto)
- Tax breakdown
- Discount (order-level)
- Total (auto)
- Bank details section
- Notes/Terms section
- Save as draft button
- Save & send button

### Invoice Detail View
- Complete invoice display
- Payment status indicator
- Payment history
- Mark as paid/partially paid
- Record payment button
- Print invoice PDF
- Email invoice button
- Edit invoice (if draft)
- Refund invoice option

---

## POS Terminal Interface

### Main POS Screen
- Product search bar (barcode scan, SKU, product name)
- Quick product buttons grid (configurable)
- Shopping cart display (right panel or bottom)
  - Line items (product, qty, price)
  - Quantity adjust (+/- buttons)
  - Remove item button
  - Subtotal display
  - Discount field
  - Tax display
  - Grand total (large display)
- Customer information section (optional)
- Payment method selector
- Complete sale button
- Cancel/Clear cart button
- Offline mode indicator
- Sync status indicator

### Cart Detail View
- Full shopping cart items
- Edit quantities
- Apply discounts (item-level, order-level)
- Apply custom price override (if enabled)
- Customer notes
- Proceed to payment button

### Payment Section
- Payment method selector (Cash, Card, Check, Store Credit, etc.)
- Amount tendered field (for cash)
- Change calculation (auto)
- Card payment trigger (if integrated)
- Complete payment button
- Payment confirmation

### Receipt Display
- Receipt preview
- Print button
- Email receipt button
- SMS receipt button
- Save receipt option
- Return to cart button

---

## POS Shift Management

### Shift Open Page
- Cashier name (auto-populated)
- Opening date/time
- Shift start time
- Opening cash amount field
- Notes field
- Confirm open shift button
- Previous shift info (reference)

### Shift Close Page
- Shift summary information
- Total sales count
- Total cash received
- Total card transactions
- Discounts given
- Refunds processed
- Net sales
- Closing cash amount field
- Cash variance display
- Variance reason selector (if variance exists)
- Complete shift button
- Print shift summary

### Shift Summary Report
- Cashier information
- Shift date/time
- Opening balance
- Total transactions
- Total sales
- Payment method breakdown
- Discounts
- Refunds
- Closing balance
- Variance amount
- Print button
- Email report option

---

## Customer Management Page

### Customers List Page
- Customers table (ID, Name, Phone, Email, Total purchases, Last purchase, Status)
- Search by name, email, phone
- Filter by status (active, VIP, inactive)
- Filter by registration date range
- Filter by purchase frequency
- Sort options
- Create new customer button
- View customer profile
- Edit customer
- Delete customer (with safety confirmation)
- Bulk import customers
- Export customers list
- Customer segmentation view

### Customer Creation Page
- First name field
- Last name field
- Email field
- Phone field
- Customer type selector (individual, corporate)
- Business name (if corporate)
- Address fields (street, city, postal code)
- Tax ID/VAT number (optional)
- Customer notes field
- Credit limit field
- Status selector
- Save button

### Customer Edit Page
- All creation fields
- Additional information section
  - Multiple addresses management
  - Contact persons (for corporate)
  - Payment terms
  - Bank account details
  - Preferred payment method
- View purchase history link
- View loyalty points
- Merge with another customer option (if duplicates)

---

## Customer Profile Page

### Profile Overview
- Customer basic info (name, contact, address)
- Contact information (email, phone, multiple addresses)
- Customer status
- Loyalty tier/points display
- Credit limit & usage
- Total purchase value
- Last purchase date
- Edit profile button

### Purchase History Tab
- Orders table (Order ID, Date, Items count, Total, Status)
- Filter by date range
- Filter by status
- Total spend
- View order details button
- Reorder option

### Loyalty & Credits Tab
- Loyalty points balance
- Points history (earn/redeem)
- Store credit balance
- Store credit transactions history
- Loyalty tier information
- Tier benefits display

### Communication Tab
- Email history
- SMS history
- WhatsApp history (if enabled)
- Notification preferences
- Unsubscribe options

### Notes Tab
- Internal notes (staff only)
- Add note button
- Notes history with timestamps

---

## Vendor Management Page

### Vendors List Page
- Vendors table (Name, Contact, Email, Phone, Total purchases, Status)
- Search by vendor name, contact person
- Filter by status (active, verified, pending, inactive)
- Filter by category
- Create new vendor button
- View vendor details
- Edit vendor
- Delete vendor
- Bulk import vendors
- Export vendors list
- Preferred vendors view

### Vendor Creation Page
- Company name field
- Contact person name field
- Email field
- Phone field
- Address fields
- Tax ID/VAT number
- Bank account details
- Payment terms selector
- Verification status
- Notes field
- Preferred vendor toggle
- Status selector
- Save button

### Vendor Edit Page
- All creation fields
- Multiple contact persons section
- Multiple delivery addresses section
- Payment history link
- Bill history link
- Vendor performance metrics
- Merge with another vendor option

---

## Purchase Orders Page

### Purchase Orders List Page
- POs table (PO #, Vendor, Date, Amount, Status, Expected delivery)
- Filter by status (draft, sent, confirmed, received, invoiced)
- Filter by date range
- Filter by vendor
- Search by PO number or vendor name
- Create new PO button
- View PO details
- Edit PO (if draft/confirmed)
- Send PO (email)
- Cancel PO
- Receive goods button
- Print PO
- Export POs

### Purchase Order Creation Page
- PO number (auto-generated)
- PO date (auto-populated)
- Vendor selector
- Expected delivery date
- Line items section
  - Product selector
  - Quantity field
  - Unit cost
  - Discount
  - Tax
  - Line total
- Subtotal (auto)
- Tax (auto)
- Discount
- Grand total (auto)
- Shipping address selector
- Payment terms selector
- Notes field
- Save as draft button
- Save & send button

### Purchase Order Detail View
- Full PO information
- Vendor details (with contact info)
- Line items table
- Status timeline
- Expected delivery countdown
- Receive goods section (when confirmed)
- Received quantity input per item
- Overages/shortages handling
- Complete receipt button
- Create bill button (upon completion)
- Edit PO (if editable)
- Cancel PO option

---

## Vendor Bills Page

### Bills List Page
- Bills table (Bill #, PO #, Vendor, Date, Amount, Status, Due date)
- Filter by status (draft, submitted, paid, partially paid, overdue)
- Filter by date range
- Filter by vendor
- Search by bill number
- Create new bill button
- View bill details
- Edit bill (if draft)
- Record payment button
- Create refund
- Print bill
- Export bills

### Bill Creation Page
- Bill number (auto-generated or manual)
- Bill date (auto-populated)
- Vendor selector
- PO selector (optional, to auto-fill items)
- Due date
- Line items section
  - Description
  - Quantity
  - Unit cost
  - Discount
  - Tax
  - Amount
- Subtotal (auto)
- Tax (auto)
- Discount
- Grand total (auto)
- Payment terms
- Notes field
- Save as draft button
- Submit bill button

### Bill Detail View
- Complete bill information
- Vendor information
- Line items table
- Amount reconciliation with PO (if from PO)
- Payment status
- Payment history
- Record payment button
- Partial payment option
- Create refund button
- Edit bill (if draft)

---

## Employee Management Page

### Employees List Page
- Employees table (ID, Name, Email, Phone, Department, Designation, Status)
- Search by name, email, employee ID
- Filter by status (active, inactive, terminated)
- Filter by department
- Filter by designation
- Sort options
- Create new employee button
- View employee profile
- Edit employee
- Terminate employee
- Bulk import employees
- Export employees list

### Employee Creation Page
- Employee ID (auto-generated or manual)
- First name field
- Last name field
- Email field
- Phone field
- Date of birth
- Gender selector
- Marital status (optional)
- National ID (NIC)
- Address fields
- Department selector
- Designation selector
- Manager selector
- Employment type selector (full-time, part-time, contract)
- Date of hire
- Bank account details
- Emergency contact information
- Document upload section
- Employment status selector
- Save button

### Employee Edit Page
- All creation fields
- Employment history section
- Salary history section
- Position change history
- Leave balance display
- Attendance stats
- Document management
- Termination details (if terminated)

---

## Department & Organizational Structure

### Department Management Page
- Department tree view (hierarchical)
- Department table
- Create new department button
- Edit department
- Delete department (with child handling)
- Reorder departments (drag & drop)
- View department employees count
- Department manager assignment
- View employees in department

### Department Creation Page
- Department name field
- Parent department selector
- Manager selector (employee)
- Budget allocation (optional)
- Description field
- Status selector
- Save button

### Organization Chart View
- Hierarchical visual chart
- Department boxes with employee counts
- Expandable/collapsible nodes
- Manager names display
- Drill-down to employee list
- Print org chart

---

## Attendance Management Page

### Attendance List Page
- Attendance table (Employee, Date, Check-in, Check-out, Status, Work hours)
- Employee selector/filter
- Date range filter
- Status filter (present, absent, late, half-day)
- Search by employee name
- Manual attendance entry button
- Bulk attendance import
- Export attendance
- View employee attendance summary

### Attendance Entry Page
- Employee selector
- Date selector
- Clock in time picker
- Clock out time picker
- Status selector
- Work hours (auto-calculated)
- Overtime hours display
- Notes field
- Save button

### Attendance Summary
- Calendar view of attendance
- Status indicators by day
- Total present days
- Total absent days
- Late arrivals count
- Early departures count
- Total work hours
- Overtime hours
- Attendance rate percentage

---

## Leave Management Page

### Leave Requests List Page
- Leave requests table (Employee, Start date, End date, Type, Days, Status)
- Filter by status (pending, approved, rejected)
- Filter by leave type
- Filter by date range
- Employee filter
- Search by employee name
- Approve request button
- Reject request button
- View leave details
- Edit pending request
- Cancel approved leave

### Leave Request Creation Page
- Employee selector (or self if employee)
- Leave type selector (annual, casual, sick, maternity, etc.)
- Start date picker
- End date picker
- Duration in days (auto-calculated)
- Available leave balance display
- Reason/description field
- Document upload (for sick leave, etc.)
- Submit request button

### Leave Calendar View
- Calendar display of all leave
- Employee filter
- Color-coded leave types
- Month/quarter/year view
- Drill-down to leave details
- Leave balance summary per employee

### Leave Settings Page
- Leave type configuration
  - Leave type name
  - Annual allocation days
  - Carry-over rules
  - Max carry-over days
- Public holiday calendar
- Leave year start date
- Approval workflow configuration

---

## Salary Structure Page

### Salary Structure List Page
- Salary structures table (Employee, Basic, Allowances, Deductions, Gross)
- Employee filter
- Department filter
- Search by employee
- Create new structure button
- View structure details
- Edit structure
- Duplicate structure
- Effective date tracking

### Salary Structure Creation Page
- Employee selector
- Effective date selector
- Basic salary field
- Allowances section
  - Allowance type selector (house rent, transport, etc.)
  - Amount field
  - Add more allowances button
- Deductions section
  - Deduction type selector (EPF, ETF, tax, insurance, etc.)
  - Amount field (manual or percentage)
  - Add more deductions button
- Gross salary display (auto-calculated)
- Notes field
- Save button

### Salary Structure Detail View
- Complete structure breakdown
- Visual breakdown chart
- Effective date
- Change history
- Edit structure (new version)
- Archive/deactivate option

---

## Payroll Processing Page

### Payroll Runs List Page
- Payroll runs table (Period, Status, Total employees, Total payroll, Date processed)
- Filter by status (draft, processed, approved, finalized)
- Filter by period
- Create new payroll run button
- View payroll details
- Edit payroll (if draft)
- Approve payroll
- Finalize payroll
- Undo payroll (if allowed)
- Print payroll summary

### Payroll Run Creation Page
- Payroll period selector (month/year)
- Payroll run date
- Employee filter (process selected employees)
- Attendance data verification
- Leave data verification
- Manual adjustments section
  - Employee selector
  - Adjustment type (bonus, penalty, etc.)
  - Amount field
  - Reason
- Generate payroll button
- Preview payroll (draft state)
- Save as draft button

### Payroll Preview
- Payroll table with all employees
- Employee name, ID
- Basic salary
- Allowances breakdown
- Deductions breakdown (EPF, ETF, PAYE tax)
- Gross salary
- Net salary
- Edit individual payroll (modal)
- Approve all button
- Back to edit button

---

## Payslip Page

### Payslips List Page
- Payslips table (Employee, Period, Gross, Deductions, Net)
- Employee filter
- Period filter
- Status filter (draft, finalized, sent)
- Search by employee
- View payslip
- Email payslip button
- Download payslip PDF
- Bulk email payslips
- Bulk download as ZIP
- Resend payslip

### Payslip Detail View
- Employee information
- Payroll period
- Detailed earnings table
  - Basic salary
  - Allowances (itemized)
  - Gross salary
- Detailed deductions table
  - EPF employee contribution
  - ETF contribution
  - PAYE tax
  - Insurance
  - Other deductions
  - Total deductions
- Net salary
- YTD (year-to-date) information
- Employer contributions (reference, not paid by employee)
- Bank details (where salary was deposited)
- Notes section
- Print button
- Email button
- Download PDF button

---

## Chart of Accounts Page

### Accounts List Page
- Accounts tree view (hierarchical by account type)
- Accounts table (Code, Name, Type, Category, Balance)
- Filter by account type (asset, liability, equity, income, expense)
- Filter by status (active, inactive)
- Search by account name/code
- Create new account button
- View account details
- Edit account
- Archive account
- View transactions for account
- Account balance display

### Account Creation Page
- Account code field
- Account name field
- Account type selector (asset, liability, equity, income, expense)
- Sub-account category selector
- Account description
- Opening balance field
- Status selector (active, inactive)
- Tax category (optional)
- Save button

### Account Detail View
- Account information
- Account balance (current)
- Opening balance
- Account transactions (recent)
- Account ledger link
- Edit account
- Archive account option

---

## Journal Entries Page

### Journal Entries List Page
- Journal entries table (Entry #, Date, Description, Amount, Status)
- Filter by status (draft, posted, reversed)
- Filter by date range
- Filter by source (manual, automatic)
- Search by entry number or description
- Create new entry button
- View entry details
- Edit entry (if draft)
- Post entry button
- Reverse entry button
- Delete entry (if draft)
- Export entries
- Print entry

### Journal Entry Creation Page
- Entry number (auto-generated or manual)
- Entry date
- Description field
- Line items section
  - Account selector
  - Debit amount
  - Credit amount
- Debit/Credit balance validation
- Reference/document attachment
- Memo field
- Save as draft button
- Save & post button

### Journal Entry Detail View
- Entry header (number, date, description)
- Line items table (account, debit, credit)
- Total debits and credits (must match)
- Status indicator
- Posted date/user (if posted)
- Edit entry (if draft)
- Post entry (if draft)
- Reverse entry (if posted)
- Print entry

---

## Bank Reconciliation Page

### Reconciliation List Page
- Reconciliations table (Account, Period, Status, Variance)
- Filter by status (pending, reconciled, discrepancies)
- Filter by account
- Filter by period
- Create new reconciliation button
- View reconciliation details
- Edit reconciliation (if pending)
- Approve reconciliation
- Export reconciliation

### Reconciliation Detail View
- Bank account selection
- Statement period (from/to dates)
- Statement opening balance
- Statement closing balance
- Book balance (from ledger)
- Outstanding checks list
  - Check number
  - Check date
  - Amount
  - Outstanding since
  - Mark as cleared button
- Outstanding deposits list
  - Deposit date
  - Amount
  - Outstanding since
  - Mark as cleared button
- Reconciled balance display
- Variance amount (if any)
- Variance investigation section
- Mark as reconciled button
- Save reconciliation

---

## Financial Reports Page

### Reports List Page
- Available reports list (P&L, Balance Sheet, Cash Flow, Trial Balance, etc.)
- Generate report button for each
- Recent reports history
- Scheduled reports
- Saved report templates

### Report Generation Page (P&L Statement)
- Period selector (start date, end date)
- Comparison period selector (optional)
- Department filter (optional)
- Cost center filter (optional)
- Include sub-accounts toggle
- Include budget comparison toggle
- Report format selector (summary, detailed)
- Generate report button

### P&L Statement Report View
- Report header (company name, period, generated date)
- Revenue section (itemized by account)
  - Total revenue
- Cost of goods sold section
  - Total COGS
- Gross profit
- Operating expenses section (itemized)
  - Total operating expenses
- Operating income
- Other income/expenses
- Income before tax
- Tax expense
- Net income
- YTD comparison (if selected)
- Print button
- Export to PDF button
- Export to Excel button

### Balance Sheet Report View
- Report header
- Assets section
  - Current assets (itemized)
  - Fixed assets (itemized)
  - Other assets (itemized)
  - Total assets
- Liabilities section
  - Current liabilities (itemized)
  - Long-term liabilities (itemized)
  - Total liabilities
- Equity section
  - Retained earnings
  - Contributed capital
  - Total equity
- Total liabilities & equity (must equal assets)
- Comparison with prior period
- Print button
- Export buttons

### Other Reports
- Cash Flow Statement
- Trial Balance
- General Ledger
- Account Statement
- Financial Ratio Analysis

---

## Sales Analytics Dashboard

### Dashboard Overview
- Revenue by period chart (line/bar chart, last 12 months)
- Sales by product category pie chart
- Top 10 products by revenue table
- Sales by customer segment chart
- Sales trend indicator (up/down percentage)
- Average order value card
- Total orders card
- Period selector (custom date range)

### Detailed Sales Analytics
- Revenue trends with multiple comparison options
- Sales by customer (top customers table)
- Sales by product (product sales table)
- Sales by category (category breakdown)
- Repeat customer analysis
- New customer analysis
- Sales forecast vs actual comparison
- Regional/territory analysis (if applicable)
- Export data button

---

## Inventory Analytics Dashboard

### Dashboard Overview
- Inventory value chart (total, by category)
- Stock turnover ratio
- Low stock products count
- Out of stock count
- Dead stock value
- Stock movement chart (in/out by period)
- Reorder point analysis

### Detailed Inventory Analytics
- Stock movement report (in/out transactions)
- Slow-moving products table
- Dead stock items (no movement in X days)
- Fast-moving products
- Inventory aging report
- Stock level vs reorder point analysis
- Warehouse stock comparison
- Inventory accuracy/discrepancy report
- Export report

---

## Financial Analytics Dashboard

### Dashboard Overview
- Revenue trend (last 12 months)
- Expense trend (last 12 months)
- Profit margin percentage
- Cash position indicator
- Outstanding receivables amount
- Outstanding payables amount
- Gross margin by product

### Detailed Financial Analytics
- Revenue vs expense comparison
- Profit & loss trend
- Expense breakdown by category
- Cash flow analysis
- Receivables aging (overdue invoices)
- Payables aging (overdue bills)
- Asset turnover ratio
- Return on investment
- Export financial data

---

## Customer Analytics Dashboard

### Dashboard Overview
- Total customers count
- New customers (this month)
- Repeat customers count
- Customer lifetime value average
- Customer segmentation pie chart (by value)
- Purchase frequency distribution
- Churn rate indicator

### Detailed Customer Analytics
- Customer lifetime value ranking (top customers)
- Customer segmentation analysis
- Repeat purchase analysis
- Customer acquisition cost (if tracked)
- Churn risk customers (predicted)
- Customer behavior segmentation
- RFM analysis (Recency, Frequency, Monetary)
- Export customer data

---

## Business KPI Dashboard

### Executive Summary Cards
- Total Revenue (period selector)
- Net Profit (period selector)
- Profit Margin %
- Total Orders
- Average Order Value
- Customer Count
- Inventory Turnover
- Days of Inventory Outstanding
- Cash Position
- Outstanding Receivables
- Outstanding Payables
- Employee Count

### KPI Charts
- Revenue trend (last 12 months with forecast)
- Net profit trend
- Order count trend
- Key ratios dashboard (liquidity, efficiency, profitability)
- Business health score
- Period comparison selector
- Export KPIs

---

## Settings Page

### General Settings Tab
- Business name field
- Business address fields
- Business phone field
- Business email field
- Business registration number
- Tax ID/VAT number
- Business logo upload
- Currency selector
- Timezone selector
- Date format selector
- Time format selector
- Fiscal year start date

### Financial Settings Tab
- Tax configuration (VAT/SVAT rate)
- Tax compliance settings
- Accounting method selector (cash/accrual)
- Financial period configuration
- Default tax category
- Rounding rules
- Currency configuration

### Module Settings Tab
- Enable/disable modules (products, inventory, sales, POS, HR, etc.)
- Module-specific configurations
- Feature toggles

### Notification Settings Tab
- Email notifications toggle (and recipients)
- SMS notifications toggle
- In-app notifications toggle
- WhatsApp notifications toggle
- Notification frequency settings
- Notification scheduling

### Integration Settings Tab
- Payment gateway configuration (PayHere, WebXPay, KOKO)
- Shipping provider configuration (Koombiyo, Domex)
- Email service configuration
- SMS service configuration
- WhatsApp service configuration
- Third-party API integrations

---

## User Management Page

### Users List Page
- Users table (Name, Email, Role, Status, Last login)
- Search by name/email
- Filter by role
- Filter by status (active, inactive)
- Create new user button
- View user details
- Edit user
- Deactivate/activate user
- Reset password button
- Delete user
- Bulk invite users

### User Creation Page
- Name field
- Email field
- Role selector (super admin, tenant admin, manager, staff)
- Department selector (if applicable)
- Status selector
- Send invitation toggle
- Save button

### User Edit Page
- All creation fields
- Change password option
- Two-factor authentication toggle
- Login history
- Reset all settings button
- Delete user option

---

## Tenant Configuration Page

### Tenant Settings Tab
- Tenant name field
- Tenant domain (read-only)
- Custom domain input (if allowed)
- Tenant logo upload
- Tenant theme color selector
- Tenant timezone
- Tenant currency
- Language preference

### Subscription & Billing Tab
- Current plan display
- Plan features list
- Billing cycle information
- Payment method on file
- Billing address
- Upgrade plan button
- View invoices link
- Cancel subscription button
- Stripe payment integration (for subscriptions)

### Features & Modules Tab
- Available features list (with checkmarks if enabled)
- Plan comparison
- Feature limitation display (if applicable)
- Enable/disable modules (within plan limits)
- Add-on purchases

---

## Receipt Printing & Email

### Receipt Configuration Page
- Receipt format selector (thermal 80mm/58mm, PDF, email)
- Receipt template editor
- Header customization (logo, business name, address)
- Footer customization (return policy, message)
- Field visibility toggle (each field)
- Company details section
- Save template button

### Receipt Preview & Send
- Receipt preview on screen
- Print button (to thermal printer or PDF)
- Email receipt button
  - Customer email auto-populated
  - Subject line
  - Message body
  - Send button
- SMS receipt button (if enabled)
- WhatsApp receipt button (if enabled)
- Save receipt option

---

## Document Generator (Invoices, POs)

### Document Template Management
- Template list (invoices, POs, quotes, delivery notes)
- Create new template button
- Edit template
- Delete template
- Template preview
- Template variables reference

### Document Customization Page
- Logo upload section
- Company details section
- Color scheme selection
- Font selection
- Field visibility toggle
- Conditional fields (based on document type)
- Custom message fields
- Terms & conditions section
- Footer section
- Print preview
- Save template button

### Document Generation
- Document type selector
- Recipient/subject selection
- Template selector
- Generate document button
- Document preview
- Print button
- Email button
- Download PDF button
- Save as template option

---

## Payment Processing Page

### Payment Methods Configuration
- Enabled payment methods list
- Payment gateway configurations
  - PayHere setup (merchant ID, secret key)
  - WebXPay setup
  - KOKO/MintPay setup
  - Bank transfer details
  - Cash on delivery settings
- Test/Live mode toggle (per gateway)
- Enable/disable payment method toggle
- Payment method display order (drag & drop)

### Payment Processing Dashboard
- Recent transactions table
- Filter by status (pending, completed, failed, refunded)
- Filter by payment method
- Filter by date range
- View transaction details
- Manual payment entry button
- Refund button
- Export transactions

### Payment Gateway Webhook Configuration
- Webhook URL display (for copy)
- Webhook test button
- Webhook event logs
- Failed webhook retries

---

## Shipping Integration Console

### Shipping Zones Configuration
- Shipping zones map/table
- District-wise zones (Sri Lanka)
- Zone creation wizard
- Shipping rate configuration per zone
- Free shipping threshold configuration
- Enable/disable zones
- Zone-wise courier assignments

### Courier Configuration
- Configured couriers list (Koombiyo, Domex, etc.)
- Courier API credentials configuration
- Courier pickup schedule configuration
- Courier pickup location configuration
- Test API connectivity button

### Shipment Tracking
- Recent shipments table
- Filter by status (pending pickup, in-transit, delivered)
- Filter by courier
- Filter by date range
- View shipment details
- Generate/reprint labels
- Track shipment button (opens tracking page)
- Manual status update

---

## Notification Management Page

### Notification Templates
- Email template list
  - Order confirmation email
  - Invoice email
  - Shipping notification
  - Delivery confirmation
  - Low stock alert
  - And more...
- SMS template list
- WhatsApp template list
- Edit template
- Test send button
- Merge fields reference

### Notification Preferences
- By notification type
  - Recipient configuration
  - Channel selection (email, SMS, WhatsApp, in-app)
  - Enable/disable toggle
  - Frequency configuration
- Scheduled notification times

### Notification Logs
- Sent notifications history
- Filter by type (email, SMS, WhatsApp, in-app)
- Filter by recipient
- Filter by date range
- View notification details (content, status, delivery time)
- Resend failed notifications

---

## API Documentation Interface

### API Explorer
- Interactive API documentation
- Endpoint list (organized by resource)
- Try-it-out feature (make test API calls)
- Authentication token configuration
- Request/response examples
- Error codes reference
- Rate limiting information

### API Keys Management
- API keys list
- Create new API key button
- Revoke API key button
- API key permissions configuration
- Last used date display
- Regenerate API key option

---

## AI Chatbot Interface

### Chatbot Widget
- Chat widget (floating corner)
- Chat window (expandable)
- Message input field
- Send button
- Typing indicator
- Message history display
- Quick reply buttons (predefined responses)
- Escalate to human support button
- Chat transcript download

### Chatbot Admin Console
- Conversation history
- Filter by customer
- Filter by date range
- View conversation details
- Mark conversation as resolved
- Add internal notes
- Chatbot training data management
- Fallback responses configuration

---

## Smart Search Interface

### Smart Search Bar
- Auto-complete suggestions (as user types)
- Search by product name, SKU, barcode
- Search history display
- Recent searches
- Fuzzy search handling (typo tolerance)
- Search filters (by category, price range, etc.)
- Search button
- Advanced search link

### Search Results Page
- Results list (products, orders, customers, etc.)
- Result type indicators
- Sorting options (relevance, popularity, price, date)
- Filter options (category, status, etc.)
- Pagination
- No results message with suggestions

---

## Recommendation Engine Console

### Recommendations Configuration
- Enable/disable recommendations
- Recommendation type settings
  - "Frequently bought together" algorithm config
  - "Similar products" config
  - "Personalized for you" config
  - "Trending now" config
- Number of recommendations display
- Update frequency configuration
- Test recommendation engine button

### Recommendations Analytics
- Recommendation performance metrics
  - Click-through rate
  - Conversion rate
  - Revenue generated
- Recommendation click logs
- Top recommended products
- A/B testing results (if enabled)

---

## Multi-Tenancy Management (Admin)

### Tenants List Page
- Tenants table (ID, Name, Domain, Plan, Status, Created date)
- Search by tenant name
- Filter by plan
- Filter by status
- Create new tenant button
- View tenant details
- Edit tenant
- Deactivate/activate tenant
- Reset tenant data option (caution)
- View tenant usage

### Tenant Detail View
- Tenant information
- Subscription details
- Usage statistics (users, data volume, etc.)
- Feature usage
- Domain configuration
- Billing history link
- Support tickets link
- Upgrade/downgrade plan button
- Edit tenant information button

---

## Summary

**Total Feature Pages/Modules: 47**

| Category | Count |
|----------|-------|
| Authentication | 4 |
| Dashboard | 1 |
| Products | 3 |
| Inventory | 3 |
| Orders & Quotes | 4 |
| POS | 2 |
| Customers | 3 |
| Vendors | 3 |
| HR | 6 |
| Accounting | 4 |
| Analytics | 4 |
| Admin Settings | 6 |
| Documents | 2 |
| Integrations | 3 |
| AI Features | 3 |
| **Total** | **47 Pages/Modules** |

---

## Implementation Notes

- **Stripe Integration**: Primary payment gateway for subscription management (for future webstore phase)
- **Webstore Excluded**: Storefront pages, customer portal, theme engine, SEO, marketing features excluded per requirements
- **Database**: PostgreSQL with multi-schema isolation for true multi-tenancy
- **Backend**: Django + Django REST Framework
- **Frontend**: Next.js 14+ with React + TypeScript
- **DevOps**: Docker + Docker Compose for development
- **AI/ML**: Integrates scikit-learn, PyTorch, Sentence Transformers for ML features
- **Payment Processing**: PayHere, WebXPay, KOKO, Bank Transfer, COD
- **Shipping**: Koombiyo, Domex integrations

---

**Document Version:** 2.0  
**Last Updated:** May 31, 2026  
**Status:** Final - Feature-Based Organization
