# Chocolate Zone — Frontend Architecture
**Owner**Frontend Developer**Status**Draft v1 (implementation-ready)**Baseline**`docs/ARCHITECTURE.md` v1 (locked contract)**Inputs consumed**`02-ux-ux.md` v1 (design tokens §5, component specs §6, a11y §7, responsive §8, optimizations §9), `01-pm-prd.md` v1 (NFRs §5, KPIs §7, DoD §8.2)**Audience**Frontend implementers, Backend, Supabase Expert, WhatsApp Expert, QA
> **Compliance.** This document extends the locked folder structure in `ARCHITECTURE.md` §4.
> All component/file names match it exactly. New files are additions *inside* existing
> folders (`lib/motion.ts`, `hooks/*`, `components/providers/*`) — nothing is renamed or
> moved. Where the locked contract is underspecified (fetch strategy, cart hydration,
> query-key convention), this document defines the implementation and flags dependences.

---

## 1. Scope & Principles
The frontend owns: the RSC/client split, the cart store, forms, the shadcn theme, and
motion. It does **not** own API contracts (Backend), SQL/RLS (Database), or the WhatsApp
message format (WhatsApp Expert). Anything the frontend needs from those owners is listed
under §13 "Inputs needed" — never invented here.

Locked platform facts the frontend builds on:

- One Next.js 15 app on Vercel. Two route groups: public `(storefront)` and protected `(admin)`.
- Public reads = anon key + RLS SELECT. All writes = service-role, server-only. The client is never trusted with money math.
- Cache contract: `revalidateTag('catalog')`; every admin mutation invalidates it so the storefront updates in seconds.
- No customer login, no customer data persisted (cart lives in `localStorage` only).
- WhatsApp is the order channel: checkout returns `{ message, waUrl, total }`, the client opens `waUrl`, with copy + `web.whatsapp.com` fallback always available.
Frontend principles:

1. **RSC by default.** Every page is a Server Component. Client Components are an explicit, justified exception (interactivity, browser APIs, store access).
2. **One catalog fetch.** The home screen paints from a single `GET /api/catalog` consumed inside an RSC with ISR + tag revalidation.
3. **Snapshots for display, server for truth.** The cart snapshots prices for instant UI; the server recomputes everything at checkout.
4. **Optimistic by default** in the admin (TanStack Query mutations with rollback).
5. **Accessibility and reduced motion are compile-time requirements**, enforced by shared primitives (`MotionConfig reducedMotion="user"`, 44 px targets, `role`/`aria` wiring from the UX spec).

---

## 2. Server / Client Component Strategy

### 2.1 Rules
#RuleR1A component is a **Server Component** unless it needs interactivity, a browser API, `useState`/`useEffect`/`useRouter`, an event handler, or reads the Zustand cart. If none apply → Server Component.R2**Never** mark a leaf that only renders data as `'use client'`. Server-render it and pass serializable props.R3Client boundaries are as **deep** as possible. A client component may not import a server component; pass children/props instead. Data flows down from RSC → client as props, not by the client fetching.R4Cart mutations, sheet open-state, and toasts are the only pieces that may reach into stores/providers.R5Server Components are the only place allowed to call Supabase (via `lib/supabase/server.ts`) or `fetch` the public API with `next` cache options. Client fetch is reserved for (a) admin TanStack Query and (b) the cart→catalog hydration check.R6Any component that must work in a deep-link no-JS context (product/category pages) keeps a full server-rendered fallback; client features layer on top after hydration.
### 2.2 Component-by-component table
Legend: **S** = Server, **C** = Client, **C*** = Client but code-split via `next/dynamic`, **H** = hook.

#### Storefront
ComponentFileTypeWhy / notesRoot layout`src/app/layout.tsx`SFonts, `metadataBase`, global providers (`MotionConfig`)Storefront layout`src/app/(storefront)/layout.tsx`SShell: cream bg, mounts `FloatingCartBar` + `SheetHost`, passes `catalog` downHome page`src/app/(storefront)/page.tsx`S`getCatalog()` → renders hero/announcement/carousel/chips/grid; ISRCategory page`src/app/(storefront)/category/[slug]/page.tsx`S`getCatalog()` filter by slug; not-found handling; ISRProduct page`src/app/(storefront)/product/[slug]/page.tsx`SResolves slug→id via catalog, fetches `/api/products/[id]`, `generateMetadata`Hero`src/components/storefront/hero.tsx`SStatic-ish brand block; CTA is an `<a href="#menu">`AnnouncementBar`src/components/storefront/announcement-bar.tsx`SRenders `shop.announcement`; nothing interactiveOpenClosedChip`src/components/storefront/open-closed-chip.tsx`S`shop.is_open` + `timings` → "Open"/"Closed"/"Paused" pillOfferCarousel`src/components/storefront/offer-carousel.tsx`C*Snap-scroll + parallax; code-split so home JS stays smallCategoryChips`src/components/storefront/category-chips.tsx`CActive-chip `layoutId`, URL sync, sticky header behaviorProductGrid`src/components/storefront/product-grid.tsx`SMaps `ProductCard`; data-onlyProductCard`src/components/storefront/product-card.tsx`CStepper/CTA calls cart store; motion enter staggerProductSheet`src/components/storefront/product-sheet.tsx`C*Dialog + variant state + price flip; lazy-loadedCartSheet`src/components/storefront/cart-sheet.tsx`C*Reads cart store, line items, fulfilment, totalsCheckoutForm`src/components/storefront/checkout-form.tsx`C*r-h-f + zod; posts to `/api/checkout/whatsapp`OrderSuccess`src/components/storefront/order-success.tsx`C*Copy / re-open WhatsApp / Done; clear cart on DoneFloatingCartBar`src/components/storefront/floating-cart-bar.tsx`CCart count/total; opens CartSheetQtyStepper`src/components/storefront/qty-stepper.tsx`CShared by card + cart; owns a11y labelsEmptyState / ErrorState / CatalogSkeleton`src/components/storefront/*.tsx`S/CSee §8ProductDeepLink`src/components/storefront/product-deep-link.tsx`CAuto-opens ProductSheet after hydration on deep link
#### Admin
ComponentFileTypeWhy / notesAdmin root layout`src/app/(admin)/layout.tsx`SSession guard (server), renders `AdminQueryProvider`Login page`src/app/(admin)/login/page.tsx`CMagic-link email form (Supabase `signInWithOtp`)Dashboard shell layout`src/app/(admin)/dashboard/layout.tsx`CSidebar / bottom tabs; holds TanStack contextOverview page`src/app/(admin)/dashboard/page.tsx`CKPI cards from `getCatalog()` query + quick togglesCategories page`src/app/(admin)/dashboard/categories/page.tsx`C`useQuery` categories + SortableListProducts page`src/app/(admin)/dashboard/products/page.tsx`C`useQuery` products + DataTableOffers page`src/app/(admin)/dashboard/offers/page.tsx`C`useQuery` offers + SortableListSettings page`src/app/(admin)/dashboard/settings/page.tsx`C`useQuery` shop + SettingsFormDataTable`src/components/admin/data-table.tsx`Cshadcn Table + sort/filter/paginationImageUpload`src/components/admin/image-upload.tsx`CWebP re-encode → signed URL → PUTToggleSwitch`src/components/admin/toggle-switch.tsx`C`role="switch"`; used inline + in formsSortableList`src/components/admin/sortable-list.tsx`Cframer `Reorder.Group` for categories/variants/offersProductForm`src/components/admin/product-form.tsx`Cshadcn Dialog + Form; variants repeaterOfferForm`src/components/admin/offer-form.tsx`CDialog + Form; live strikethrough previewSettingsForm`src/components/admin/settings-form.tsx`CLong-form page, not a dialog
### 2.3 Data flow (RSC → Client)

