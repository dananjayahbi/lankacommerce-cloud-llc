# Product Creation Page Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned (Enhancement - Existing Endpoint)  
**Priority:** High (Phase 2 Enhancement)  
**Scope:** Wizard-based product creation with variant management, pricing, media, and advanced metadata

---

## 1. Executive Summary

The Product Creation Page is the primary workflow for adding new products to the inventory. The current implementation provides a 3-step wizard (basic info, variants, review) but lacks advanced features such as tiered pricing, product bundles, rich media management, related products, and comprehensive validation with helpful error messages.

This document details comprehensive requirements for an enterprise-grade product creation experience with guided workflows, variant matrix generation, tiered pricing, bundle composition, media management, and intelligent defaults.

---

## 2. Current State Analysis

### 2.1 What Exists
- 3-step product creation wizard
- Step 1: Basic info (name, description, category, brand, gender, tags, tax_rule)
- Step 2: Variants (create multiple variants with sku, barcode, size, colour, pricing, stock)
- Step 3: Review and submit
- POST /api/catalog/products/ endpoint
- Single variant creation per step
- Image URLs (external, not file upload)
- Category/Brand selection with hierarchical dropdown

### 2.2 Critical Gaps & Issues

#### Missing Basic Fields & Options
- No product type selector (simple, variable, bundle, composite)
- No unit of measure selector
- No supplier/vendor field
- No warranty/guarantee info
- No country of origin
- No GTIN/EAN field
- No product code/internal code

#### Missing Variant Management
- No variant matrix generation (e.g., Size × Color grid)
- No bulk variant import
- No variant duplication
- No variant from template
- No variant reordering
- No wholesale price (exists in API but not in UI)
- No variant-specific descriptions
- No variant-specific images
- No variant shipping weight/dimensions

#### Missing Pricing Features
- No tiered pricing (quantity discounts)
- No customer segment pricing
- No MAP (Minimum Advertised Price) configuration
- No automatic margin calculation
- No pricing based on cost + margin formula
- No price comparison with existing products
- No pricing history reference

#### Missing Product Relationships
- No related products (upsell, cross-sell, replacement)
- No product bundles (composite products)
- No product components section
- No bundled product pricing rules
- No kit/package management

#### Missing Media Management
- No file upload capability (uses external URLs only)
- No image organization (gallery)
- No image cropping/editing
- No image alt text/description
- No product video/demo link
- No video thumbnail generation
- No image optimization
- No bulk image upload

#### Missing Metadata & Classification
- No product attributes (custom fields)
- No product compliance tags (organic, vegan, fair-trade, etc.)
- No product certifications
- No supplier certification tracking
- No product collections/groups
- No product ranking/featured toggle
- No product reviews/ratings display

#### Missing Advanced Features
- No product preview (how it will look in store)
- No duplicate product option
- No save as draft (always requires full variant)
- No auto-save functionality
- No product versioning/revision tracking
- No template-based creation
- No bulk import from CSV
- No product recommendations during creation

#### User Experience Issues
- No contextual help/tooltips
- No field validation with helpful error messages
- No progress indicator showing step progress
- No save progress option
- No unsaved changes warning
- No related field suggestions (e.g., suggest category based on name)
- No autocomplete for product names (prevent duplicates)
- No comparison with existing similar products
- No mobile-optimized wizard flow

#### Data & Performance Issues
- No auto-generation of SKU based on rules
- No automatic barcode generation
- No duplicate product detection
- No data quality validation
- No batch variant creation optimization

---

## 3. Detailed Requirements

### 3.1 Frontend - Product Creation Wizard

#### 3.1.1 Page Header & Navigation

**Wizard Header**
- Page title: "Create New Product" or "Add Product to Catalog"
- Progress indicator showing current step (e.g., "Step 1 of 4")
- Step labels (Basic Information, Variants, Media & Details, Review & Publish)
- Breadcrumb navigation showing completed steps

**Navigation Controls**
- Previous button (disabled on step 1)
- Next button (enabled if step validation passes)
- Save as Draft button (optional, for incomplete products)
- Cancel button (with unsaved changes warning)
- Keyboard shortcuts (ESC to cancel, Ctrl+Enter to submit)

**Validation & Error Handling**
- Real-time field validation
- Error messages below each field (red text)
- Form-level error summary at top (highlighting all issues)
- Field-level required indicator (asterisk)
- Helpful inline hints for complex fields

