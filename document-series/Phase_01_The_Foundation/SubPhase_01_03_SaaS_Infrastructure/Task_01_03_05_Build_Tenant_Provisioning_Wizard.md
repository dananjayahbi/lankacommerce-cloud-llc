# Task 01.03.05 — Build Tenant Provisioning Wizard

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.05 |
| Title | Build Tenant Provisioning Wizard |
| Working Directory | `frontend/` |
| Prerequisites | Task 01.03.01 (Django models), Task 01.03.06 (subscription plans seeded), Task 01.03.07 (service layer, including create_tenant endpoint), Django GET /api/plans/ and POST /api/tenants/ endpoints operational |
| Estimated Time | 4 hours |
| Status | [ ] Not Started |

---

## Objective

Build the multi-step provisioning wizard at `/superadmin/tenants/new` that guides a super admin through creating a new tenant store. The wizard collects all the information required to provision a fully functional tenant: store identity, subscription plan selection, and initial owner account credentials. On final submission, the wizard posts the collected data to the Django API, which handles the entire atomic provisioning transaction — creating the Tenant, the owner CustomUser, and the active Subscription — in a single database transaction on the backend. The frontend wizard is purely a data collection and validation layer.

---

## Instructions

### Step 1: Create the Wizard Page and Container Component

Create the file `frontend/src/app/(superadmin)/tenants/new/page.tsx`. This file is a Server Component that renders the page shell. It does not need to fetch tenant-specific data, but it does need to fetch the available subscription plans from the Django API so that Step 2 of the wizard can display plan cards without an additional client-side request.

Inside the async page function, read the access token from cookies using `cookies()` from `next/headers`. Fetch the available plans from the Django API endpoint `GET /api/plans/` with the `Authorization: Bearer [access_token]` header. Parse the JSON response into an array of Plan objects, each with `id`, `name`, `description`, `price_monthly`, and `features` fields.

Pass the plans array as a prop to the Client Component that manages the wizard state.

Create the wizard Client Component at `frontend/src/app/(superadmin)/tenants/new/_components/TenantProvisioningWizard.tsx`. Add the `"use client"` directive. This component receives the `plans` array and `accessToken` as props. It owns all wizard state: current step, form field values, validation errors, and submission status.

### Step 2: Define the Wizard Steps Structure

The wizard has three steps. Define a constant array of step definitions at the top of the wizard component. Each step has a number, a title, and a description:

- Step 1: "Store Identity" — Enter the store name, slug, and timezone/currency settings.
- Step 2: "Choose a Plan" — Select one of the available subscription plans.
- Step 3: "Owner Account" — Enter the initial owner's email and password.

Additionally, there is a Step 4 that represents the confirmation and submission state, shown after the user clicks "Create Tenant" on Step 3.

### Step 3: Build the Step Indicator

At the top of the wizard component's returned JSX, render the step indicator bar. This is a horizontal sequence of step circles and connecting lines.

For each step, render a circle (32×32px) containing the step number. Apply styles based on the step's state relative to the current step:
- Completed steps (step number less than the current step): orange background (`#F97316`) with a white checkmark icon inside.
- Current step (matching the current step number): orange border (2px solid orange), white background, orange text inside.
- Upcoming steps (step number greater than current): slate-200 border, slate-200 background, muted text inside.

Between each pair of circles, render a connecting horizontal line that turns orange when the preceding step is completed.

Below each circle, render the step title in a small font. Apply orange text to the current step's title and muted text to upcoming steps.

### Step 4: Build Step 1 — Store Identity Form

Render Step 1's form content inside the wizard when `currentStep === 1`. The step content is wrapped in a white card with slate-200 border and `p-6` padding.

The Store Identity step contains the following fields:

- **Store Name**: A text input. Validate that it is not empty and does not exceed 255 characters. Display the label "Store Name" above the input.
- **Slug**: A text input that accepts only lowercase letters, numbers, and hyphens. The value should auto-populate from the store name as the user types (convert the store name to lowercase, replace spaces with hyphens, and strip non-alphanumeric characters). Validate the slug pattern with a regex. Below the slug input, add an asynchronous slug availability check: when the user pauses typing (after 500ms debounce), call the Django API endpoint `GET /api/tenants/check-slug/?slug={value}` with the access token. If the slug is taken, display a red "This slug is already in use" message. If available, display a green "Slug is available" message.
- **Currency**: A select input with options for LKR (pre-selected as default), USD, EUR, and GBP.
- **Timezone**: A select input with common timezone options, defaulting to Asia/Colombo.
- **VAT Rate**: A number input (decimal, 0–100). Pre-filled with 18.
- **SSCL Rate**: A number input (decimal, 0–100). Pre-filled with 2.5.

Validate all fields before allowing the user to proceed to Step 2. Display inline validation error messages in red below each invalid field.

### Step 5: Build Step 2 — Plan Selection

Render Step 2's content inside the wizard when `currentStep === 2`. Display the plans fetched by the server page as interactive plan selection cards.

Each plan card is a white div with a slate-200 border, rounded corners, and `p-6` padding. When selected, the card's border changes to orange (2px solid `#F97316`) and a subtle orange background tint is applied to the card.

Inside each plan card, display:
- The plan name in Inter Bold, large font.
- The monthly price formatted as "LKR X,XXX / month" using `Intl.NumberFormat`.
- A bulleted list of features from the plan's `features` array. Each bullet point uses a small orange checkmark icon.
- A "Select" button at the bottom of the card. When a plan is already selected (visually selected), replace the "Select" button with a "Selected" badge in orange.