```
(page.tsx, RSC)                       (client)
getCatalog()  ──props──▶  ProductGrid ──props──▶ ProductCard (interactive leaf)
   │                        (S, data only)             │
   └─ metadata, chips, carousel  (RSC)                └─ addToCart(cart store)
```
The interactive leaves (`ProductCard`, `QtyStepper`) receive plain serializable props
(name, price, stock, offer). They never fetch. Cart state flows up through Zustand
(module store, no prop drilling), sheets and the cart bar subscribe independently.

---

## 3. Data Fetching

### 3.1 Storefront: RSC reads `/api/catalog` with ISR + tags
The single aggregate endpoint (`GET /api/catalog`) is consumed *inside a Server
Component* via a server-side `fetch` that opts into Next's Data Cache with a short
revalidate window and the locked `catalog` tag. This is how ISR (`revalidate: 60`) and
`revalidateTag('catalog')` meet: the fetch-cache entry is tagged `catalog`, so any admin
mutation that calls `revalidateTag('catalog')` (in the mutation's route handler, owned
by Backend) evicts it within seconds.

```ts
// src/lib/data/catalog.ts  (server-only)
import 'server-only';

export const CATALOG_TAG = 'catalog';

function apiBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function getCatalog(): Promise<Catalog> {
  const res = await fetch(`${apiBase()}/api/catalog`, {
    next: { revalidate: 60, tags: [CATALOG_TAG] },
  });
  if (!res.ok) throw new CatalogFetchError(res.status);
  const { data } = (await res.json()) as ApiEnvelope<Catalog>;
  return data;
}

export async function getProductDetail(id: string): Promise<ProductDetail> {
  const res = await fetch(`${apiBase()}/api/products/${id}`, {
    next: { revalidate: 60, tags: [CATALOG_TAG] },
  });
  if (!res.ok) throw new ProductNotFoundError(res.status);
  const { data } = (await res.json()) as ApiEnvelope<ProductDetail>;
  return data;
}
```

- `Catalog`, `ProductDetail`, `ShopSettings`, … live in `src/types/domain.ts` and are
*shared* with Backend (Backend is the source of truth for the shape — see §13).
- `revalidate: 60` = stale-while-revalidate: serve cached, regenerate in background.
- Tag revalidation is the fast path (admin change → seconds); the 60 s window is the
no-tag fallback (deploy, external mutation).
- **Only RSC may call these helpers.** They are imported by pages and layouts.

#### Home page

```ts
// src/app/(storefront)/page.tsx
export const revalidate = 60;
export const dynamicParams = true;

export default async function StorefrontHomePage() {
  const catalog = await getCatalog();
  return (
    <>
      <Hero brand={catalog.shop.brand} />
      <AnnouncementBar text={catalog.shop.announcement} />
      <OfferCarousel offers={catalog.offers} />
      <CategoryChips categories={catalog.categories} />
      <ProductGrid products={catalog.products} />
    </>
  );
}
```

#### Category page

```ts
// src/app/(storefront)/category/[slug]/page.tsx
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalog();
  const category = catalog.categories.find((c) => c.slug === slug);
  return category
    ? { title: `${category.name} · ${catalog.shop.brand}`, description: `Order ${category.name} for pickup or delivery.` }
    : { title: 'Category not found' };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const category = catalog.categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const products = catalog.products.filter((p) => p.category_id === category.id);
  return <ProductGrid products={products} heading={category.name} />;
}
```

#### Product page (deep link / SSR fallback)