#### 3.1.2 Step 1: Basic Information

**Core Product Information Section**
- Product Name field (text input, max 500 characters)
  - Character counter (e.g., "45/500")
  - Duplicate name detection (suggest existing product)
  - Auto-focus on page load
- Product Description field (rich text editor)
  - Formatting options (bold, italic, bullet points, links)
  - Character count (e.g., "250/5000")
  - Preview mode toggle
  - Spell check
- Product Type selector (radio buttons or tabs)
  - Simple product (single variant)
  - Variable product (multiple variants with attributes)
  - Bundle product (composite from other products)
  - Service (no physical product)

**Categorization**
- Category selector (hierarchical dropdown or tree view)
  - Collapsible tree showing all categories
  - Search within categories
  - Breadcrumb showing selected path
  - Required field
- Brand selector (dropdown or autocomplete)
  - Option to create new brand (quick add)
  - Brand logo display
  - Optional field
- Tags input (multi-select autocomplete)
  - Predefined tag suggestions
  - Create new tag option
  - Tag autocomplete based on existing
  - Help text: "Add tags for better searchability" (e.g., seasonal, trending, best-seller)

**Product Classification**
- Gender selector (dropdown: Men, Women, Unisex, Kids, Other)
  - Visual icons per gender
- Tax Rule selector (dropdown: Standard VAT, Reduced VAT, Zero Rated, Exempt)
  - Help text explaining VAT implications
- Unit of Measure selector (dropdown: Piece, Kg, Liter, Meter, etc.)
  - Option to define custom UOM
  - Affects inventory tracking and pricing

**Advanced Classification (Collapsible Section)**
- Product Code field (optional, e.g., internal product ID)
- GTIN/EAN field (barcode number for standardization)
- Country of Origin selector (dropdown with common countries)
- Warranty/Guarantee selector (dropdown: None, 1 year, 2 years, Lifetime)
- Compliance Tags (multi-select: Organic, Vegan, Eco-friendly, Fair-trade)
- Product Collections (multi-select: New arrivals, Best sellers, On sale)

**Supplier Information (Collapsible Section)**
- Preferred Supplier selector (dropdown from vendor list)
  - Shows supplier contact info on selection
- Supplier Product Code field (how supplier identifies this product)
- Supplier Lead Time field (days to receive from supplier)
- Minimum Order Quantity field (MOQ for this supplier)

**Next Button Validation**
- Product name is required and not empty
- Category is selected
- Product type is selected
- At least one variant will be created (proceed to step 2)

#### 3.1.3 Step 2: Variants & Pricing

**Variant Management Header**
- Variant count badge (e.g., "3 variants")
- Add Variant button
- Import Variants button (CSV or template)
- Generate Variant Matrix button (for variable products)

**Variant Matrix Generator (Popup Modal)**
- Attribute selection (Size: S, M, L, XL; Color: Red, Blue, Green)
- Generate button (creates matrix of all combinations)
- Price configuration section
  - Base retail price (applied to all variants)
  - Base cost price
  - Base wholesale price
  - Automatic calculation option (e.g., retail = cost * 1.5)
- Stock configuration
  - Base stock quantity for all variants
  - Low stock threshold

**Variant List Table**
- Columns: SKU, Barcode, Size, Color, Cost Price, Retail Price, Wholesale Price, Stock, Actions
- Each variant is a row with:
  - Edit button (opens variant detail form)
  - Duplicate button (clones variant with new SKU)
  - Delete button (with confirmation)

**Variant Detail Form (Modal or Drawer)**
- SKU field (required, must be unique per tenant)
  - Auto-suggestion based on pattern (if configured)
  - Validation for uniqueness
- Barcode field (optional, must be unique per tenant if provided)
  - Barcode format validation
  - Barcode scanner simulator (for testing)
- Attribute fields (Size, Color, etc.)
  - Dropdown selectors matching product type
- Pricing section
  - Cost Price field (required, visible to admin only in UI)
  - Retail Price field (required)
  - Wholesale Price field (optional)
  - Markup % display (auto-calculated: (retail - cost) / cost * 100)
  - Profit margin display
- Stock section
  - Stock Quantity field (default 0)
  - Low Stock Threshold field (default 5)
  - Reorder Point field (optional)
- Variant-specific Description field (optional, overrides product description)
- Variant-specific Images field (optional, overrides product images)
- Save Variant button

