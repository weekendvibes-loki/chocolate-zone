'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiClientError, type AdminProduct, type AdminOffer, type Category } from '@/lib/admin/client';
import { DataTable, type Column } from '@/components/admin/data-table';
import { CrudDialog } from '@/components/admin/crud-dialog';
import { Field, TextInput, TextArea, Toggle } from '@/components/admin/form-field';
import { LoadingState } from '@/components/admin/loading';
import { EmptyState } from '@/components/admin/empty-state';

interface VariantForm {
  id?: string;
  name: string;
  option: string;
  price_delta: string;
  is_active: boolean;
}

interface ProductForm {
  category_id: string;
  name: string;
  description: string;
  base_price: string;
  is_veg: boolean;
  is_featured: boolean;
  stock_qty: string;
  sort_order: string;
  is_active: boolean;
  variants: VariantForm[];
  offer_ids: string[];
}

interface FormErrors {
  category_id?: string;
  name?: string;
  base_price?: string;
  stock_qty?: string;
  variants?: string;
}

const emptyErrors: FormErrors = {};

function emptyProductForm(categoryId: string): ProductForm {
  return {
    category_id: categoryId,
    name: '',
    description: '',
    base_price: '',
    is_veg: true,
    is_featured: false,
    stock_qty: '',
    sort_order: '0',
    is_active: true,
    variants: [],
    offer_ids: [],
  };
}

function toForm(p: AdminProduct, offers: AdminOffer[]): ProductForm {
  return {
    category_id: p.category_id,
    name: p.name,
    description: p.description ?? '',
    base_price: (p.base_price / 100).toFixed(2),
    is_veg: p.is_veg ?? true,
    is_featured: p.is_featured,
    stock_qty: p.stock_qty === null ? '' : String(p.stock_qty),
    sort_order: String(p.sort_order),
    is_active: p.is_active,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      option: v.option,
      price_delta: (v.price_delta / 100).toFixed(2),
      is_active: v.is_active,
    })),
    offer_ids: offers.filter((o) => !o.applies_to_all && o.product_ids.includes(p.id)).map((o) => o.id),
  };
}

