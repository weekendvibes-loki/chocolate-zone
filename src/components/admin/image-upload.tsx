'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/admin/client';
import { useToast } from '@/components/admin/toast';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/webp', 'image/jpeg', 'image/png'];
const ACCEPTED_EXT = ['webp', 'jpeg', 'jpg', 'png'];

interface ImageUploadProps {
  bucket: 'product-images' | 'offer-images';
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ImageUpload({ bucket, value, onChange, label = 'Image' }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const upload = async (file: File) => {
    setError(null);
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ACCEPTED.includes(file.type) || !ACCEPTED_EXT.includes(ext)) {
      const message = 'Only WebP, JPEG or PNG images are supported.';
      setError(message);
      toast('error', message);
      return;
    }
    if (file.size > MAX_BYTES) {
      const message = 'Image must be under 2 MB.';
      setError(message);
      toast('error', message);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);
    setProgress(0);

    try {
      const signed = await adminApi.upload.signed({
        bucket,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signed.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed.')));
        xhr.onerror = () => reject(new Error('Upload failed.'));
        xhr.send(file);
      });

      onChange(signed.publicUrl);
      setPreview(signed.publicUrl);
      toast('success', 'Image uploaded.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed.';
      setError(message);
      toast('error', message);
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(value);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const remove = () => {
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    onChange(null);
  };

  const current = preview ?? value;

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {current ? (
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Preview" className="aspect-video w-full object-cover" />
          {uploading && progress !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
              <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs font-medium text-white">{progress}%</p>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors ${
            dragging ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300 bg-zinc-50 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100'
          }`}
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
          </svg>
          Drag & drop or click to upload
          <span className="text-xs text-zinc-400">WebP, JPEG or PNG · max 2 MB</span>
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
