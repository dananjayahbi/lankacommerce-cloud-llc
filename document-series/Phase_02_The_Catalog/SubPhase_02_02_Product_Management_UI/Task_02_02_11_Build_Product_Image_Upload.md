# Task 02.02.11 — Build Product Image Upload

## Metadata

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Task ID      | Task_02_02_11                                               |
| Sub-Phase    | 02.02 — Product Management UI                               |
| Complexity   | Medium                                                      |
| Depends On   | Task_02_02_05                                               |
| File Target  | `src/components/product/ProductImageUpload.tsx`             |

---

## Objective

Build the `ProductImageUpload` component that manages the image gallery for a single product variant. The component is embedded in the Variant Edit Panel (built in Task_02_02_05) and in the variant matrix table in the wizard (for optional image upload during creation). It supports viewing, uploading, and removing images with clear visual feedback at every state.

---

## Instructions

### Step 1: Define the Component Interface

The `ProductImageUpload` component receives three props: `imageUrls` (an array of string URLs representing existing variant images), `onImagesChange` (a callback that fires whenever the image array changes, receiving the updated array), and `maxImages` (an integer, defaulting to 5 if not provided). The component is designed to be used inside a React Hook Form `Controller` wrapper so its value and `onChange` integrate with the parent form's state.

The component is intentionally stateless at the URL level — it does not maintain its own internal copy of the `imageUrls` array. The parent form controls the truth. The component only manages the UI state of an in-progress upload (upload progress percentage and error messages).

### Step 2: Build the Image Grid Layout

