'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type Category } from '@/lib/admin/client';
import { DataTable, type Column } from '@/components/admin/data-table';
import { CrudDialog } from '@/components/admin/crud-dialog';
import { Field, TextInput, Toggle } from '@/components/admin/form-field';
import { LoadingState } from '@/components/admin/loading';
import { EmptyState } from '@/components/admin/empty-state';

interface CategoryForm {
  name: string;
  slug: string;
  emoji: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: CategoryForm = { name: '', slug: '', emoji: '', sort_order: '0', is_active: true };

function toForm(c: Category): CategoryForm {
  return {
    name: c.name,
    slug: c.slug,
    emoji: c.emoji ?? '',
    sort_order: String(c.sort_order),
    is_active: c.is_active,
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.categories.list();
      setCategories(res.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm(toForm(c));
    setDialogOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        emoji: form.emoji.trim() || null,
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: form.is_active,
      };
      if (editing) await adminApi.categories.update(editing.id, payload);
      else await adminApi.categories.create(payload);
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await adminApi.categories.remove(c.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category.');
    }
  };

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.emoji && <span className="text-lg" aria-hidden="true">{c.emoji}</span>}
          <span className="font-medium text-zinc-900">{c.name}</span>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (c) => <code className="text-xs text-zinc-500">{c.slug}</code>, hideOnMobile: true },
    { key: 'sort', header: 'Order', render: (c) => c.sort_order, hideOnMobile: true },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
          {c.is_active ? 'Active' : 'Hidden'}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Categories</h1>
          <p className="mt-1 text-sm text-zinc-500">Organize your menu into sections.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          New category
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your first category to start organizing your menu."
          actionLabel="New category"
          onAction={openCreate}
        />
      ) : (
        <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} onEdit={openEdit} onDelete={remove} />
      )}

      <CrudDialog
        open={dialogOpen}
        title={editing ? `Edit "${editing.name}"` : 'New category'}
        description="Categories group products into sections on your menu."
        busy={busy}
        error={error}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      >
        <Field label="Name" htmlFor="cat-name" error={error?.includes('name') ? error : undefined}>
          <TextInput id="cat-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Chocolates" />
        </Field>
        <Field label="Slug" htmlFor="cat-slug" hint="Lowercase letters, numbers and hyphens. Leave blank to auto-generate.">
          <TextInput id="cat-slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="chocolates" />
        </Field>
        <Field label="Emoji" htmlFor="cat-emoji" hint="Shown next to the category on the menu.">
          <TextInput id="cat-emoji" value={form.emoji} onChange={(v) => setForm({ ...form, emoji: v })} placeholder="🍫" />
        </Field>
        <Field label="Sort order" htmlFor="cat-sort" hint="Lower numbers appear first.">
          <TextInput id="cat-sort" type="number" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
        </Field>
        <Toggle id="cat-active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Visible on the menu" />
      </CrudDialog>
    </div>
  );
}
