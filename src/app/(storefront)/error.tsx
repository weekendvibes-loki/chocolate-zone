'use client';

import { StorefrontErrorState } from '@/components/storefront/error-state';

export default function StorefrontError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <StorefrontErrorState
        title="Something went wrong"
        description="We couldn't display this page. Please try again."
        onRetry={retry}
      />
    </div>
  );
}
