"use client";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ProgressEntry, createProgressEntry } from "@/lib/progressEntries";

interface ProgressPhotosCardProps {
  photos: ProgressEntry[];
  phase?: string;
  onPhotoAdded: (entry: ProgressEntry) => void;
  onViewTimeline: () => void;
}

function fmtDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", {
    month: "short", year: "numeric",
  });
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round(Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToBlob(src: string, pixels: Area): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width  = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext("2d")!.drawImage(
    img, pixels.x, pixels.y, pixels.width, pixels.height,
    0, 0, pixels.width, pixels.height,
  );
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error("Crop failed")), "image/jpeg", 0.92)
  );
}

export default function ProgressPhotosCard({
  photos, phase, onPhotoAdded, onViewTimeline,
}: ProgressPhotosCardProps) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const sliderRef     = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [beforeIdx, setBeforeIdx]     = useState(() => Math.max(0, photos.length - 1));
  const [afterIdx, setAfterIdx]       = useState(0);
  const [dragPct, setDragPct]         = useState(50);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareViewMode, setCompareViewMode] = useState<"slider" | "toggle">("slider");
  const [showingAfter, setShowingAfter] = useState(true);

  // ── Crop state ─────────────────────────────────────────────────────────────
  const [cropSrc, setCropSrc]                   = useState<string | null>(null);
  const [cropFileName, setCropFileName]         = useState("photo.jpg");
  const [crop, setCrop]                         = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                         = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const prevLengthRef = useRef(photos.length);
  useEffect(() => {
    if (photos.length > prevLengthRef.current) {
      setAfterIdx(0);
      setBeforeIdx(photos.length - 1);
    }
    prevLengthRef.current = photos.length;
  }, [photos.length]);

  const oldest      = photos.length > 0 ? photos[photos.length - 1] : null;
  const beforePhoto = photos[beforeIdx] ?? oldest;
  const afterPhoto  = photos[afterIdx] ?? null;

  const weightedPhotos = photos.filter(p => p.weight !== null);
  const weightDelta = weightedPhotos.length >= 2
    ? (weightedPhotos[0].weight! - weightedPhotos[weightedPhotos.length - 1].weight!)
    : null;

  function handleThumbnailTap(idx: number) {
    if (idx === afterIdx) {
      // Tap current After → promote to Before, swap old Before to After
      setBeforeIdx(idx);
      setAfterIdx(beforeIdx);
    } else {
      // Tap any other photo → set as After
      setAfterIdx(idx);
    }
  }

  // ── Slider pointer events ──────────────────────────────────────────────────
  function calcPct(clientX: number) {
    if (!sliderRef.current) return 50;
    const rect = sliderRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }
  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setDragPct(calcPct(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    setDragPct(calcPct(e.clientX));
  }
  function onPointerUp(e: React.PointerEvent) {
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // ── File selection → open crop UI ─────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file."); return; }
    if (file.size > 20 * 1024 * 1024)   { setUploadError("Image must be under 20 MB.");   return; }
    setUploadError(null);
    setCropFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Crop confirmed → upload ────────────────────────────────────────────────
  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    setCropSrc(null);
    try {
      const blob        = await cropToBlob(cropSrc, croppedAreaPixels);
      const croppedFile = new File([blob], cropFileName.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      if (croppedFile.size > 10 * 1024 * 1024) throw new Error("Cropped image must be under 10 MB.");
      const today = new Date().toISOString().split("T")[0];
      const entry = await createProgressEntry({ file: croppedFile, date: today, phase: phase ?? null });
      onPhotoAdded(entry);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    setCropSrc(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden"
        style={{ borderTop: "2px solid #A78BFA" }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
            Progress photos
          </p>
          {photos.length === 1 && (
            <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>1 photo</p>
          )}
          {photos.length >= 2 && oldest && (
            <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
              {photos.length} photos · {monthsBetween(oldest.date, photos[0].date)} months
              {weightDelta !== null && (
                <span style={{ fontWeight: 600, color: weightDelta <= 0 ? "#34D399" : "#F87171" }}>
                  {" · "}{weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
                </span>
              )}
            </p>
          )}
        </div>

        {/* ── STATE 0: no photos ──────────────────────────────────────────── */}
        {photos.length === 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{ border: "1.5px dashed rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.04)" }}
            >
              <span className="text-2xl">📸</span>
              <p className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Add your first check-in</p>
              <p className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
                Private · only you can see it
              </p>
            </button>
            {uploadError && <p className="text-xs text-red-400 text-center mt-2">{uploadError}</p>}
          </div>
        )}

        {/* ── STATE 1: one photo ──────────────────────────────────────────── */}
        {photos.length === 1 && oldest && (
          <div className="px-4 pb-4">
            <div className="flex gap-3 items-stretch mb-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <button
                  onClick={() => setPreviewUrl(oldest.imageUrl)}
                  className="w-full rounded-xl overflow-hidden block transition-all active:scale-95"
                  style={{ aspectRatio: "2/3" }}
                >
                  <img src={oldest.imageUrl} alt="Progress" className="w-full h-full object-cover" />
                </button>
                <p className="text-center text-xs font-semibold" style={{ color: "var(--color-text-dim)" }}>
                  {fmtDate(oldest.date)} · Start
                </p>
              </div>
              <div className="flex items-center px-1" style={{ color: "rgba(0,0,0,0.2)", fontSize: "1.125rem" }}>→</div>
              <div className="flex-1 flex flex-col gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ aspectRatio: "2/3", border: "1.5px dashed rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.04)" }}
                >
                  {uploading ? (
                    <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Uploading…</span>
                  ) : (
                    <>
                      <span style={{ color: "#A78BFA", fontSize: "1.5rem" }}>＋</span>
                      <span className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Add now</span>
                    </>
                  )}
                </button>
                <p className="text-center text-xs font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>
                  Add now
                </p>
              </div>
            </div>
            {uploadError && <p className="text-xs text-red-400 text-center mt-2">{uploadError}</p>}
          </div>
        )}

        {/* ── STATE 2+: compact preview + Compare button + thumbnail strip ── */}
        {photos.length >= 2 && beforePhoto && afterPhoto && (
          <>
            {/* Before / After mini-preview */}
            <div className="px-4 mb-3">
              <div className="flex gap-2 items-stretch mb-3">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "2/3" }}>
                    <img src={beforePhoto.imageUrl} alt="Before" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-center text-xs font-semibold" style={{ color: "var(--color-text-dim)" }}>
                    {fmtDate(beforePhoto.date)} · Before
                  </p>
                </div>
                <div className="flex items-center px-1 text-sm" style={{ color: "rgba(0,0,0,0.18)" }}>◀▶</div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "2/3" }}>
                    <img src={afterPhoto.imageUrl} alt="After" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-center text-xs font-semibold" style={{ color: "#A78BFA" }}>
                    {fmtDate(afterPhoto.date)} · After
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setDragPct(50); setCompareViewMode("slider"); setShowingAfter(true); setShowCompareModal(true); }}
                className="w-full py-3 rounded-2xl text-sm font-display font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #a78bfa, #7B6D8D)", boxShadow: "0 4px 16px rgba(167,139,250,0.35)" }}
              >
                Compare ◀▶
              </button>
              {weightedPhotos.length === 0 && (
                <p className="text-center text-[10px] mt-2.5" style={{ color: "rgba(167,139,250,0.55)" }}>
                  ⚖️ Add weight to your next check-in to track your trend
                </p>
              )}
            </div>

            <p className="text-center mb-2" style={{ fontSize: 10, color: "#c0b0c8", letterSpacing: "0.02em" }}>
              Tap a photo to set After · tap again to set Before
            </p>

            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {photos.map((photo, idx) => {
                const isBefore = idx === beforeIdx;
                const isAfter  = idx === afterIdx;
                return (
                  <button
                    key={photo.id}
                    onClick={() => handleThumbnailTap(idx)}
                    className="relative flex-shrink-0 rounded-xl overflow-hidden transition-all active:scale-95"
                    style={{
                      width: 52, height: 52,
                      border: isBefore ? "2px solid #9ca3af" : isAfter ? "2px solid #a78bfa" : "2px solid transparent",
                      boxShadow: isAfter ? "0 0 0 2px rgba(167,139,250,0.2)" : "none",
                    }}
                  >
                    <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                    {isBefore && (
                      <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold text-white leading-none px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)" }}>B</span>
                    )}
                    {isAfter && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white leading-none px-1 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.85)" }}>A</span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ width: 52, height: 52, border: "1.5px dashed rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.05)", color: "#a78bfa", fontSize: 18 }}
              >＋</button>
            </div>

            {uploadError && <p className="text-xs text-red-400 text-center mb-2">{uploadError}</p>}

            <div className="px-4 pb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ border: "1px dashed rgba(167,139,250,0.3)", color: "#A78BFA", background: "rgba(167,139,250,0.05)" }}
              >
                {uploading ? "Uploading…" : "+ Add check-in photo"}
              </button>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* Timeline CTA */}
        <button
          onClick={onViewTimeline}
          className="w-full py-3 text-xs font-semibold text-center transition-all active:scale-95 border-t flex items-center justify-center gap-1.5"
          style={{ color: "#A78BFA", borderColor: "var(--color-border)" }}
        >
          <span>📅</span> View Progress Timeline →
        </button>

        {/* Full-screen preview */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => setPreviewUrl(null)}>
            <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <img src={previewUrl} alt="Progress photo" className="w-full rounded-2xl object-contain max-h-[80vh]" />
              <button onClick={() => setPreviewUrl(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "rgba(0,0,0,0.5)" }}>×</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Full-screen compare modal ────────────────────────────────────────── */}
      {showCompareModal && beforePhoto && afterPhoto && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#0a0a0a" }}>
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5"
            style={{
              background: "rgba(0,0,0,0.85)",
              paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
              paddingBottom: 14,
            }}
          >
            <div>
              <p className="text-[11px] font-body" style={{ color: "rgba(255,255,255,0.45)" }}>{fmtDate(beforePhoto.date)}</p>
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Before</p>
            </div>
            <button
              onClick={() => setShowCompareModal(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: "rgba(255,255,255,0.12)" }}
              aria-label="Close"
            >×</button>
            <div className="text-right">
              <p className="text-[11px] font-body" style={{ color: "rgba(167,139,250,0.6)" }}>{fmtDate(afterPhoto.date)}</p>
              <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>After</p>
            </div>
          </div>

          {/* Image area — slider or tap-to-toggle */}
          {compareViewMode === "slider" ? (
            <div
              ref={sliderRef}
              className="flex-1 relative overflow-hidden"
              style={{ cursor: "ew-resize", userSelect: "none", touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <img src={beforePhoto.imageUrl} alt="Before" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
              <img
                src={afterPhoto.imageUrl} alt="After"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ clipPath: `inset(0 0 0 ${dragPct}%)` }}
                draggable={false}
              />
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{ left: `${dragPct}%`, width: 3, background: "white", boxShadow: "0 0 12px rgba(0,0,0,0.5)", transform: "translateX(-50%)", zIndex: 3 }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ background: "white", boxShadow: "0 2px 14px rgba(0,0,0,0.35)", color: "#A78BFA", fontSize: 12, letterSpacing: -1 }}
                >◀▶</div>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 relative overflow-hidden"
              style={{ cursor: "pointer", userSelect: "none", touchAction: "none" }}
              onClick={() => setShowingAfter(prev => !prev)}
            >
              <img
                src={beforePhoto.imageUrl}
                alt="Before"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: showingAfter ? 0 : 1, transition: "opacity 0.18s ease" }}
                draggable={false}
              />
              <img
                src={afterPhoto.imageUrl}
                alt="After"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: showingAfter ? 1 : 0, transition: "opacity 0.18s ease" }}
                draggable={false}
              />
              <div className="absolute top-3 left-0 right-0 flex justify-center" style={{ zIndex: 3 }}>
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-medium"
                  style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
                >Tap to toggle</div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ zIndex: 3 }}>
                <div
                  className="px-4 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: showingAfter ? "rgba(167,139,250,0.85)" : "rgba(255,255,255,0.2)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    transition: "background 0.15s",
                  }}
                >{showingAfter ? "After" : "Before"}</div>
              </div>
            </div>
          )}

          {/* Bottom bar — mode switcher */}
          <div
            className="flex items-center justify-center gap-2 flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.85)",
              padding: "10px 20px",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
            }}
          >
            <button
              onClick={() => setCompareViewMode("slider")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: compareViewMode === "slider" ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.08)",
                color: compareViewMode === "slider" ? "#a78bfa" : "rgba(255,255,255,0.4)",
                border: `1px solid ${compareViewMode === "slider" ? "rgba(167,139,250,0.45)" : "transparent"}`,
              }}
            >◀▶ Slider</button>
            <button
              onClick={() => setCompareViewMode("toggle")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: compareViewMode === "toggle" ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.08)",
                color: compareViewMode === "toggle" ? "#a78bfa" : "rgba(255,255,255,0.4)",
                border: `1px solid ${compareViewMode === "toggle" ? "rgba(167,139,250,0.45)" : "transparent"}`,
              }}
            >👆 Tap</button>
          </div>
        </div>
      )}

      {/* ── Crop modal ───────────────────────────────────────────────────────── */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#000" }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4" style={{ background: "#111" }}>
            <button
              onClick={handleCropCancel}
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Cancel
            </button>
            <p className="text-sm font-semibold text-white">Crop Photo</p>
            <button
              onClick={handleCropConfirm}
              disabled={!croppedAreaPixels}
              className="text-sm font-semibold"
              style={{ color: "#a78bfa" }}
            >
              Done
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={2 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: "#000" },
                cropAreaStyle: { border: "2px solid #a78bfa", borderRadius: 8 },
              }}
            />
          </div>

          {/* Zoom slider */}
          <div className="px-6 pt-3 pb-6" style={{ background: "#111" }}>
            <p className="text-center text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Pinch or drag the slider to zoom
            </p>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#a78bfa]"
              style={{ accentColor: "#a78bfa" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