**Variant Creation Options**
- Create Single Variant button (expand form below table)
- Import Variants from CSV (upload file with columns: sku, barcode, size, colour, cost_price, retail_price, wholesale_price, stock)
- Import from Template (select existing product to copy variants)
- Clone Variant (duplicate selected variant, auto-increment SKU)

**Pricing Helpers**
- Cost + Margin calculator (input cost and margin %, auto-fill retail)
- Bulk Price Update (apply same cost/retail to all variants)
- Copy Prices from Template (select existing product to match pricing)

**Minimum Variant Requirements**
- At least 1 variant required to proceed

#### 3.1.4 Step 3: Media & Details

**Media Section**
- Product Image Gallery
  - Image upload area (drag & drop or file picker)
  - Accepts: JPG, PNG, WebP (max 5MB per image)
  - Maximum 10 images per product
  - Uploaded images appear in gallery with preview
  - Reorder images (drag & drop)
  - Delete image (trash icon)
  - Set primary image (radio button)
  - Image optimization notice (auto-compresses large images)
- Image Alt Text fields (for accessibility and SEO)
  - One alt text field per image
- Product Video field (optional)
  - YouTube/Vimeo URL input
  - Video thumbnail preview
  - Duration display
- 360 View or AR (future, placeholder)

**Product Relationships Section (Collapsible)**
- Related Products section
  - Add related product button (opens search dialog)
  - Relationship type selector (Upsell, Cross-sell, Replacement)
  - Related products table (product name, relationship type, remove button)
  - Max 10 related products recommended
- Frequently Bought Together section (auto-generated after first sale)
  - Readonly during creation

**Product Bundles Section (If Product Type = Bundle)**
- Component Products table
  - Product selector (search/autocomplete)
  - Quantity field (how many of this product in bundle)
  - Price field (optional, auto-calculates from components)
  - Remove button
- Add Component button (add more products to bundle)
- Bundle pricing rule selector
  - Auto-calculate from components
  - Fixed price (discount from component total)
  - Discount percentage
- Bundle visualization (tree view of included products)

**SEO Section (Collapsible)**
- URL Slug field (auto-generated from product name, editable)
  - Slug preview (how it appears in URLs)
  - Validation (lowercase, hyphens, no special chars)
- Meta Title field (default: product name, max 60 characters)
  - Character counter
- Meta Description field (max 160 characters)
  - Character counter
  - Preview in search results
- SEO Score indicator (0-100, shows optimization suggestions)

**Attributes Section (Collapsible)**
- Custom Attributes (if configured by tenant)
  - Dynamic fields based on tenant's attribute setup
  - E.g., Material, Style, Size Guide, Fit, etc.

**Next Button Validation**
- At least one image recommended (warning only)
- Required fields completed
- Proceed to review

#### 3.1.5 Step 4: Review & Publish

**Review Summary Cards**
- Basic Information Card
  - Product name, category, brand, description preview
  - Edit button (goes back to step 1)
- Variants Card
  - List of all variants (SKU, pricing, stock)
  - Edit button (goes to step 2)
  - Variant count badge
- Media & Details Card
  - Primary image thumbnail
  - Image count badge
  - Video indicator
  - Edit button (goes to step 3)

