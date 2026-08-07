import { LoadingState } from '@/components/admin/loading';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <LoadingState rows={6} />
    </div>
  );
}
