// Shared Zod schemas — locked contract from docs/BACKEND.md §3.1.
// Single source of truth, imported by both the server handlers and the client
// forms (so UI errors map 1:1 to server 400s).

import { z } from 'zod';

export const phoneSchema = z
  .string({ errorMap: () => ({ message: 'Enter a valid phone number.' }) })
  .trim()
  .min(8, 'Enter a valid phone number.')
  .max(20, 'Enter a valid phone number.')
  .regex(/^\+?[0-9][0-9 ().\-]{6,18}$/, 'Enter a valid phone number.');

export const nameSchema = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.')
  .regex(/^[\p{L}\p{N} .'\u2019-]+$/u, 'Name contains invalid characters.');

export const noteSchema = z
  .string()
  .trim()
  .max(500, 'Note must be at most 500 characters.');

export const fulfilmentSchema = z.enum(['delivery', 'pickup']);

export const checkoutItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product reference.' }),
  variantId: z.string().uuid({ message: 'Invalid variant reference.' }).optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(99, 'Quantity must be at most 99.'),
});

export const checkoutRequestSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  fulfilment: fulfilmentSchema,
  note: noteSchema.optional(),
  items: z.array(checkoutItemSchema)
    .min(1, 'Your cart is empty.')
    .max(50, 'Too many items. Please remove some and try again.'),
});

// ---- Admin schemas -----------------------------------------------------

export const urlSchema = z.string().trim().url('Enter a valid URL.').max(2048);
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens.')
  .max(80)
  .optional();

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  slug: slugSchema,
  emoji: z.string().trim().max(8).optional().nullable(),
  image_url: urlSchema.optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const variantInputSchema = z.object({
  id: z.string().uuid().optional(), // present → upsert; absent → create
  name: z.string().trim().min(1).max(60),
  option: z.string().trim().min(1).max(60),
  price_delta: z.number().int().min(0).max(10_000_000), // minor units
  is_active: z.boolean().optional(),
});

export const productInputSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  base_price: z.number().int().min(1).max(10_000_000), // minor units
  image_url: urlSchema.optional().nullable(),
  is_featured: z.boolean().optional(),
  is_veg: z.boolean().optional().nullable(),
  stock_qty: z.number().int().min(0).max(1_000_000).optional().nullable(), // null = unlimited
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  variants: z.array(variantInputSchema).max(20).optional(),
});

export const offerInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    image_url: urlSchema.optional().nullable(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().positive().max(1_000_000), // % (1..100 enforced below) or fixed minor units
    applies_to_all: z.boolean(),
    product_ids: z.array(z.string().uuid()).max(500).default([]),
    starts_at: z.string().datetime().optional().nullable(),
    ends_at: z.string().datetime().optional().nullable(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .superRefine((o, ctx) => {
    if (o.discount_type === 'percentage' && (o.discount_value <= 0 || o.discount_value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'Percentage discount must be between 1 and 100.',
      });
    }
    if (o.discount_type === 'fixed' && !Number.isInteger(o.discount_value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'Fixed discount must be a whole amount.',
      });
    }
    if (!o.applies_to_all && o.product_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['product_ids'],
        message: 'Select at least one product for a scoped offer.',
      });
    }
    if (o.starts_at && o.ends_at && o.starts_at >= o.ends_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'End must be after start.',
      });
    }
  });

export const shopSettingsInputSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  logo: urlSchema.optional().nullable(),
  theme: z.record(z.string(), z.unknown()).optional(),
  currency: z.string().trim().length(3).optional(),
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, 'WhatsApp number must be 7-15 digits.'), // E.164 without '+'
  address: z.string().trim().max(500).optional().nullable(),
  timings: z.array(z.record(z.string(), z.unknown())).max(100).optional().nullable(),
  delivery_fee: z.number().int().min(0).max(1_000_000).optional(), // minor units
  free_delivery_threshold: z.number().int().min(0).max(100_000_000).optional().nullable(),
  delivery_enabled: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  is_open: z.boolean().optional(),
  ordering_enabled: z.boolean().optional(),
  announcement: z.string().trim().max(500).optional().nullable(),
});

export const uploadRequestSchema = z.object({
  bucket: z.enum(['product-images', 'offer-images']),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(2 * 1024 * 1024, 'Image must be at most 2 MB.'),
});

// Shared helper used by every handler
export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown,
): { ok: true; data: z.output<TSchema> } | { ok: false; errors: z.ZodError } {
  const r = schema.safeParse(body);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: r.error };
}