**Publishing Options**
- Status selector (radio buttons)
  - Draft (save but don't show in POS yet)
  - Active (available for sale)
  - Archived (hidden from POS)
- Visibility toggle (POS only, since webstore is excluded)
- Scheduled publish option (publish on specific date/time)

**Review Checklist**
- Checklist of data quality checks:
  - [ ] All required fields completed
  - [ ] At least one variant with price
  - [ ] Product has primary image
  - [ ] SKUs are unique
  - [ ] Pricing is reasonable (compare with existing)
  - [ ] Stock quantity is set
- Visual indicators (green checkmark, warning icons)
- Warnings (e.g., "This product has no category" - yellow warning)

**Publish Button**
- Prominent primary button: "Publish Product"
- Loading state during submission
- Success message with options: "Create Another", "View Product", "Go to List"

**Cancel/Save Draft**
- Save as Draft option (creates incomplete product for later)
- Cancel button (with unsaved changes warning)

#### 3.1.6 Mobile Wizard Optimization

**Mobile Step Navigation**
- Collapsible step sections (tap to expand/collapse)
- Progress bar at top
- Step navigation arrows (instead of prev/next buttons)
- Floating submit button at bottom
- Simplified table views (vertical stacking of columns)

**Touch Interactions**
- Tap to expand/collapse sections
- Swipe to navigate between steps
- Long-press for context menu

#### 3.1.7 Form Helpers & UX

**Autocomplete & Suggestions**
- Product name: Suggest existing similar products
- Category: Show popular categories
- Brand: Show recent brands
- Tags: Show suggested tags based on product name/category

**Smart Defaults**
- Category: Default to most recently used
- Gender: Default to UNISEX
- Tax Rule: Default to STANDARD_VAT
- Stock Quantity: Default to 0
- Cost Price: Default to last entered price (if available)

**Keyboard Navigation**
- Tab through fields
- Enter to add variant
- Ctrl+S to save draft
- ESC to cancel

**Accessibility**
- ARIA labels on all fields
- Proper semantic HTML
- Screen reader support
- Color-blind safe indicators
- Sufficient color contrast

### 3.2 Backend - Product Creation Endpoints

#### 3.2.1 Create Product Endpoint

**Endpoint**: `POST /api/catalog/products/`

**Request Body**
```
{
  "name": "Product Name",
  "description": "Product description",
  "category_id": "UUID",
  "brand_id": "UUID",
  "gender": "UNISEX",
  "product_type": "simple|variable|bundle|service",
  "tags": ["tag1", "tag2"],
  "tax_rule": "STANDARD_VAT",
  "unit_of_measure": "piece",
  "product_code": "CODE123",
  "gtin": "1234567890123",
  "country_of_origin": "US",
  "warranty_months": 12,
  "compliance_tags": ["organic", "vegan"],
  "collections": ["new-arrivals"],
  "variants": [
    {
      "sku": "SKU001",
      "barcode": "123456789",
      "size": "M",
      "colour": "Red",
      "cost_price": 100.00,
      "retail_price": 150.00,
      "wholesale_price": 120.00,
      "stock_quantity": 50,
      "low_stock_threshold": 5,
      "description": "Variant description",
      "image_urls": ["http://..."]
    }
  ],
  "images": [
    {
      "url": "http://...",
      "alt_text": "Product image",
      "is_primary": true
    }
  ],
  "video_url": "https://youtube.com/...",
  "related_products": [
    {
      "product_id": "UUID",
      "relationship_type": "upsell|cross-sell|replacement"
    }
  ],
  "bundle_components": [
    {
      "product_id": "UUID",
      "quantity": 2,
      "price": 50.00
    }
  ],
  "supplier_id": "UUID",
  "supplier_product_code": "SUPP123",
  "supplier_lead_time_days": 14,
  "minimum_order_quantity": 5,
  "status": "draft|active|archived"
}
```

**Response**
- Returns created product with all fields
- Includes generated product_id
- HTTP 201 Created

**Validation**
- Product name required and unique per tenant
- At least one variant required
- Category required
- Product type must be valid enum
- SKU must be unique per tenant
- Barcode must be unique per tenant (if provided)
- All UUID fields must be valid UUIDs
- Prices must be positive decimals
- Stock quantity must be non-negative integer

#### 3.2.2 Variant Matrix Generation Endpoint (Optional)

**Endpoint**: `POST /api/catalog/products/generate-variants/`

**Request Body**
```
{
  "attributes": {
    "size": ["S", "M", "L", "XL"],
    "colour": ["Red", "Blue", "Green"]
  },
  "base_retail_price": 150.00,
  "base_cost_price": 100.00,
  "sku_pattern": "PROD-{size}-{colour}",
  "stock_quantity": 50,
  "low_stock_threshold": 5
}
```

**Response**
- Returns array of generated variants:
```
[
  {
    "sku": "PROD-S-Red",
    "size": "S",
    "colour": "Red",
    "cost_price": 100.00,
    "retail_price": 150.00,
    "stock_quantity": 50,
    "low_stock_threshold": 5
  },
  ...
]
```

#### 3.2.3 Bulk Variant Import Endpoint

**Endpoint**: `POST /api/catalog/products/{product_id}/import-variants/`

**Request**
- File upload (CSV format)
- Columns: sku, barcode, size, colour, cost_price, retail_price, wholesale_price, stock_quantity, low_stock_threshold, description, image_urls

**Response**
- Count of imported variants
- List of errors (for invalid rows)
- Summary: "Successfully imported 47 variants"

#### 3.2.4 Product Duplication Endpoint (Optional)

**Endpoint**: `POST /api/catalog/products/{product_id}/duplicate/`

**Request Body** (optional, can override fields)
```
{
  "name": "Product Name Copy",
  "sku_suffix": "-COPY",
  "include_images": true,
  "include_related_products": false
}
```

**Response**
- Returns newly created product (duplicate)

### 3.3 Data Validation & Rules

#### 3.3.1 Product Name
- Required, max 500 characters
- Unique per tenant
- No leading/trailing whitespace

#### 3.3.2 SKU
- Required per variant, max 100 characters
- Unique per tenant
- Alphanumeric + hyphens/underscores
- Recommendation: Follow pattern (e.g., CATEGORY-TYPE-COLOR-SIZE)

#### 3.3.3 Barcode
- Optional, max 100 characters
- Unique per tenant (if provided)
- Must be valid barcode format (EAN-13, UPC, etc.)
- Validation: Check against barcode standard

#### 3.3.4 Pricing
- Cost Price: Required, positive decimal, max 14 digits + 2 decimals
- Retail Price: Required, must be > cost price (warn if not)
- Wholesale Price: Optional, typically between cost and retail
- All prices must be consistent across variants (warn if one variant is much cheaper)

#### 3.3.5 Stock
- Stock Quantity: Non-negative integer
- Low Stock Threshold: Positive integer, typically 5-50 (warn if unusually high)
- Reorder Point: Optional, typically > low stock threshold

#### 3.3.6 Images
- Max 10 images per product
- Accepted formats: JPG, PNG, WebP
- Max file size: 5MB per image
- Recommended size: 1000x1000px
- Auto-compress large images

### 3.4 Product Type Specific Logic

#### 3.4.1 Simple Product
- Single variant only
- Disable variant matrix generator
- Disable multiple variant creation UI
- Show simplified variant section

#### 3.4.2 Variable Product
- Multiple variants with attributes (size, color, etc.)
- Enable variant matrix generator
- Enable bulk import
- Show variants table
- Variants should share base product info

#### 3.4.3 Bundle Product
- Show bundle components section
- Allow adding other products as components
- Calculate bundle price from components
- Disable variant pricing (use component pricing)
- Show bundle visualization

#### 3.4.4 Service Product
- No inventory tracking
- No barcode/SKU
- Disable stock section
- Simplified pricing

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- Creating product with no variants initially (save as draft)
- Creating product with 100+ variants (performance)
- Creating bundle with itself as component (circular reference)
- Creating product with very long description (rich text editor)
- SKU auto-generation pattern conflicts (e.g., pattern creates duplicate)
- Bulk variant import with duplicate SKUs (error handling)
- Image upload for products with 10+ MB total size
- Network timeout during product creation (retry/resume)
- Concurrent product creation (database race condition)

### 4.2 Validation Rules
- Product name min 3 characters, max 500
- Description max 5000 characters
- SKU min 2 characters, max 100
- Barcode standard validation (EAN-13 format if specified)
- Prices must have 2 decimal places
- Stock must be non-negative
- Category must exist and not be deleted
- Brand must exist and not be deleted
- Variants must have unique SKU within product
- Bundle components must not include self
- Images must be valid URLs or file uploads

### 4.3 Security Considerations
- User can only create products for their tenant
- Cost price only visible to admin in responses
- Prevent SKU enumeration (don't reveal existing SKUs)
- File upload validation (check MIME type, scan for malware)
- Prevent XXS in product description (sanitize HTML)
- Prevent CSV injection in bulk imports
- Rate limit product creation (10 per minute per user)
- Audit log all product creation with user info

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Product name validation (length, uniqueness)
- SKU validation (format, uniqueness)
- Pricing validation (retail > cost)
- Stock validation (non-negative)
- Barcode validation (format)
- Image validation (format, size)
- Variant matrix generation (correct combinations)
- Bundle circular reference detection

### 5.2 Integration Tests
- Complete wizard flow (all 4 steps)
- Product creation with variants
- Product creation with images
- Product creation with related products
- Bundle product creation with components
- Bulk variant import
- Product duplication
- Draft save and resume
- Error cases (duplicate name, invalid category, etc.)

### 5.3 Performance Tests
- Create product with 50+ variants: < 5 seconds
- Bulk import 1000 variants: < 10 seconds
- Image upload and processing: < 2 seconds per image
- Product duplication: < 2 seconds

### 5.4 Acceptance Criteria
- [ ] All form fields display and accept input
- [ ] Validation messages appear for invalid fields
- [ ] Wizard navigation works (prev/next)
- [ ] Unsaved changes warning appears
- [ ] Product creates successfully with variants
- [ ] Variants appear in product list after creation
- [ ] SKU uniqueness is enforced
- [ ] Pricing defaults calculate correctly
- [ ] Images upload and display
- [ ] Bundle components add correctly
- [ ] Draft save preserves all data
- [ ] Product duplication creates exact copy
- [ ] Mobile wizard is usable
- [ ] Keyboard navigation works
- [ ] Accessibility features work (screen reader)

---

## 6. Frontend Implementation Checklist

- [ ] Create product creation wizard page
- [ ] Create step 1: Basic information form
- [ ] Create step 2: Variants form
- [ ] Create variant matrix generator
- [ ] Create variant detail modal
- [ ] Create bulk variant import
- [ ] Create step 3: Media and details form
- [ ] Create image upload component
- [ ] Create image gallery with reorder
- [ ] Create product relationships component
- [ ] Create bundle components component
- [ ] Create SEO/metadata section
- [ ] Create step 4: Review and publish
- [ ] Implement form validation
- [ ] Implement error message display
- [ ] Implement unsaved changes warning
- [ ] Implement save as draft
- [ ] Implement product duplication UI
- [ ] Add autocomplete suggestions
- [ ] Add smart defaults
- [ ] Implement mobile responsive wizard
- [ ] Add keyboard shortcuts
- [ ] Add accessibility features
- [ ] Create empty state displays
- [ ] Create loading states

---

## 7. Backend Implementation Checklist

- [ ] Enhance product creation endpoint
- [ ] Add variant matrix generation
- [ ] Add bulk variant import endpoint
- [ ] Add product duplication endpoint
- [ ] Implement all field validations
- [ ] Implement SKU uniqueness check
- [ ] Implement barcode uniqueness check
- [ ] Implement circular reference check (bundles)
- [ ] Add image URL validation
- [ ] Add related products validation
- [ ] Add bundle components validation
- [ ] Implement draft product status
- [ ] Add audit logging for creation
- [ ] Add file upload handling (if applicable)
- [ ] Implement auto-SKU generation
- [ ] Implement auto-barcode generation
- [ ] Add permission checks
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance test large variant sets

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment
- Test wizard with various product types
- Test variant matrix generation with large sets
- Test image upload and processing
- Database migration for new fields
- API compatibility with existing products

### 8.2 Deployment Steps
1. Deploy backend endpoints
2. Deploy database migrations
3. Deploy frontend wizard
4. Verify existing products still display
5. Monitor product creation errors
6. Gather user feedback

### 8.3 Rollback Plan
- Revert frontend if UI issues
- Disable new fields in API if compatibility issues
- Keep old product creation flow available temporarily

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Wizard page load: < 1 second
- Form submission: < 2 seconds (product with 10 variants)
- Image upload: < 2 seconds per image
- Variant matrix generation: < 1 second (100 variants)
- Bulk import: < 10 seconds (1000 variants)

### 9.2 Scalability Considerations
- Async image processing (resize, optimize)
- Async bulk variant import
- Database indexes on product fields
- Query optimization for category/brand lookup
- Caching for dropdown options (categories, brands)

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Product creation time (p50, p95, p99)
- Variant import duration
- Image upload time per image
- Form validation errors (top issues)
- Product creation errors (reasons)
- Wizard completion rate (% starting vs completing)
- Average time per step

### 10.2 Alerts
- Alert if product creation > 5 seconds
- Alert if image upload fails (> 5% of uploads)
- Alert if variant import timeout
- Alert if error rate > 5%

---

## 11. Future Enhancements

- AI-powered product category suggestion
- Duplicate product detection (suggest merging)
- Price comparison with market competitors
- Product recommendation during creation (related products)
- Automated SKU generation from rules
- Automated barcode generation and printing
- Product image auto-enhancement (color correction, background removal)
- Template-based product creation (copy from existing)
- Batch product creation from CSV with validation
- Product data quality scoring
- Pricing rule engine (cost + markup formula)
- Supplier SKU mapping and automatic sync
- Inventory forecast based on sales trends
- Product approval workflow (for quality control)
- Multi-language product information
- SEO optimization suggestions
- AR product preview during creation
