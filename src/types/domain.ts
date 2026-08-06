/**
 * Shared domain types — locked contract from docs/BACKEND.md §2.
 * Supabase returns `numeric` as `string` and timestamps as ISO strings;
 * services convert at the boundary (see docs/SUPABASE.md §7.4).
 */

export type ErrorCode =
  | 'VALIDATION_ERROR' | 'INVALID_PHONE' | 'EMPTY_CART' | 'INVALID_FILE'
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'CONFLICT' | 'SLUG_TAKEN' | 'CATEGORY_IN_USE' | 'PRODUCT_IN_USE'
  | 'STORE_CLOSED' | 'ORDERING_DISABLED' | 'DELIVERY_UNAVAILABLE' | 'PICKUP_UNAVAILABLE'
  | 'PRODUCT_UNAVAILABLE' | 'VARIANT_UNAVAILABLE' | 'INSUFFICIENT_STOCK'
  | 'LIMIT_EXCEEDED' | 'INTERNAL_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export type ApiEnvelope<T> = { data: T } | { error: ApiError };

export type Currency = string; // ISO 4217, e.g. 'INR'
export type Minor = number; // integer minor units (paise/cents)

export interface TimingRule {
  // Shape owned by DB Engineer (docs/BACKEND.md §13).
  day: number | string; // 0=Sun..6=Sat, or 'all'
  open?: string | null; // "10:00"
  close?: string | null; // "21:00"
  closed?: boolean;
}

export interface ShopSettings {
  id: string;
  brand: string;
  logo: string | null;
  theme: Record<string, unknown>;
  currency: Currency;
  whatsapp_number: string; // E.164 digits, e.g. '919876543210'
  address: string | null;
  timings: TimingRule[] | null;
  delivery_fee: string; // numeric string from DB
  free_delivery_threshold: string | null; // numeric string | null
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  is_open: boolean;
  ordering_enabled: boolean;
  announcement: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: string; // numeric string → minor units at boundary
  image_url: string | null;
  is_featured: boolean;
  is_veg: boolean | null;
  stock_qty: number | null; // null = unlimited
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // group label, e.g. 'Size'
  option: string; // e.g. 'Large'
  price_delta: string; // numeric string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: string; // percentage (e.g. "10") or currency amount ("5000" = ₹50)
  applies_to_all: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  offerProductIds: string[]; // resolved from offer_products (service-side)
}

// ---- Public aggregates -------------------------------------------------

export interface CatalogProduct extends Product {
  bestOfferId: string | null; // server-computed convenience for strikethrough display
}

export interface Catalog {
  shop: ShopSettings;
  categories: Category[]; // active, sort_order asc
  products: CatalogProduct[]; // active, sort_order asc
  variantsByProduct: Record<string, ProductVariant[]>; // active variants only
  offers: Offer[]; // active + within window
  generatedAt: string;
}

export interface ProductDetail {
  product: CatalogProduct;
  variants: ProductVariant[]; // active variants
  category: { id: string; slug: string; name: string } | null;
  bestOffer: Offer | null;
}

// ---- Checkout ----------------------------------------------------------

export type Fulfilment = 'delivery' | 'pickup';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface CheckoutInput {
  name: string;
  phone: string;
  fulfilment: Fulfilment;
  note: string | null;
  items: CheckoutItemInput[];
}

export interface PricedLine {
  productId: string;
  productName: string;
  variant: { id: string; name: string; option: string } | null;
  unitPrice: Minor; // base_price + Σ variant deltas
  quantity: number;
  lineSubtotal: Minor; // unitPrice * quantity
  discount: Minor; // applied offer discount
  lineTotal: Minor; // lineSubtotal - discount
  appliedOffer: { id: string; title: string } | null;
}

export interface CheckoutTotals {
  subtotal: Minor; // Σ lineSubtotal (pre-discount)
  discount: Minor; // Σ line discount
  delivery: Minor; // delivery fee or 0 (free-threshold / pickup)
  total: Minor; // subtotal - discount + delivery
}

export interface CheckoutResult {
  kind: 'ok';
  shop: ShopSettings;
  currency: Currency;
  lines: PricedLine[];
  totals: CheckoutTotals;
}

export interface CheckoutErrorResult {
  kind: 'error';
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface CheckoutResponse {
  message: string; // from buildOrderMessage().text
  waUrl: string; // https://wa.me/<shop>?text=<encoded>
  total: Minor;
  currency: Currency;
}