```ts
// src/app/(storefront)/product/[slug]/page.tsx
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: `${product.name} · ${catalog.shop.brand}`,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: `${product.name} · ₹${formatMoney(product.base_price)}`,
      description: product.description?.slice(0, 160),
      images: [{ url: publicImageUrl(product.image_url), alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const detail = await getProductDetail(product.id);
  return (
    <>
      <ProductDetailSection detail={detail} />
      <ProductDeepLink detail={detail} />
    </>
  );
}
```

> The product page is a **complete page**, not a bare sheet (UX §2.1): the shared
> `(storefront)/layout.tsx` supplies the FloatingCartBar. The sheet is an enhancement.

### 3.2 Supabase server client (RSC reads)
The contract says public DB reads use the anon key + RLS. RSC pages may read Supabase
*directly* for anything not covered by the aggregate (e.g., admin session check). Writes
never happen here.

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}
```
Storefront RSC pages prefer `getCatalog()` (single HTTP fetch, cache-friendly) over many
direct `.from('products').select(...)` calls. Direct anon reads are reserved for
one-off lookups not in the aggregate; every such read must go through
`lib/supabase/server.ts` (never the browser client).

### 3.3 Admin: TanStack Query setup
Admin is fully interactive (CRUD + optimistic UI), so all admin data goes through
TanStack Query on the client. The **admin layout is the guard**: it checks the session
server-side before rendering (see Auth Specialist), then mounts the provider.

```tsx
// src/components/admin/query-provider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function AdminQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

```tsx
// src/app/(admin)/layout.tsx (server)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  return <AdminQueryProvider>{children}</AdminQueryProvider>;
}
```

### 3.4 Query keys convention
Namespaced, column-first, deterministic. One source of truth in `src/lib/query-keys.ts`
so mutations and queries can't drift.

```ts
// src/lib/query-keys.ts
export const qk = {
  catalog: ['catalog'] as const,
  categories: ['admin', 'categories'] as const,
  category: (id: string) => ['admin', 'categories', id] as const,
  products: ['admin', 'products'] as const,
  product: (id: string) => ['admin', 'products', id] as const,
  offers: ['admin', 'offers'] as const,
  shop: ['admin', 'shop'] as const,
  overview: ['admin', 'overview'] as const,
};
```

### 3.5 Reading in admin

```tsx
// src/app/(admin)/dashboard/products/page.tsx (client)
const { data: products, isPending, error } = useQuery({
  queryKey: qk.products,
  queryFn: async () => {
    const res = await fetch('/api/admin/products');
    if (!res.ok) throw new ApiError(await res.json());
    const { data } = (await res.json()) as ApiEnvelope<Product[]>;
    return data;
  },
});
```

### 3.6 Optimistic mutations
Every admin mutation follows the same three-phase pattern: `onMutate` (optimistic write +
snapshot), `onError` (rollback), `onSettled` (invalidate). The server route handler owns
`revalidateTag('catalog')`; the client mirrors by invalidating its queries.

```tsx
// src/components/admin/toggle-switch-usage.tsx (excerpt)
const qc = useQueryClient();

const toggleActive = useMutation({
  mutationFn: (p: Product) =>
    fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
  onMutate: async (p) => {
    await qc.cancelQueries({ queryKey: qk.products });
    const prev = qc.getQueryData<Product[]>(qk.products);
    qc.setQueryData<Product[]>(qk.products, (old) =>
      old?.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)),
    );
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx?.prev) qc.setQueryData(qk.products, ctx.prev);
    toast.error('Could not update — reverting.');
  },
  onSettled: () => qc.invalidateQueries({ queryKey: qk.products }),
});
```
Revalidation contract recap for the frontend:

- **Storefront** never calls revalidation; it just re-renders from the fetch cache, which
the tag invalidation refreshes.
- **Admin** invalidates its TanStack queries on `onSettled`. The *catalog* tag is
invalidated server-side by the mutation handler (Backend owns that call).
- Optional: `POST /api/admin/revalidate` (Backend) exists, the admin Overview "Revalidate"
button calls it for manual force-refresh (UX §4.6).

---

## 4. Cart Store (Zustand + persist)

### 4.1 Rationale
The cart is the only client state that must survive reloads. It lives in
`localStorage` via `zustand/persist`, keyed `cz.cart`. Prices are **snapshotted at
add-time for display**; the server is the price authority at checkout
(`POST /api/checkout/whatsapp` recomputes every line).

### 4.2 Store shape

```ts
// src/stores/cart.ts
'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Fulfilment = 'delivery' | 'pickup';

export interface CartItem {
  key: string;                 // `${productId}:${variantId ?? 'base'}`
  productId: string;
  variantId?: string | null;
  variantLabel?: string;       // "Regular × Extra Nutella" (display only)
  name: string;
  imageUrl?: string | null;
  unitPrice: number;           // SNAPSHOT at add: base + Σ variant deltas (display)
  offer?: {
    label: string;             // "−30%" / "2+1"
    originalPrice: number;     // for strikethrough display
    discountedPrice: number;
  } | null;
  quantity: number;
  stockQty: number | null;     // null = unlimited; snapshot for client-side guard
}

interface CartState {
  items: CartItem[];
  fulfilment: Fulfilment;
  _hasHydrated: boolean;
  add: (input: Omit<CartItem, 'key' | 'quantity'> & { quantity?: number }) => void;
  remove: (key: string) => void;
  setQty: (key: string, quantity: number) => void;
  clear: () => void;
  reorder: (items: CartItem[]) => void;
  setFulfilment: (f: Fulfilment) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      fulfilment: 'pickup',
      _hasHydrated: false,

      add: (input) =>
        set((s) => {
          const key = `${input.productId}:${input.variantId ?? 'base'}`;
          const existing = s.items.find((i) => i.key === key);
          const max = input.stockQty ?? Number.POSITIVE_INFINITY;
          const nextQty = Math.min((existing?.quantity ?? 0) + (input.quantity ?? 1), max);

          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, quantity: nextQty, stockQty: input.stockQty } : i,
              ),
            };
          }
          if (nextQty < 1) return s;
          return {
            items: [
              ...s.items,
              { ...input, key, quantity: nextQty, stockQty: input.stockQty ?? null },
            ],
          };
        }),

      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      setQty: (key, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) => {
              if (i.key !== key) return i;
              const max = i.stockQty ?? Number.POSITIVE_INFINITY;
              return { ...i, quantity: Math.min(Math.max(quantity, 1), max) };
            })
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),

      reorder: (items) =>
        set({ items: items.map((i) => ({ ...i, quantity: Math.max(1, i.quantity) })) }),

      setFulfilment: (fulfilment) => set({ fulfilment }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'cz.cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, fulfilment: s.fulfilment }),
      version: 1,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
```

