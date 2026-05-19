/** Max line-item discount % a CASHIER can apply without manager PIN */
export const LINE_DISCOUNT_CASHIER_THRESHOLD = 10;

/** Max cart-level discount % a CASHIER can apply without manager PIN */
export const CART_DISCOUNT_CASHIER_THRESHOLD = 5;

/** Approximate tax rate shown to cashier (server computes authoritative rate) */
export const DISPLAY_TAX_RATE_PERCENT = 15;

/**
 * Maximum inter-keystroke interval (ms) that is still considered scanner input.
 * USB HID scanners emit characters at 50–200 chars/sec; human typing is slower.
 */
export const BARCODE_INTER_KEYSTROKE_THRESHOLD_MS = 50;