function toMinorRupees(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validateProduct(form: ProductForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.category_id) errors.category_id = 'Select a category.';
  if (!form.name.trim()) errors.name = 'Name is required.';
  const price = toMinorRupees(form.base_price);
  if (price === null) errors.base_price = 'Enter a valid price.';
  else if (price <= 0) errors.base_price = 'Price must be greater than zero.';
  if (form.stock_qty !== '') {
    const qty = Number(form.stock_qty);
    if (!Number.isInteger(qty) || qty < 0) errors.stock_qty = 'Stock must be a whole number of 0 or more.';
  }
  const seen = new Set<string>();
  for (const v of form.variants) {
    const group = v.name.trim().toLowerCase();
    const option = v.option.trim().toLowerCase();
    if (!group || !option) {
      errors.variants = 'Every variant needs a group and an option.';
      break;
    }
    const key = `${group}|${option}`;
    if (seen.has(key)) {
      errors.variants = `Duplicate variant "${v.name.trim()} — ${v.option.trim()}".`;
      break;
    }
    seen.add(key);
  }
  return errors;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>(emptyErrors);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm(''));

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes, offerRes] = await Promise.all([
        adminApi.categories.list(),
        adminApi.products.list(),
        adminApi.offers.list(),
      ]);
      setCategories(catRes.categories);
      setProducts(prodRes.products);
      setOffers(offerRes.offers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProductForm(categories[0]?.id ?? ''));
    setFormErrors(emptyErrors);
    setDialogOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setForm(toForm(p, offers));
    setFormErrors(emptyErrors);
    setDialogOpen(true);
  };

  const applyServerErrors = (e: unknown) => {
    if (e instanceof ApiClientError && e.code === 'VALIDATION_ERROR' && e.details) {
      const fields = (e.details as { fields?: { fieldErrors?: Record<string, string[]> } }).fields?.fieldErrors;
      if (fields) {
        const next: FormErrors = {};
        if (fields.category_id) next.category_id = fields.category_id[0];
        if (fields.name) next.name = fields.name[0];
        if (fields.base_price) next.base_price = fields.base_price[0];
        if (fields.stock_qty) next.stock_qty = fields.stock_qty[0];
        if (fields.variants) next.variants = fields.variants[0];
        setFormErrors(next);
      }
      setError(e.message);
      return;
    }
    setError(e instanceof Error ? e.message : 'Failed to save product.');
  };

  const syncOffers = async (productId: string) => {
    const target = new Set(form.offer_ids);
    const changed = offers.filter((o) => !o.applies_to_all && o.product_ids.includes(productId) !== target.has(o.id));
    for (const o of changed) {
      const product_ids = target.has(o.id)
        ? Array.from(new Set([...o.product_ids, productId]))
        : o.product_ids.filter((id) => id !== productId);
      await adminApi.offers.update(o.id, {
        title: o.title,
        description: o.description,
        image_url: o.image_url,
        discount_type: o.discount_type,
        discount_value: o.discount_value,
        applies_to_all: o.applies_to_all,
        product_ids,
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        is_active: o.is_active,
        sort_order: o.sort_order,
      });
    }
  };

  const submit = async () => {
    const validation = validateProduct(form);
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const payload = {
        category_id: form.category_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        base_price: Math.round(Number(form.base_price) * 100),
        is_veg: form.is_veg,
        is_featured: form.is_featured,
        stock_qty: form.stock_qty === '' ? null : Math.max(0, parseInt(form.stock_qty, 10) || 0),
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: form.is_active,
        variants: form.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name.trim(),
          option: v.option.trim(),
          price_delta: Math.round(Number(v.price_delta) * 100) || 0,
          is_active: v.is_active,
        })),
      };
      if (editing) {
        await adminApi.products.update(editing.id, payload);
        await syncOffers(editing.id);
      } else {
        const created = await adminApi.products.create(payload);
        await syncOffers(created.product.id);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      applyServerErrors(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AdminProduct) => {
    if (!window.confirm(`Hide "${p.name}"? It will no longer appear on the menu.`)) return;
    setError(null);
    try {
      await adminApi.products.remove(p.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hide product.');
    }
  };

  const updateVariant = (i: number, patch: Partial<VariantForm>) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));
  };

  const addVariant = () => {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: 'Size', option: '', price_delta: '0', is_active: true }] }));
  };

  const removeVariant = (i: number) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  };

  const toggleOffer = (offerId: string) => {
    setForm((f) => ({
      ...f,
      offer_ids: f.offer_ids.includes(offerId)
        ? f.offer_ids.filter((id) => id !== offerId)
        : [...f.offer_ids, offerId],
    }));
  };

  const columns: Column<AdminProduct>[] = [
    { key: 'name', header: 'Name', render: (p) => <span className="font-medium text-zinc-900">{p.name}</span> },
    { key: 'category', header: 'Category', render: (p) => categoryName(p.category_id), hideOnMobile: true },
    {
      key: 'price',
      header: 'Base price',
      render: (p) => (
        <span className="font-medium text-zinc-700">₹{(p.base_price / 100).toFixed(2)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'variants',
      header: 'Variants',
      render: (p) => <span className="text-xs text-zinc-500">{p.variants.length || '—'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
          {p.is_active ? 'Active' : 'Hidden'}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your menu items and variants.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          New product
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start building your menu."
          actionLabel="New product"
          onAction={openCreate}
        />
      ) : (
        <DataTable columns={columns} rows={products} rowKey={(p) => p.id} onEdit={openEdit} onDelete={remove} />
      )}

      <CrudDialog
        open={dialogOpen}
        title={editing ? `Edit "${editing.name}"` : 'New product'}
        description="Prices are in rupees; they are converted to paise for storage."
        busy={busy}
        error={error}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      >
        <Field label="Category" htmlFor="prod-category" error={formErrors.category_id}>
          <select
            id="prod-category"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            <option value="" disabled>Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Name" htmlFor="prod-name" error={formErrors.name}>
          <TextInput id="prod-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Milk chocolate bar" />
        </Field>
        <Field label="Description" htmlFor="prod-desc">
          <TextArea id="prod-desc" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Rich, creamy milk chocolate…" />
        </Field>
        <Field label="Base price (₹)" htmlFor="prod-price" hint="Use decimal rupees, e.g. 149.50." error={formErrors.base_price}>
          <TextInput id="prod-price" type="number" value={form.base_price} onChange={(v) => setForm({ ...form, base_price: v })} placeholder="149.50" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort order" htmlFor="prod-sort">
            <TextInput id="prod-sort" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
          </Field>
          <Field label="Stock qty" htmlFor="prod-stock" hint="Leave blank for unlimited." error={formErrors.stock_qty}>
            <TextInput id="prod-stock" type="number" value={form.stock_qty} onChange={(v) => setForm({ ...form, stock_qty: v })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Toggle id="prod-veg" checked={form.is_veg} onChange={(v) => setForm({ ...form, is_veg: v })} label="Vegetarian" />
          <Toggle id="prod-featured" checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} label="Featured" />
          <Toggle id="prod-active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Visible on menu" />
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Offers</h3>
          </div>
          {offers.filter((o) => !o.applies_to_all).length === 0 ? (
            <p className="text-sm text-zinc-400">No product-specific offers yet.</p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {offers
                .filter((o) => !o.applies_to_all)
                .map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={form.offer_ids.includes(o.id)}
                      onChange={() => toggleOffer(o.id)}
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200"
                    />
                    <span className="text-zinc-700">{o.title}</span>
                    <span className="ml-auto text-xs text-zinc-400">
                      {o.discount_type === 'percentage' ? `${o.discount_value}% off` : `₹${(o.discount_value / 100).toFixed(2)} off`}
                    </span>
                  </label>
                ))}
            </div>
          )}
          <p className="mt-1 text-xs text-zinc-400">Offers that apply to all products are applied automatically.</p>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Variants</h3>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              + Add variant
            </button>
          </div>
          {formErrors.variants && (
            <p className="mb-2 text-xs text-red-600">{formErrors.variants}</p>
          )}
          {form.variants.length === 0 ? (
            <p className="text-sm text-zinc-400">No variants. Products without variants are sold as-is.</p>
          ) : (
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_110px_auto]">
                    <input
                      value={v.name}
                      onChange={(e) => updateVariant(i, { name: e.target.value })}
                      placeholder="Group (e.g. Size)"
                      aria-label="Variant group"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                    <input
                      value={v.option}
                      onChange={(e) => updateVariant(i, { option: e.target.value })}
                      placeholder="Option (e.g. Large)"
                      aria-label="Variant option"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={v.price_delta}
                      onChange={(e) => updateVariant(i, { price_delta: e.target.value })}
                      placeholder="Δ ₹"
                      aria-label="Variant price delta"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        aria-label="Remove variant"
                        className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-right">
                    <Toggle
                      id={`variant-active-${i}`}
                      checked={v.is_active}
                      onChange={(val) => updateVariant(i, { is_active: val })}
                      label="Active"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CrudDialog>
    </div>
  );
}