### 4.3 Selectors (stable, re-render-safe)

```ts
// src/stores/cart.selectors.ts
import { useShallow } from 'zustand/react/shallow';
import { useCart } from '@/stores/cart';

export const useCartItems = () => useCart((s) => s.items);

export const useCartCount = () =>
  useCart(useShallow((s) => s.items.reduce((n, i) => n + i.quantity, 0)));

export const useCartSubtotal = () =>
  useCart(useShallow((s) => s.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0)));

export const useCartHydrated = () => useCart((s) => s._hasHydrated);
```

> Use `useShallow` so the bar re-renders only when the *derived* value changes (not on
every unrelated store write). Prices are `unitPrice` snapshots — the display math is
instant and free of async revalidation churn.

### 4.4 Edge cases
Edge caseHandlingSurvive reload / tab close`persist` → `localStorage`; `_hasHydrated` gates the FloatingCartBar so it never flashes empty.Duplicate product+variant`add()` merges by `key` and increments quantity; different `variantId` = separate line.Out-of-stock guard on add`add()`/`setQty()` clamp to `stockQty` (null = unlimited); a `+` at max is disabled with a "Max (n)" hint (UX §6.1.8).Price drift since snapshotA client `useCartCatalogSync` effect refetches `/api/catalog` on mount; items whose `unitPrice` or `is_active`/`stock` changed get an "may have changed" chip and updated `stockQty`; checkout recomputes authoritatively.Product became inactiveLine row shows "Unavailable" + removable (UX §9.3); still excluded from checkout by server.Empty cartFloatingCartBar hidden; CartSheet shows EmptyState; `clear()` guarded by the in-sheet 3 s confirm.Reorder`reorder(items)` repopulates from a saved line list (WhatsApp message preview doubles as the artifact; no server history exists by design).Versioned schema`version: 1` + `migrate()` so future store shape changes don't corrupt `localStorage`.
### 4.5 Companion: customer auto-fill (no PII server-side)

```ts
// src/lib/customer.ts
const KEY = 'cz.customer';
export function saveCustomer(name: string, phone: string) {
  localStorage.setItem(KEY, JSON.stringify({ name, phone }));
}
export function loadCustomer(): { name: string; phone: string } | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
export function clearCustomer() { localStorage.removeItem(KEY); }
```

### 4.6 Wiring to components

- **FloatingCartBar** — `useCartCount()`, `useCartSubtotal()`, `useCartHydrated()`.
Hidden at `count === 0`; badge pops on count change; `aria-label` carries the count.
- **CartSheet** — `useCartItems()` for rows, inline `QtyStepper` → `setQty`, remove → `remove`, fulfilment `RadioGroup` → `setFulfilment`, `clear()` with 3 s confirm.
- **ProductCard / ProductSheet** — `add({ productId, variantId, variantLabel, name, imageUrl, unitPrice, offer, stockQty })`.

---

## 5. Forms (react-hook-form + zod)

### 5.1 Shared schemas
Zod schemas live in `src/lib/validation/schemas.ts`, shared by client and server
(frontend defines the display copy; Backend owns the *authoritative* field constraints —
see §13). Frontend mirrors Backend's rules so UI errors match the server 400 codes 1:1.

```ts
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your name.')
  .max(50, 'Name must be under 50 characters.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}.' -]*$/u, 'Please use letters only.');

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^+\d]/g, ''))
  .pipe(z.string().regex(/^\+?\d{8,15}$/, 'Enter a valid phone number.'));

export const noteSchema = z
  .string()
  .max(120, 'Note must be under 120 characters.')
  .transform((v) => v.replace(/[\r\n\u0000-\u001F]/g, ' ').trim());

export const checkoutSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  note: noteSchema.optional().default(''),
  fulfilment: z.enum(['delivery', 'pickup']),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

### 5.2 CheckoutForm

```tsx
// src/components/storefront/checkout-form.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation/schemas';
import { loadCustomer, saveCustomer } from '@/lib/customer';