Require that a plan is selected before allowing the user to proceed to Step 3. If the user clicks "Next Step" without selecting a plan, display an inline error: "Please select a subscription plan."

### Step 6: Build Step 3 — Owner Account Form

Render Step 3's form content when `currentStep === 3`.

The Owner Account step collects:
- **Owner Email**: An email input. Validate email format with a regex. This email will become the username for the first admin user of the tenant.
- **Owner Password**: A password input with a show/hide toggle. Validate a minimum length of 8 characters and require at least one uppercase letter, one digit, and one special character. Display a real-time password strength indicator below the input (Weak, Fair, Strong based on the rules met).
- **Confirm Password**: A password input. Validate that it matches the Owner Password field on blur.

Validate all three fields before enabling the final "Create Tenant" button.

### Step 7: Build the Navigation Buttons

At the bottom of each step's content, render navigation buttons:

- On Step 1: A disabled or hidden "Back" button, and an orange "Next Step →" button.
- On Step 2: A navy "← Back" button and an orange "Next Step →" button.
- On Step 3: A navy "← Back" button and an orange "Create Tenant" button.

The "Next Step" button on each step runs the step's validation logic before advancing. If validation fails, the step does not advance and inline errors are displayed.

The "Back" button always navigates to the previous step without validation and without clearing any entered data.

Disable the "Create Tenant" button while submission is in progress. Show a loading spinner inside the button during submission.

### Step 8: Build the Success Confirmation View

After the Django API responds with a successful 201 Created status for the tenant provisioning request, replace the wizard with a success confirmation view.

The success view shows:
- A large orange or green circular checkmark icon.
- The heading "Tenant Created Successfully" in Inter Bold.
- The new tenant's name and slug in a white card.
- Two buttons: a navy "View Tenant" button that links to `/superadmin/tenants/[new-tenant-id]`, and an orange "Create Another Tenant" button that resets the wizard to Step 1.

### Step 9: Handle Submission to the Django API

Inside the wizard component, create an `onSubmit` handler that is called when the "Create Tenant" button is clicked on Step 3.

The handler gathers all form values from all three steps and assembles a single request body object containing: `store_name`, `slug`, `currency`, `timezone`, `vat_rate`, `sscl_rate`, `plan_id`, `owner_email`, and `owner_password`.

The handler posts this object as JSON to the Django API endpoint `POST /api/tenants/` with the `Authorization: Bearer [accessToken]` header and `Content-Type: application/json`.

The Django backend receives this single request and handles the entire provisioning transaction atomically: it creates the Tenant with settings, creates the owner CustomUser with a hashed password, and creates the active Subscription linked to the chosen Plan. The frontend sends only raw data; it does not call multiple endpoints or manage the transaction itself.

If the Django API returns a 201 response, transition the wizard to the success confirmation view with the returned tenant data.

If the Django API returns a 400 response (validation error), extract the error messages from the response body and display them as inline errors on the relevant wizard step fields. If the slug is already taken (Django returns a specific error for this), navigate back to Step 1 and show the slug error inline.

If the Django API returns any 5xx error, display a general error message at the top of the wizard and allow the user to retry.

---

## Expected Output

After completing this task, the following artifacts exist:

- `frontend/src/app/(superadmin)/tenants/new/page.tsx` — Server Component that fetches available plans and renders the wizard container.
- `frontend/src/app/(superadmin)/tenants/new/_components/TenantProvisioningWizard.tsx` — Client Component with full wizard state management and three-step form flow.
- The wizard renders a step indicator bar with orange completed/active state styling and slate-200 pending state styling.
- Step 1 collects store identity with real-time slug availability checking.
- Step 2 shows plan selection cards with orange selected-state styling.
- Step 3 collects owner credentials with password strength validation.
- The wizard POSTs a single payload to Django and shows a success confirmation screen.

---

## Validation

- [ ] Navigating to `/superadmin/tenants/new` renders the wizard with Step 1 active.
- [ ] Clicking "Next Step" on Step 1 with empty fields shows inline validation errors without advancing.
- [ ] The slug field auto-populates from the store name with proper lowercasing and hyphenation.
- [ ] The slug availability check calls `GET /api/tenants/check-slug/` and displays a green or red inline indicator.
- [ ] Step 2 renders the plan cards fetched from the Django API.
- [ ] Selecting a plan changes the card border to orange and the button to "Selected".
- [ ] Clicking "Next Step" on Step 2 without selecting a plan shows an error.
- [ ] Step 3 shows real-time password strength feedback.
- [ ] Clicking "Create Tenant" with valid data sends a POST to `POST /api/tenants/` and transitions to the success view on 201.
- [ ] The success view shows "View Tenant" and "Create Another Tenant" buttons.
- [ ] Running `pnpm tsc --noEmit` produces zero TypeScript errors.

---

## Notes

- The decision to have the Django backend handle the entire provisioning transaction atomically (Tenant + User + Subscription in one request) is intentional. If the frontend were to create each record via separate API calls, a partial failure (for example, the user was created but the subscription was not) would leave the database in an inconsistent state. The atomic transaction in Django guarantees that either all three records are created or none of them are.
- The `accessToken` passed as a prop from the server page to the wizard Client Component is used for both the slug check call and the final provisioning POST. It is passed once at render time and held in the component's memory. It does not appear in any URL or rendered HTML.
- If the plan list is empty (no active plans seeded), display a warning on Step 2 directing the super admin to run the `seed_plans` management command. This prevents a confusing empty state.
- The "Create Another Tenant" button in the success view should clear all form state variables and set `currentStep` back to 1, not navigate away and back. A clean in-place reset avoids an additional page load.
