'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminProduct, type Category } from '@/lib/admin/client';
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
}

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
  };
}

function toForm(p: AdminProduct): ProductForm {
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
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm(''));

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([adminApi.categories.list(), adminApi.products.list()]);
      setCategories(catRes.categories);
      setProducts(prodRes.products);
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
    setDialogOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setForm(toForm(p));
    setDialogOpen(true);
  };

  const submit = async () => {
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
      if (editing) await adminApi.products.update(editing.id, payload);
      else await adminApi.products.create(payload);
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save product.');
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
        <Field label="Category" htmlFor="prod-category">
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
        <Field label="Name" htmlFor="prod-name">
          <TextInput id="prod-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Milk chocolate bar" />
        </Field>
        <Field label="Description" htmlFor="prod-desc">
          <TextArea id="prod-desc" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Rich, creamy milk chocolate…" />
        </Field>
        <Field label="Base price (₹)" htmlFor="prod-price" hint="Use decimal rupees, e.g. 149.50.">
          <TextInput id="prod-price" type="number" value={form.base_price} onChange={(v) => setForm({ ...form, base_price: v })} placeholder="149.50" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort order" htmlFor="prod-sort">
            <TextInput id="prod-sort" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
          </Field>
          <Field label="Stock qty" htmlFor="prod-stock" hint="Leave blank for unlimited.">
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
            <h3 className="text-sm font-semibold text-zinc-900">Variants</h3>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              + Add variant
            </button>
          </div>
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