export function CheckoutForm({ totals, onSubmit }: CheckoutFormProps) {
  const customer = loadCustomer();
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      note: '',
      fulfilment: totals.defaultFulfilment,
    },
  });
  const { isSubmitting } = form.formState;

  const handleSubmit = form.handleSubmit(async (values) => {
    saveCustomer(values.name, values.phone);
    await onSubmit(values);
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField ... name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input placeholder="Priya Sharma" autoFocus {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      {/* phone: inputMode="tel", enterKeyHint="next", autoFill phone */}
      {/* note: Textarea maxLength 120 + counter */}
      {/* fulfilment: RadioGroup (delivery/pickup) inside a Fieldset */}
      <Button type="submit" variant="whatsapp" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Preparing…' : 'Send order on WhatsApp'}
      </Button>
    </form>
  );
}
```

### 5.3 Admin forms
`ProductForm`, `OfferForm`, `SettingsForm` use shadcn `Form` (which is a thin wrapper over
react-hook-form's `Controller`) inside a `Dialog` (or the settings page body). Shared
conventions:

```tsx
const form = useForm<ProductFormValues>({
  resolver: zodResolver(productSchema),
  defaultValues,
});
const dirty = form.formState.isDirty;
const isDirtyRef = useRef(dirty);
```

- Variant repeater in `ProductForm` = `useFieldArray` on `form.control`, each row rendered
by `SortableList`.
- `OfferForm` shows a live "Customer sees ~~₹299~~ ₹209" line; the *display* math uses
`lib/pricing/discount.ts` shared with Backend (parity contract — Backend is authority).
- `SettingsForm` maps every toggle 1:1 to a `shop_settings` column; submit →
`PUT /api/admin/shop` → toast "Saved — storefront updated".

### 5.4 Error display patterns
LayerPatternField validationshadcn `FormMessage` — inline under field, red text, `role="alert"`, `aria-describedby` on input; shown only after blur/submit.Checkout server `400`Top-of-form error banner (`ErrorBanner`), field values preserved, CTA re-enabled. Map `error.code` → message; unknown code → generic "We couldn't process your order."Admin mutation failureRollback optimistic write + `toast.error` (Sonner).Screen-readerField errors `role="alert"`; success/updates `role="status"`.Shake on invalid submit`motion.div` shake 2×20 px / 200 ms on the invalid field container (skipped under reduced motion).
---

## 6. shadcn/ui Theming

### 6.1 Tailwind theme tokens
Design tokens come from UX §5.1–5.4. Frontend's job: turn them into Tailwind theme
colors and shadcn CSS variables. Tailwind v4 `@theme` in the global CSS (v3 equivalent in
`tailwind.config.ts` if the project pins v3):

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-chocolate-50: #F7F0E8;
  --color-chocolate-100: #E9DBCC;
  --color-chocolate-200: #D3BCA4;
  --color-chocolate-300: #AD8A6E;
  --color-chocolate-400: #8A6247;
  --color-chocolate-500: #6F4E37;
  --color-chocolate-600: #5C3B2C;
  --color-chocolate-700: #462C22;
  --color-chocolate-800: #33201A;
  --color-chocolate-900: #241512;
  --color-chocolate-950: #1A0F0B;

  --color-cream-50: #FDFAF5;
  --color-cream-100: #F8F1E7;
  --color-cream-200: #F0E4D4;

  --color-gold-50: #FBF3DC;
  --color-gold-400: #DDB23C;
  --color-gold-500: #C9971E;
  --color-gold-600: #A87E14;

  --color-whatsapp-500: #25D366;
  --color-whatsapp-600: #1DA851;
  --color-whatsapp-700: #0E7A3F;

  --color-success: #15803D;
  --color-success-bg: #DCFCE7;
  --color-error: #B91C1C;
  --color-error-bg: #FEE2E2;
  --color-warning: #B45309;
  --color-warning-bg: #FEF3C7;
  --color-info: #1D4ED8;
  --color-info-bg: #DBEAFE;
}
```

### 6.2 shadcn CSS variables (light = storefront default)
Mapped per UX §5.6. The storefront is **always light**; `.dark` is admin-only and optional.

```
:root {
  --background: var(--color-cream-50);
  --foreground: var(--color-chocolate-950);
  --card: var(--color-cream-100);
  --card-foreground: var(--color-chocolate-950);
  --popover: var(--color-cream-50);
  --popover-foreground: var(--color-chocolate-950);
  --primary: var(--color-chocolate-800);
  --primary-foreground: var(--color-cream-50);
  --accent: var(--color-gold-500);
  --accent-foreground: var(--color-chocolate-950);
  --secondary: var(--color-chocolate-100);
  --secondary-foreground: var(--color-chocolate-800);
  --muted: var(--color-chocolate-100);
  --muted-foreground: var(--color-chocolate-600);
  --destructive: var(--color-error);
  --destructive-foreground: #FFFFFF;
  --border: var(--color-chocolate-200);
  --input: var(--color-chocolate-200);
  --ring: var(--color-gold-500);
  --radius: 0.5rem;
}
```
Price text uses `text-gold-600` (AA on cream, per UX §7.1) — gold-500 is graphics/badges only.

### 6.3 Primitive → component matrix
Storefront componentshadcn primitiveCustomizationProductSheet / CartSheet / CheckoutForm`Sheet` with `side="bottom"`90dvh max, rounded-t-2xl, drag handle, scroll lock; desktop: centered `max-w-lg`ProductCard offer badge`Badge` variant `gold`gold-500 bg, chocolate-950 textQtyStepper`Button` variant `ghost` (square) + custom pill44×44 targets, `rounded-full`FloatingCartBar`Button` (bar) + `Badge` (count)chocolate-800 bg, `shadow-lifted`CategoryChipscustom pills (`role="tablist"`)framer `layoutId` active pillOfferCarouselcustom snap-scroll (`ScrollArea` optional)`scroll-snap-type: x mandatory`CheckoutForm inputs`Input`, `Textarea`, `Label`, `RadioGroup`, `Form`gold focus ring, error statesOrder success`Alert`/custom panel + `Button` whatsappsuccess icon in whatsapp-greenSkeleton`Skeleton`chocolate-200 base, shimmerAdmin componentshadcn primitiveCustomizationDataTable`Table` + `DropdownMenu` (row ⋮) + `Input` (search)sortable headers (`aria-sort`), paginationToggleSwitch`Switch`chocolate-800 track / gold knobSortableListcustom + framer `Reorder`drag handles, keyboard fallback (deferred)ProductForm / OfferForm`Dialog` + `Form` + `Select` + `Checkbox` + `Input` + `Textarea`dirty close-confirmSettingsForm`Form` + `Switch` + `Input` + `Tabs`long-form page, not a dialogImageUploadcustom drop zone + `Progress`WebP re-encode, signed-URL PUTToasts`Sonner`success/error
### 6.4 Button / Input variant extensions
`src/components/ui/button.tsx` extends the shadcn `cva` variants:

```
buttonVariants = cva(base, {
  variants: {
    variant: {
      default: 'bg-chocolate-800 text-cream-50 hover:bg-chocolate-700',
      accent: 'bg-gold-500 text-chocolate-950 hover:bg-gold-400',
      whatsapp: 'bg-whatsapp-700 text-white hover:bg-whatsapp-600',
      outline: 'border-chocolate-300 bg-transparent text-chocolate-800 hover:bg-chocolate-50',
      ghost: 'hover:bg-chocolate-100 text-chocolate-800',
      destructive: 'bg-error text-white hover:bg-error/90',
    },
    size: {
      lg: 'h-13 px-6 text-sm font-medium',
      icon: 'size-11',
    },
  },
});
```
`Input` gets a gold focus ring via the existing `ring-ring/ring-offset` wiring; error
state is a `border-error + ring-error/20` variant class (`data-[invalid=true]:border-error`).

---

## 7. Framer Motion Patterns

### 7.1 Shared variants (`src/lib/motion.ts`)

```ts
// src/lib/motion.ts
export const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 26, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.18, ease: 'easeIn' } },
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export const stagger = (delay = 0.04) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

export const badgePop = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.35, 1], transition: { duration: 0.28 } },
};

export const addBounce = {
  initial: { scale: 0.7, opacity: 0 },
  animate: { scale: [0.7, 1.15, 1], opacity: 1, transition: { duration: 0.32 } },
};

export const numberFlip = (dir: 1 | -1 = 1) => ({
  initial: { opacity: 0, y: dir * 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.12 } },
});

export const shake = {
  animate: { x: [0, -20, 20, -10, 10, 0], transition: { duration: 0.2 } },
};
```

### 7.2 Sheets via AnimatePresence
Sheets are mounted once in the storefront layout (`SheetHost`) and animated with
`AnimatePresence` keyed on open-state, so open/close/switch never remount the tree:

```tsx
<AnimatePresence>
  {open && (
    <>
      <motion.div className="fixed inset-0 z-40 bg-chocolate-950/60" {...backdropVariants} onClick={close} />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-cream-50"
        variants={sheetVariants}
        initial="hidden" animate="visible" exit="exit"
        role="dialog" aria-modal="true" aria-labelledby={titleId}
      >
        {content}
      </motion.div>
    </>
  )}
</AnimatePresence>
```
Sheet UX contract (UX §3.3/§3.4): spring slide-up, backdrop dim, scroll lock, `Escape`
close, focus trap, focus return to the opening card.

### 7.3 Micro-interactions
InteractionPatternWhereCart badge pop`motion.span key={count}` + `badgePop`FloatingCartBarAdd-to-cart bounce`addBounce` on the stepper `+` pressProductCard/ProductSheetPrice / qty flip`AnimatePresence` + `numberFlip` on `key={value}`ProductSheet variant price, CartSheet totals, QtyStepperGrid entrance stagger`stagger(0.04)` on grid childrenHome first mount onlyCarousel parallax`useScroll` + `useTransform` scrimOfferCarouselOffer countdown`useCountdown(endsAt)` hook driving a text/ring; "Ends Aug 11" / "Ends in 2d 4h"OfferCarousel cardCart row removal`AnimatePresence` slide + height collapseCartSheetCategory active pill`motion.span layoutId="chip"`CategoryChips
### 7.4 Reduced motion
Wrap the app in `MotionConfig reducedMotion="user"` in the root layout:

```tsx
// src/app/layout.tsx
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```
This automatically downgrades scale/spring to opacity/fade for users with
`prefers-reduced-motion` (UX §7.5): sheet slide → fade, no stagger, no parallax, static
skeletons, no shake. All durations are 120–320 ms.

---

## 8. Routing & Navigation

### 8.1 Route tree (locked structure + additions)

```
src/app/
├── layout.tsx                        # root: fonts, metadataBase, MotionConfig
├── (storefront)/
│   ├── layout.tsx                    # cream shell, SheetHost, FloatingCartBar
│   ├── page.tsx                      # home (RSC, ISR)
│   ├── category/[slug]/page.tsx
│   └── product/[slug]/page.tsx
├── (admin)/
│   ├── login/page.tsx
│   └── dashboard/
│       ├── layout.tsx                # guard + AdminQueryProvider + shell nav
│       ├── page.tsx                  # overview (KPIs + quick toggles)
│       ├── categories/page.tsx
│       ├── products/page.tsx
│       ├── offers/page.tsx
│       └── settings/page.tsx
├── api/…                             # locked Route Handlers (Backend owns)
├── sitemap.ts                        # storefront pages only
└── robots.ts                         # admin noindex
```

### 8.2 Storefront layout & sticky category chips
`(storefront)/layout.tsx` is the shared shell: brand bar, content `<main>`, and the
`FloatingCartBar` + `SheetHost` mounted once (UX §2.1 — deep links always get a complete
page with the cart bar).

Sticky chips: `CategoryChips` is `sticky top-0 z-30` under a compressed brand bar once
scrolled past the hero. Implementation notes:

- The `#menu` anchor sits just above the grid; hero CTA scrolls to it via
  `document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })`.
- Grid container sets `scroll-mt-24` so sticky chips never cover the anchor.
- Active chip is URL-synced: `usePathname()` + `useRouter().push('/category/[slug]')`; the
  "All" chip routes home. Deep-link `?offer=<id>` keeps the offer-filtered grid a real URL.
- Tab semantics: `role="tablist"`/`role="tab"` + `aria-selected`, arrow-key focus
  (UX §6.1.3).

### 8.3 Bottom navigation

- **Storefront:** no bottom nav — the `FloatingCartBar` occupies the bottom thumb zone
  (single purpose: open cart). Hero CTA and chips provide navigation.
- **Admin (< lg):** a bottom tab bar mirrors the sidebar (Overview / Categories / Products /
  Offers / Settings) using `usePathname` to set active tab; ≥ lg the sidebar renders
  instead (UX §8.3). Both share one `nav.tsx` config array.

### 8.4 Deep links

- `/category/[slug]` → server-rendered grid + chips; unknown/inactive → `notFound()` →
  EmptyState "Category not found" (UX §3.2).
- `/product/[slug]` → full SSR page + `ProductDeepLink` which auto-opens `ProductSheet`
  after hydration *only when the route is a real product* (server content is the
  no-JS fallback, per UX §2.1/§3.3).

```tsx
// src/components/storefront/product-deep-link.tsx
'use client';
export function ProductDeepLink({ detail }: { detail: ProductDetail }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);
  return <ProductSheet open={open} onOpenChange={setOpen} initialDetail={detail} />;
}
```

---

## 9. Loading, Error & Empty States
Reusable components in `src/components/storefront/` (used by RSC via `<Suspense>`
fallbacks and by client components):

ComponentFileUsed for`CatalogSkeleton``catalog-skeleton.tsx`Home page fallback: brand bar, hero shimmer, carousel placeholder, chips, card skeletons (`aria-hidden`, shimmer respects reduced motion)`ProductCardSkeleton``product-card-skeleton.tsx`Grid loading`SheetSkeleton``sheet-skeleton.tsx`ProductSheet while `/api/products/[id]` resolves (client)`EmptyState``empty-state.tsx`Empty cart, empty grid ("Nothing here right now"), category-not-found; `role="status"`; CTA slot (BROWSE MENU / BROWSE ALL)`ErrorState``error-state.tsx`Grid/catalog error + Retry; used as the `error.tsx` boundary visual`ErrorBanner``error-banner.tsx`Checkout/API 400 top-of-form banner`ClosedBanner``closed-banner.tsx`Closed / ordering-paused ribbon + disabled-CTA tooltips (UX §3.8)
Suspense strategy (home):

```
<Suspense fallback={<CatalogSkeleton />}>
  <Hero />
  <OfferCarousel offers={catalog.offers} />
  <CategoryChips categories={catalog.categories} />
  <ProductGrid products={catalog.products} />
</Suspense>
```

Page-level boundaries:

- `(storefront)/loading.tsx` → `CatalogSkeleton` (covers navigation between storefront routes).
- `(storefront)/error.tsx` → `ErrorState` with `reset()` (client boundary, keeps nav usable).
- `product/[slug]/error.tsx` → sheet-compatible error fallback.
- Admin pages: TanStack `isPending` → skeleton rows in `DataTable` / skeleton KPI cards;
  query `error` → `ErrorState` + retry (`queryClient.refetchQueries`).

---

## 10. SEO & Social

### 10.1 Root metadata

```ts
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Chocolate Zone · Handcrafted Desserts', template: '%s · Chocolate Zone' },
  description: 'Order waffles, brownies, cakes and chocolates for pickup or delivery. No apps, no accounts — order on WhatsApp.',
  openGraph: { type: 'website', siteName: 'Chocolate Zone', locale: 'en_IN', images: ['/og/default.png'] },
  twitter: { card: 'summary_large_image' },
};
```

### 10.2 Product page (WhatsApp/Instagram previews)
Product metadata (from §3.1) yields a rich card: title with price, description,
absolute OG image from Supabase storage. Absolute URLs are mandatory for WhatsApp and
Instagram scrapers — `metadataBase` + `publicImageUrl()` (from `lib/supabase` helpers)
guarantee them.

```ts
// src/lib/images.ts
export function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
```

### 10.3 Sitemap / robots

- `src/app/sitemap.ts` → home + all active categories/products (read from `getCatalog()`; ISR-compatible).
- `src/app/robots.ts` → allow storefront, disallow `/admin` and `/api`.
- `(admin)/dashboard/layout.tsx` sets `export const metadata = { robots: { index: false, follow: false } }` so admin is never indexed.
- Optional V1: per-product `JSON-LD` `Product` schema with price + offer markup.

---

## 11. Performance

### 11.1 `next/image` + Supabase storage

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') ?? '*.supabase.co' },
    ],
  },
  experimental: {
    allowedHosts: ['.monkeycode-ai.live'],
  },
};
```
Usage rules:

- Product images: `aspect-4/3`, `<Image fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw">`, `priority` only on the LCP hero/first images, `loading="lazy"` (default) below the fold.
- Reserve image boxes (`aspect-ratio` + explicit container) to keep CLS < 0.1.