The image display section is a horizontal flex row that wraps when necessary. Each existing image is shown as an 80 × 80 px thumbnail tile with a 4 px border-radius. The image fills the tile using `object-fit: cover`. In the top-right corner of each tile, a small circular "×" button (8 px diameter, danger background #EF4444, surface × character) allows removal. The × button has a semi-transparent background at rest and becomes fully opaque on hover.

At the end of the image row (after all existing thumbnails), an "Upload Image" tile renders if the current `imageUrls` length is less than `maxImages`. This tile is 80 × 80 px like the thumbnails, has a border dashed border, a background colour, and centred content: a "+" icon in orange colour above the text "Upload" in Inter 10 px text-muted. Clicking anywhere on this tile opens the hidden file input via a programmatic `click()` call. Displaying the total count below the grid ("2 / 5 images") in Inter small text-muted text helps users track capacity.

If the `imageUrls` length equals `maxImages`, the Upload tile is replaced by a text-muted tile with a lock icon and the text "Max 5" to signal that no more images can be added.

### Step 3: Implement Client-Side File Validation

When the user selects a file via the hidden file input, run pre-upload validation before making any network request:

- Check that the file type is one of `image/jpeg`, `image/png`, or `image/webp`. If not, display the error "Only JPEG, PNG, and WebP images are accepted." as red Inter small text directly below the image grid.
- Check that the file size does not exceed 5 242 880 bytes (5 MB). If it does, display "Image must be under 5 MB." as the same red text.

These error messages replace each other as new validation errors occur, and are cleared when a valid file is selected or when an upload succeeds. Do not make any network requests if client-side validation fails.

### Step 4: Implement the Upload Flow

After a valid file passes client-side checks, show an upload progress indicator. Replace the "Upload Image" tile temporarily with an 80 × 80 px background-colour tile containing a small loading skeleton bar at 40% height and a percentage label below it (e.g., "47%"). The progress is driven by the `XMLHttpRequest` upload progress events (use `XMLHttpRequest` rather than `fetch` for this component, specifically to access the `upload.onprogress` callback).

The upload request sends the file as `FormData` to the Django endpoint `POST /api/catalog/upload/`. The key for the file in the `FormData` is `image`. The JWT is passed as a `Bearer` token in the `Authorization` header of the `XMLHttpRequest`. The Django `upload_file()` function in `backend/apps/catalog/storage.py` handles the actual file storage, writing to the storage provider configured in Django's `settings.py` (the `STORAGE_PROVIDER` setting, which is an environment variable on the Django side — not configured in the Next.js `.env` file). The Django endpoint returns a JSON response in the standard envelope format: `{ "url": "https://..." }`.

On success: append the returned URL to the `imageUrls` array, call `onImagesChange` with the updated array, and restore the Upload tile (if the new length is still below `maxImages`).

On failure: restore the Upload tile, display an inline error message below the grid such as "Upload failed. Please try again." with a "Retry" link that re-opens the file picker pointing to the same file.

### Step 5: Implement the Remove Behaviour

When the × button is clicked on a thumbnail, remove that URL from the `imageUrls` array and call `onImagesChange` with the filtered array. This operation is optimistic — the thumbnail is removed from the UI immediately without any confirmation dialog. LankaCommerce intentionally does not delete the file from cloud storage at this point. The actual file in storage remains until a background cleanup job (outside Phase 2 scope) processes it. Only the URL reference is removed from the variant record in the Django database.

To enable undo within the same edit session, implement a brief "undo" toast: after a thumbnail is removed, show a Sonner toast with the message "Image removed" and an "Undo" action button. If the user clicks Undo within 5 seconds, restore the URL to the array and call `onImagesChange` again. If the toast auto-dismisses, the removal is permanent from the form's perspective.

### Step 6: Handle the Loading State on Initial Render

When the component first mounts with a non-empty `imageUrls` array (i.e., editing an existing variant), show the thumbnails immediately using the existing URLs — no loading state is needed for already-uploaded images. If any URL in the array fails to load (the `img` element fires an `onError` event), replace that specific thumbnail with a navy-border 80 × 80 px tile containing a broken-image icon in text-muted colour and the text "Error" in Inter 9 px.

---

## Expected Output

The Variant Edit Panel renders the `ProductImageUpload` component showing existing images as thumbnails with × buttons. Clicking the Upload tile opens the file picker. Selecting a large file immediately shows the size error. Selecting a valid image shows the upload progress. After upload completes, the new thumbnail appears at the end of the row. Clicking × on a thumbnail removes it immediately and shows the undo toast.

---

## Validation

- [ ] Component renders correctly with zero, one, and five existing images
- [ ] Upload tile is hidden when `maxImages` limit is reached, replaced by the "Max 5" locked tile
- [ ] Selecting a file over 5 MB shows the size error without making a network request
- [ ] Selecting a non-image file type shows the format error without making a network request
- [ ] Valid file selection shows progress percentage in the upload tile
- [ ] Successful upload appends the URL to the array and calls `onImagesChange`
- [ ] Failed upload shows the inline error with a Retry link
- [ ] Clicking × removes the URL, calls `onImagesChange`, and shows the undo toast
- [ ] Clicking Undo restores the removed URL and calls `onImagesChange`
- [ ] A broken image URL renders the error placeholder tile instead of a broken `img` element
- [ ] The component integrates cleanly inside a React Hook Form `Controller` without requiring extra wiring

---

## Notes

- The `XMLHttpRequest` approach for upload progress is intentional — the Fetch API does not expose upload progress events natively in any stable browser API. If a future project switches to a streaming upload library, revisit this choice
- The `POST /api/catalog/upload/` Django endpoint must not be accessible without a valid JWT — the DRF authentication backend enforces this, returning 401 for unauthenticated requests, preventing unauthenticated image uploads to the storage bucket
- Keep the component focused on single-variant images. If a business requirement for product-level "hero images" (displayed on the Inventory List thumbnail) emerges in a future phase, that is a separate image type and should not be retrofitted into this component
- The storage provider configuration (local disk, S3, Google Cloud Storage, etc.) is managed entirely in Django's `settings.py` and the `backend/` environment variables — the frontend only ever receives and stores the resulting public URL string
