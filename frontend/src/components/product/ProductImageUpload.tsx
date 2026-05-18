"use client";

import { useRef, useState } from "react";
import { PlusIcon, LockIcon, ImageOffIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

interface ProductImageUploadProps {
  imageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ProductImageUpload({
  imageUrls,
  onImagesChange,
  maxImages = 5,
}: ProductImageUploadProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [errorImageIndexes, setErrorImageIndexes] = useState<Set<number>>(new Set());

  const isAtMax = imageUrls.length >= maxImages;

  const handleUpload = (file: File) => {
    setError("");

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError("Only JPEG, PNG, and WebP images are accepted.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          const url: string = json.url ?? json.data?.url;
          onImagesChange([...imageUrls, url]);
        } catch {
          setError("Upload failed. Please try again.");
        }
      } else {
        setError("Upload failed. Please try again.");
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setError("Upload failed. Please try again.");
    };

    const formData = new FormData();
    formData.append("image", file);

    xhr.open("POST", `${API_BASE}/api/catalog/upload/`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.send(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleRemove = (index: number) => {
    const removedUrl = imageUrls[index];
    const newUrls = imageUrls.filter((_, i) => i !== index);
    onImagesChange(newUrls);

    const toastId = toast("Image removed", {
      action: {
        label: "Undo",
        onClick: () => {
          const restored = [...newUrls];
          restored.splice(index, 0, removedUrl);
          onImagesChange(restored);
          toast.dismiss(toastId);
        },
      },
      duration: 5000,
    });
  };

  const handleImageError = (index: number) => {
    setErrorImageIndexes((prev) => new Set([...prev, index]));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* Existing thumbnails */}
        {imageUrls.map((url, i) => (
          <div
            key={url}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-border"
          >
            {errorImageIndexes.has(i) ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-[var(--color-navy)]/30">
                <ImageOffIcon className="h-5 w-5 text-muted-foreground" />
                <span style={{ fontSize: 9 }} className="text-muted-foreground">
                  Error
                </span>
              </div>
            ) : (
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                onError={() => handleImageError(i)}
              />
            )}
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className={cn(
                "absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444]/70 text-white hover:bg-[#EF4444] transition-colors",
              )}
              style={{ fontSize: 10, lineHeight: 1 }}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}

        {/* Upload in progress */}
        {uploadProgress !== null && (
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded border border-border bg-background">
            <div className="h-2 w-12 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-[var(--color-orange)] transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span style={{ fontSize: 10 }} className="text-muted-foreground">
              {uploadProgress}%
            </span>
          </div>
        )}

        {/* Upload tile */}
        {uploadProgress === null && !isAtMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border bg-background hover:border-[var(--color-navy)]/40 transition-colors"
          >
            <PlusIcon className="h-5 w-5 text-[var(--color-orange)]" />
            <span style={{ fontSize: 10 }} className="text-muted-foreground">
              Upload
            </span>
          </button>
        )}

        {/* Max tile */}
        {!isAtMax && isAtMax && (
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded border border-border bg-background">
            <LockIcon className="h-4 w-4 text-muted-foreground" />
            <span style={{ fontSize: 10 }} className="text-muted-foreground">
              Max {maxImages}
            </span>
          </div>
        )}

        {/* Max tile when truly at max */}
        {isAtMax && (
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded border border-border bg-background">
            <LockIcon className="h-4 w-4 text-muted-foreground" />
            <span style={{ fontSize: 10 }} className="text-muted-foreground">
              Max {maxImages}
            </span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11 }} className="text-muted-foreground">
        {imageUrls.length} / {maxImages} images
      </p>

      {error && (
        <p className="text-xs text-destructive">
          {error}{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="underline"
          >
            Retry
          </button>
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