### 11.2 Code-splitting & lazy loading

```tsx
// storefront layout (client) — sheets and checkout never ship on first paint
const CartSheet = dynamic(() => import('@/components/storefront/cart-sheet'), { ssr: true });
const ProductSheet = dynamic(() => import('@/components/storefront/product-sheet'), { ssr: true });
const CheckoutForm = dynamic(() => import('@/components/storefront/checkout-form'), { ssr: true });
```

- `ssr: true` keeps deep links server-renderable; `dynamic()` gives route-level splitting.
- `OfferCarousel`, `CheckoutForm`, admin dialogs are separately bundled.
- Admin route group is naturally split from storefront by App Router.
- No Framer Motion import in RSC — only client components import it.

### 11.3 Skeleton loaders
`CatalogSkeleton`, `ProductCardSkeleton`, `SheetSkeleton`, `DataTable` skeleton rows:
fixed dimensions (no layout shift), `aria-hidden`, shimmer disabled under reduced motion.

### 11.4 Budgets (PRD §5.1)
MetricBudgetLCP< 2 s on mid-range phone (4G, throttled) — launch gateCLS< 0.1INP< 200 msFirst Load JS (storefront)< ~170 KB gzip client JSImage budgetWebP, `sizes` everywhere, no unoptimized imagesVerification: bundle analyzer in CI, Lighthouse/WebPageTest per release, and the QA
device-matrix run (QA owns the measurement method).

