'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminOffer, type AdminProduct } from '@/lib/admin/client';
import { DataTable, type Column } from '@/components/admin/data-table';
import { CrudDialog } from '@/components/admin/crud-dialog';
import { Field, TextInput, TextArea, Toggle } from '@/components/admin/form-field';
import { LoadingState } from '@/components/admin/loading';
import { EmptyState } from '@/components/admin/empty-state';

interface OfferForm {
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  applies_to_all: boolean;
  product_ids: string[];
  starts_at: string;
  ends_at: string;
  sort_order: string;
  is_active: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toForm(o: AdminOffer): OfferForm {
  return {
    title: o.title,
    description: o.description ?? '',
    discount_type: o.discount_type,
    discount_value:
      o.discount_type === 'fixed' ? (o.discount_value / 100).toFixed(2) : String(o.discount_value),
    applies_to_all: o.applies_to_all,
    product_ids: o.product_ids,
    starts_at: toLocalInput(o.starts_at),
    ends_at: toLocalInput(o.ends_at),
    sort_order: String(o.sort_order),
    is_active: o.is_active,
  };
}

const emptyForm: OfferForm = {
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  applies_to_all: true,
  product_ids: [],
  starts_at: '',
  ends_at: '',
  sort_order: '0',
  is_active: true,
};

function formatDiscount(o: AdminOffer): string {
  return o.discount_type === 'percentage' ? `${o.discount_value}%` : `₹${(o.discount_value / 100).toFixed(2)} off`;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);

  const load = useCallback(async () => {
    try {
      const [offerRes, prodRes] = await Promise.all([adminApi.offers.list(), adminApi.products.list()]);
      setOffers(offerRes.offers);
      setProducts(prodRes.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load offers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openCreate = () => {    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (o: AdminOffer) => {
    setEditing(o);
    setForm(toForm(o));
    setDialogOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value:
          form.discount_type === 'percentage'
            ? Math.round(Number(form.discount_value))
            : Math.round(Number(form.discount_value) * 100),
        applies_to_all: form.applies_to_all,
        product_ids: form.applies_to_all ? [] : form.product_ids,
        starts_at: toIso(form.starts_at),
        ends_at: toIso(form.ends_at),
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: form.is_active,
      };
      if (editing) await adminApi.offers.update(editing.id, payload);
      else await adminApi.offers.create(payload);
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save offer.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (o: AdminOffer) => {
    if (!window.confirm(`Delete offer "${o.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await adminApi.offers.remove(o.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete offer.');
    }
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter((x) => x !== id)
        : [...f.product_ids, id],
    }));
  };

  const columns: Column<AdminOffer>[] = [
    { key: 'title', header: 'Title', render: (o) => <span className="font-medium text-zinc-900">{o.title}</span> },
    { key: 'discount', header: 'Discount', render: (o) => formatDiscount(o), hideOnMobile: true },
    {
      key: 'scope',
      header: 'Applies to',
      render: (o) =>
        o.applies_to_all ? (
          <span className="text-sm text-zinc-600">All products</span>
        ) : o.product_ids.length === 0 ? (
          <span className="text-sm text-zinc-400">None</span>
        ) : (
          <span className="text-xs text-zinc-500">{o.product_ids.length} product{o.product_ids.length === 1 ? '' : 's'}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${o.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
          {o.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Offers</h1>
          <p className="mt-1 text-sm text-zinc-500">Create discounts and promotions for your products.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          New offer
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : offers.length === 0 ? (
        <EmptyState
          title="No offers yet"
          description="Create your first offer to start driving sales."
          actionLabel="New offer"
          onAction={openCreate}
        />
      ) : (
        <DataTable columns={columns} rows={offers} rowKey={(o) => o.id} onEdit={openEdit} onDelete={remove} />
      )}

      <CrudDialog
        open={dialogOpen}
        title={editing ? `Edit "${editing.title}"` : 'New offer'}
        description="Percentage discounts use whole percents; fixed discounts use rupees."
        busy={busy}
        error={error}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      >
        <Field label="Title" htmlFor="offer-title">
          <TextInput id="offer-title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Festive special" />
        </Field>
        <Field label="Description" htmlFor="offer-desc">
          <TextArea id="offer-desc" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Shown to customers on the menu." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="offer-type">
            <select
              id="offer-type"
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>
          <Field
            label={form.discount_type === 'percentage' ? 'Percent off' : 'Amount off (₹)'}
            htmlFor="offer-value"
          >
            <TextInput
              id="offer-value"
              type="number"
              value={form.discount_value}
              onChange={(v) => setForm({ ...form, discount_value: v })}
              placeholder={form.discount_type === 'percentage' ? '10' : '50'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" htmlFor="offer-starts">
            <TextInput id="offer-starts" type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} />
          </Field>
          <Field label="Ends" htmlFor="offer-ends">
            <TextInput id="offer-ends" type="datetime-local" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort order" htmlFor="offer-sort">
            <TextInput id="offer-sort" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
          </Field>
          <div className="flex items-end pb-1">
            <Toggle id="offer-active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Offer is active" />
          </div>
        </div>

        <Toggle
          id="offer-all"
          checked={form.applies_to_all}
          onChange={(v) => setForm({ ...form, applies_to_all: v, product_ids: v ? [] : form.product_ids })}
          label="Apply to all products"
        />

        {!form.applies_to_all && (
          <div className="rounded-lg border border-zinc-200">
            <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500">
              Select products ({form.product_ids.length} selected)
            </div>
            <div className="max-h-52 overflow-y-auto p-2">
              {products.length === 0 ? (
                <p className="px-2 py-3 text-sm text-zinc-400">No products available.</p>
              ) : (
                <div className="space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={form.product_ids.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200"
                      />
                      <span className="text-zinc-700">{p.name}</span>
                      <span className="ml-auto text-xs text-zinc-400">₹{(p.base_price / 100).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CrudDialog>
    </div>
  );
}
