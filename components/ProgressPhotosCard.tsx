"use client";
import { useRef, useState } from "react";
import { type ProgressPhoto, uploadProgressPhoto } from "@/lib/progressPhotos";

interface ProgressPhotosCardProps {
  photos: ProgressPhoto[];
  onPhotoAdded: () => void;
}

function formatPhotoLabel(isoDate: string, suffix: string): string {
  const d = new Date(isoDate);
  return `${d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} · ${suffix}`;
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export default function ProgressPhotosCard({ photos, onPhotoAdded }: ProgressPhotosCardProps) {
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);

  const oldest = photos[0] ?? null;
  const newest = photos[photos.length - 1] ?? null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be under 10 MB.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      await uploadProgressPhoto(file);
      onPhotoAdded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden"
      style={{ borderTop: "2px solid #A78BFA" }}
    >
      {/* Title */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
          Progress photos
        </p>
        {photos.length > 1 && oldest && newest && (
          <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
            {photos.length} photos · {monthsBetween(oldest.takenAt, newest.takenAt)} months
          </p>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Zero state */}
        {photos.length === 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-8 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-98"
            style={{
              border: "1.5px dashed rgba(167,139,250,0.3)",
              background: "rgba(167,139,250,0.04)",
            }}
          >
            <span className="text-2xl">📸</span>
            <p className="text-sm font-semibold" style={{ color: "#A78BFA" }}>
              Add your first check-in photo
            </p>
            <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
              Private · only you can see it
            </p>
          </button>
        )}

        {/* One photo — left photo + dashed placeholder right */}
        {photos.length === 1 && oldest && (
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <button
                onClick={() => setPreviewUrl(oldest.photoUrl)}
                className="w-full rounded-xl overflow-hidden active:scale-98 transition-all block"
                style={{ aspectRatio: "2/3" }}
              >
                <img
                  src={oldest.photoUrl}
                  alt="Progress"
                  className="w-full h-full object-cover"
                />
              </button>
              <p
                className="text-center text-xs font-semibold mt-1.5"
                style={{ color: "var(--color-text-dim)" }}
              >
                {formatPhotoLabel(oldest.takenAt, "Start")}
              </p>
            </div>
            <div className="flex items-center text-dark/20 text-lg px-1">→</div>
            <div className="flex-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-98"
                style={{
                  aspectRatio: "2/3",
                  border: "1.5px dashed rgba(167,139,250,0.3)",
                  background: "rgba(167,139,250,0.04)",
                }}
              >
                {uploading ? (
                  <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>
                    Uploading…
                  </span>
                ) : (
                  <>
                    <span style={{ color: "#A78BFA", fontSize: "1.5rem" }}>＋</span>
                    <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>
                      Add now
                    </span>
                  </>
                )}
              </button>
              <p
                className="text-center text-xs font-semibold mt-1.5"
                style={{ color: "rgba(167,139,250,0.5)" }}
              >
                Now
              </p>
            </div>
          </div>
        )}

        {/* Two+ photos — side-by-side compare */}
        {photos.length >= 2 && oldest && newest && (
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <button
                onClick={() => setPreviewUrl(oldest.photoUrl)}
                className="w-full rounded-xl overflow-hidden active:scale-98 transition-all block"
                style={{ aspectRatio: "2/3" }}
              >
                <img src={oldest.photoUrl} alt="Start" className="w-full h-full object-cover" />
              </button>
              <p
                className="text-center text-xs font-semibold mt-1.5"
                style={{ color: "var(--color-text-dim)" }}
              >
                {formatPhotoLabel(oldest.takenAt, "Start")}
              </p>
            </div>
            <div className="flex items-center text-dark/20 text-lg px-1">→</div>
            <div className="flex-1">
              <button
                onClick={() => setPreviewUrl(newest.photoUrl)}
                className="w-full rounded-xl overflow-hidden active:scale-98 transition-all block"
                style={{ aspectRatio: "2/3" }}
              >
                <img src={newest.photoUrl} alt="Now" className="w-full h-full object-cover" />
              </button>
              <p
                className="text-center text-xs font-semibold mt-1.5"
                style={{ color: "#A78BFA" }}
              >
                {formatPhotoLabel(newest.takenAt, "Now")}
              </p>
            </div>
          </div>
        )}

        {/* Add photo button (when at least 1 photo exists) */}
        {photos.length >= 1 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98"
            style={{
              border: "1px dashed rgba(167,139,250,0.3)",
              color: "#A78BFA",
              background: "rgba(167,139,250,0.05)",
            }}
          >
            {uploading ? "Uploading…" : "+ Add photo"}
          </button>
        )}

        {uploadError && (
          <p className="text-xs text-red-400 font-body text-center mt-2">{uploadError}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Full-screen preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl}
              alt="Progress photo"
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