---

## 12. Implementation Checklist (component → folder mapping)
Storefront build order:

#TaskFile1Tailwind tokens + shadcn vars + fonts`globals.css`, `app/layout.tsx`2`getCatalog()`/`getProductDetail()` + domain types`lib/data/catalog.ts`, `types/domain.ts`3Home RSC + loading/error boundaries`app/(storefront)/page.tsx`, `loading.tsx`, `error.tsx`4Cart store + selectors`stores/cart.ts`, `stores/cart.selectors.ts`5SheetHost + motion primitives`components/storefront/sheet-host.tsx`, `lib/motion.ts`6ProductCard + QtyStepper + grid`components/storefront/{product-card,qty-stepper,product-grid}.tsx`7ProductSheet + variant math + offer strikethrough`components/storefront/product-sheet.tsx`8FloatingCartBar + CartSheet`components/storefront/{floating-cart-bar,cart-sheet}.tsx`9CategoryChips + sticky behavior`components/storefront/category-chips.tsx`10OfferCarousel + countdown`components/storefront/offer-carousel.tsx`, `hooks/use-countdown.ts`11CheckoutForm + OrderSuccess + WhatsApp open/fallback`components/storefront/{checkout-form,order-success}.tsx`12Category + product pages + deep-link + SEO`app/(storefront)/category/[slug]/`, `product/[slug]/`, `sitemap.ts`13Cart↔catalog hydration sync`hooks/use-cart-catalog-sync.ts`
Admin build order:

#TaskFile14AdminQueryProvider + query keys`components/admin/query-provider.tsx`, `lib/query-keys.ts`15Login (magic link)`app/(admin)/login/page.tsx`16Dashboard shell + bottom tabs`app/(admin)/dashboard/layout.tsx`17ToggleSwitch + DataTable + SortableList`components/admin/{toggle-switch,data-table,sortable-list}.tsx`18ImageUpload (WebP → signed URL → PUT)`components/admin/image-upload.tsx`19Categories CRUD`app/(admin)/dashboard/categories/page.tsx`20Products CRUD + variants repeater`app/(admin)/dashboard/products/page.tsx`, `components/admin/product-form.tsx`21Offers CRUD + preview math`app/(admin)/dashboard/offers/page.tsx`, `components/admin/offer-form.tsx`22Settings CRUD`app/(admin)/dashboard/settings/page.tsx`, `components/admin/settings-form.tsx`23Overview KPIs + quick toggles`app/(admin)/dashboard/page.tsx`24Analytics (Plausible) events — no PII`lib/analytics.ts`
---

## 13. Inputs Needed (from other agents)
FromNeededBlocks**Backend**Exact Zod constraints for name/phone/note (frontend schemas must match 1:1)§5.1 forms**Backend**`{ error }` envelope code enum (UI maps `error.code` → copy)§5.4 error display**Backend**`data` shapes for `GET /api/catalog` and `GET /api/products/[id]` (so `types/domain.ts` is finalized)§3.1, §12 #2**Backend**Confirm `/api/catalog` + `/api/products/[id]` GET handlers are fetch-cacheable for ISR and that mutation handlers call `revalidateTag('catalog')`; optional `POST /api/admin/revalidate`§3.1, §3.6**Backend**Whether `/api/catalog` supports `?category=`/`?offer=` filtering server-side or all-filtering is client-side§8.2 chips**UX Designer**Final AA-safe hex for the WhatsApp order CTA (lock into `--color-whatsapp-700`)§6.1**UX Designer**Confirm `MotionConfig reducedMotion="user"` global and shadcn `Sheet` as the sheet shell base§7**UX Designer**Final token export (hex values) so `@theme` is locked§6.1**WhatsApp Expert**`waUrl` format + phone normalization; `web.whatsapp.com` fallback URL shape§11 (success flow), CheckoutForm**WhatsApp Expert**Order-message template field order (frontend preview + copy fallback render it)OrderSuccess**Database Engineer**`timings` jsonb shape (per-day open/close, holiday flag) so the open/closed derivation parses itOpenClosedChip**Supabase Expert**Storage public-URL pattern (bucket path) so `publicImageUrl()` + `remotePatterns` are exact§10.2, §11.1**PM**Whether "pre-order while closed" is in scope (affects CTA states)ClosedBanner
## 14. Deferred

- **Offline cart-restore toast** (PRD V11-5) — cart persistence works; the toast is a V1.1 nicety.
- **Admin dark mode** — `.dark` palette sketched in UX §5.6; storefront stays light by design.
- **SortableList keyboard-fallback** (up/down buttons) if drag-reorder complexity exceeds MVP — flagged by UX §11.
- **Currency picker UI** in SettingsForm — display-only for MVP.
- **Attribution / entry-point analytics** — no tracking in MVP; identical entry flows (UX §11).
- **Per-product JSON-LD schema** — optional V1 enhancement.
- **Multi-language / i18n** — explicitly out of MVP scope (PRD §9).

---

### Revision history
RevDateAuthorChangev12026-08-04Frontend DeveloperInitial from locked ARCHITECTURE.md v1, UX spec v1, PRD v1
