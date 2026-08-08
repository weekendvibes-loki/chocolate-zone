'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin/client';
import { shopSettingsInputSchema } from '@/lib/validation/schemas';
import { Field, TextInput } from '@/components/admin/form-field';
import { LoadingState } from '@/components/admin/loading';
import { useToast } from '@/components/admin/toast';

export default function SettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const { settings } = await adminApi.settings.get();
      setWhatsappNumber(settings.whatsapp_number ?? '');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load shop settings.';
      setError(message);
      toast('error', message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const validate = (value: string): string | null => {
    const r = shopSettingsInputSchema.shape.whatsapp_number.safeParse(value);
    return r.success ? null : (r.error.issues[0]?.message ?? 'Enter a valid WhatsApp number.');
  };

  const save = async () => {
    const err = validate(whatsappNumber);
    setFieldError(err);
    setTouched(true);
    if (err) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.settings.update({ whatsapp_number: whatsappNumber.trim() });
      toast('success', 'Shop settings saved.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save shop settings.';
      setError(message);
      toast('error', message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-zinc-900">Shop Settings</h1>
        <div className="mt-6">
          <LoadingState rows={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Shop Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Configure how your store receives orders.</p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="max-w-md">
          <Field
            label="WhatsApp / Order Receiving Number"
            htmlFor="settings-whatsapp"
            error={touched ? (fieldError ?? undefined) : undefined}
            hint="Orders from checkout will be sent to this WhatsApp number."
          >
            <TextInput
              id="settings-whatsapp"
              type="tel"
              value={whatsappNumber}
              onChange={(v) => {
                setWhatsappNumber(v);
                if (touched) setFieldError(validate(v));
              }}
              placeholder="e.g. 919876543210"
              disabled={busy}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && (
              <span
                className="size-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-white"
                aria-hidden="true"
              />
            )}
            {busy ? 'Saving…' : 'Save'}
          </button>
          {!busy && (
            <button
              type="button"
              onClick={() => {
                setTouched(false);
                setFieldError(null);
                setError(null);
                void load();
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
