'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin/client';
import { shopSettingsInputSchema } from '@/lib/validation/schemas';
import { Field, TextInput, TextArea, Toggle } from '@/components/admin/form-field';
import { LoadingState } from '@/components/admin/loading';
import { useToast } from '@/components/admin/toast';
import type { TimingRule } from '@/types/domain';

const WEEK_DAYS: { value: string; label: string }[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

function dayLabel(day: number | string): string {
  if (day === 'all') return 'All days';
  const rule = WEEK_DAYS.find((d) => d.value === String(day));
  return rule?.label ?? `Day ${day}`;
}

export default function SettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappOrderingEnabled, setWhatsappOrderingEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [timings, setTimings] = useState<TimingRule[]>([]);
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
      setWhatsappOrderingEnabled(settings.whatsapp_ordering_enabled);
      setDeliveryEnabled(settings.delivery_enabled);
      setOrderingEnabled(settings.ordering_enabled);
      setContactPhone(settings.contact_phone ?? '');
      setContactEmail(settings.contact_email ?? '');
      setAddress(settings.address ?? '');
      setTimings(settings.timings ?? []);
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

  const timingsError = useMemo(() => {
    const r = shopSettingsInputSchema.shape.timings.safeParse(timings);
    return r.success ? null : (r.error.issues[0]?.message ?? 'Store timings are invalid.');
  }, [timings]);

  const save = async () => {
    if (whatsappOrderingEnabled) {
      const err = validate(whatsappNumber);
      setFieldError(err);
      setTouched(true);
      if (err) return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.settings.update({
        whatsapp_number: whatsappNumber.trim(),
        whatsapp_ordering_enabled: whatsappOrderingEnabled,
        delivery_enabled: deliveryEnabled,
        ordering_enabled: orderingEnabled,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        timings: timings.length ? timings : null,
      });
      toast('success', 'Shop settings saved.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save shop settings.';
      setError(message);
      toast('error', message);
    } finally {
      setBusy(false);
    }
  };

  const updateTiming = (index: number, patch: Partial<TimingRule>) => {
    setTimings((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const addTiming = () => {
    setTimings((prev) => [...prev, { day: prev.length, open: '10:00', close: '21:00', closed: false }]);
  };

  const removeTiming = (index: number) => {
    setTimings((prev) => prev.filter((_, i) => i !== index));
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
        <p className="mt-1 text-sm text-zinc-500">Configure how your store operates and receives orders.</p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-zinc-900">Ordering</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Storefront</span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Control whether customers can place orders and how they reach you.
          </p>

          <div className="mt-5 space-y-4">
            <Toggle
              id="settings-ordering-enabled"
              checked={orderingEnabled}
              onChange={setOrderingEnabled}
              label="Accepting orders"
            />
            {!orderingEnabled && (
              <p className="text-sm text-zinc-500">
                Orders are paused. The storefront shows a &ldquo;currently not accepting orders&rdquo;
                message and checkout is blocked. Customers can still browse and use their cart.
              </p>
            )}

            <div className="h-px bg-zinc-100" />

            <Toggle
              id="settings-whatsapp-ordering"
              checked={whatsappOrderingEnabled}
              onChange={(v) => {
                setWhatsappOrderingEnabled(v);
                if (v && touched) setFieldError(validate(whatsappNumber));
              }}
              label="WhatsApp ordering"
            />

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

            {!whatsappOrderingEnabled && (
              <p className="text-sm text-zinc-500">
                WhatsApp ordering is off. Customers will see an &ldquo;unavailable&rdquo; message at
                checkout and their cart will be preserved. The number above is kept for when you turn
                it back on.
              </p>
            )}

            <Toggle
              id="settings-delivery-enabled"
              checked={deliveryEnabled}
              onChange={setDeliveryEnabled}
              label="Home delivery"
            />
            {!deliveryEnabled && (
              <p className="text-sm text-zinc-500">
                Home delivery is off. Customers will only be able to choose pickup at checkout.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-zinc-900">Contact &amp; store details</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Footer</span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Shown in the storefront footer. Leave a field empty to hide it.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Contact phone"
              htmlFor="settings-contact-phone"
              hint="Display number shown to customers (separate from the WhatsApp order number)."
            >
              <TextInput
                id="settings-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={setContactPhone}
                placeholder="e.g. +91 98765 43210"
                disabled={busy}
              />
            </Field>
            <Field label="Contact email" htmlFor="settings-contact-email">
              <TextInput
                id="settings-contact-email"
                type="text"
                value={contactEmail}
                onChange={setContactEmail}
                placeholder="e.g. hello@chocolatezone.in"
                disabled={busy}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Store address"
              htmlFor="settings-address"
              hint="Used in the storefront footer and shown as the pickup location."
            >
              <TextArea
                id="settings-address"
                value={address}
                onChange={setAddress}
                placeholder="Street, area, city, PIN"
                rows={2}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-zinc-900">Store timings</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Opening hours shown in the storefront footer.
              </p>
            </div>
            <button
              type="button"
              onClick={addTiming}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900"
            >
              Add timing
            </button>
          </div>

          {timingsError && (
            <p className="mt-3 text-xs font-medium text-red-600">{timingsError}</p>
          )}

          {timings.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No timings set. The footer will fall back to &ldquo;Open daily&rdquo;.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {timings.map((rule, index) => (
                <li key={index} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-[#fbf7f0] px-4 py-3">
                  <select
                    aria-label="Day"
                    value={String(rule.day)}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateTiming(index, { day: value === 'all' ? 'all' : Number(value) });
                    }}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  >
                    <option value="all">All days</option>
                    {WEEK_DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>

                  {rule.closed ? (
                    <span className="text-sm font-medium text-zinc-400">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label="Opening time"
                        value={rule.open ?? '10:00'}
                        onChange={(e) => updateTiming(index, { open: e.target.value })}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                      <span className="text-zinc-400">to</span>
                      <input
                        type="time"
                        aria-label="Closing time"
                        value={rule.close ?? '21:00'}
                        onChange={(e) => updateTiming(index, { close: e.target.value })}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={rule.closed ?? false}
                      onChange={(e) => updateTiming(index, { closed: e.target.checked })}
                      className="size-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                    />
                    Closed
                  </label>

                  <span className="hidden text-xs text-zinc-400 sm:inline">{dayLabel(rule.day)}</span>

                  <button
                    type="button"
                    onClick={() => removeTiming(index)}
                    aria-label="Remove timing"
                    className="ml-auto grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M6 7h12l-1 14H7L6 7Z" strokeLinejoin="round" />
                      <path d="M4 7h16M9 7V4h6v3" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex items-center gap-3">
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
