"use client";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getProgressEntries,
  createProgressEntry,
  deleteProgressEntry,
  type ProgressEntry,
} from "@/lib/progressEntries";

const MOOD_OPTIONS = [
  { value: "strong", emoji: "💪", label: "Strong" },
  { value: "good",   emoji: "😊", label: "Good"   },
  { value: "okay",   emoji: "😐", label: "Okay"   },
  { value: "tired",  emoji: "😴", label: "Tired"  },
  { value: "low",    emoji: "😔", label: "Low"    },
];

const MOOD_EMOJI: Record<string, string> = {
  strong: "💪", good: "😊", okay: "😐", tired: "😴", low: "😔",
};

const PHASE_LABEL: Record<string, string> = {
  menstrual: "Menstrual", follicular: "Follicular",
  ovulation: "Ovulation", luteal: "Luteal",
};

const PHASE_COLOR: Record<string, string> = {
  menstrual: "#F87171", follicular: "#34D399",
  ovulation: "#FBBF24", luteal: "#A78BFA",
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00")
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// ── Weight Sparkline ──────────────────────────────────────────────────────────
function WeightSparkline({ entries }: { entries: ProgressEntry[] }) {
  const weighted = [...entries]
    .filter(e => e.weight !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weighted.length < 3) return null;

  const weights = weighted.map(e => e.weight as number);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const W = 260, H = 44;
  const pts = weighted.map((_, i) => {
    const x = (i / (weighted.length - 1)) * W;
    const y = H - 4 - ((weights[i] - min) / range) * (H - 12);
    return { x, y };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const delta = weights[weights.length - 1] - weights[0];
  const sign  = delta > 0 ? "+" : "";
  const color = delta <= 0 ? "#34D399" : "#F87171";

  return (
    <div
      className="mb-4 px-4 py-3 rounded-2xl"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
          Weight trend
        </p>
        <span className="text-xs font-bold" style={{ color }}>
          {sign}{delta.toFixed(1)} kg · {weighted.length} check-ins
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 44, overflow: "visible" }}>
        <polyline
          points={polyline}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#A78BFA" stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-mid)" }}>
          {weighted[0].date.slice(5)} · {weights[0]}kg
        </span>
        <span className="text-[9px] font-semibold" style={{ color: "var(--color-text-mid)" }}>
          {weights[weights.length - 1]}kg · {weighted[weighted.length - 1].date.slice(5)}
        </span>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text)",
        fontSize: "1.1rem",
      }}
    >
      ←
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-mid)" }}>
      {children}
    </p>
  );
}

interface ProgressTimelineProps {
  onClose: () => void;
  currentPhase: string;
}

type View = "list" | "add";

export default function ProgressTimeline({ onClose, currentPhase }: ProgressTimelineProps) {
  const [view, setView]           = useState<View>("list");
  const [entries, setEntries]     = useState<ProgressEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");

  const today = new Date().toISOString().split("T")[0];
  const [formDate, setFormDate]       = useState(today);
  const [formWeight, setFormWeight]   = useState("");
  const [formMood, setFormMood]       = useState("");
  const [formNote, setFormNote]       = useState("");
  const [formPhase]                   = useState(currentPhase);
  const [formFile, setFormFile]       = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Crop state
  const [cropSrc, setCropSrc]                     = useState<string | null>(null);
  const [cropFileName, setCropFileName]           = useState("photo.jpg");
  const [crop, setCrop]                           = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                           = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  // Detail sheet
  const [detailEntry, setDetailEntry] = useState<ProgressEntry | null>(null);

  // Compare state
  const [compareMode, setCompareMode]           = useState(false);
  const [compareA, setCompareA]                 = useState<ProgressEntry | null>(null);
  const [compareB, setCompareB]                 = useState<ProgressEntry | null>(null);
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [compareDragPct, setCompareDragPct]     = useState(50);
  const compareSliderRef  = useRef<HTMLDivElement>(null);
  const isCompareDragging = useRef(false);
  const [compareViewMode, setCompareViewMode] = useState<"slider" | "toggle">("slider");
  const [compareShowingAfter, setCompareShowingAfter] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoadState("loading");
    const data = await getProgressEntries();
    setEntries(data);
    setLoadState("ready");
  }

  // ── Crop ──────────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSaveError("Please select an image."); return; }
    if (file.size > 20 * 1024 * 1024)   { setSaveError("Image must be under 20 MB."); return; }
    setSaveError(null);
    setCropFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      const blob = await cropToBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], cropFileName.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      if (formPreview) URL.revokeObjectURL(formPreview);
      setFormFile(file);
      setFormPreview(URL.createObjectURL(blob));
      setCropSrc(null);
      setCroppedAreaPixels(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch {
      setSaveError("Crop failed. Please try again.");
      setCropSrc(null);
    }
  }

  function handleCropCancel() {
    setCropSrc(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!formFile) { setSaveError("Please add a photo."); return; }
    const parsedWeight = formWeight ? parseFloat(formWeight) : null;
    if (parsedWeight !== null && (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 400)) {
      setSaveError("Enter a valid weight (20–400 kg).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const entry = await createProgressEntry({
        file:   formFile,
        date:   formDate,
        weight: parsedWeight,
        mood:   formMood  || null,
        note:   formNote  || null,
        phase:  formPhase || null,
      });
      setEntries(prev => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      resetForm();
      setView("list");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: ProgressEntry) {
    setDeletingId(entry.id);
    try {
      await deleteProgressEntry(entry.id, entry.storagePath);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      if (detailEntry?.id === entry.id) setDetailEntry(null);
    } finally {
      setDeletingId(null);
    }
  }

  function clearPreview() {
    if (formPreview) URL.revokeObjectURL(formPreview);
    setFormPreview(null);
    setFormFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetForm() {
    clearPreview();
    setFormDate(today);
    setFormWeight("");
    setFormMood("");
    setFormNote("");
    setSaveError(null);
  }

  function openAdd() {
    resetForm();
    setView("add");
  }

  // ── Compare ───────────────────────────────────────────────────────────────
  function handleCompareSelect(entry: ProgressEntry) {
    if (compareA?.id === entry.id) { setCompareA(null); return; }
    if (compareB?.id === entry.id) { setCompareB(null); return; }
    if (!compareA) { setCompareA(entry); return; }
    if (!compareB) {
      setCompareB(entry);
      setCompareDragPct(50);
      setCompareViewMode("slider");
      setCompareShowingAfter(true);
      setShowCompareSlider(true);
    }
  }

  function exitCompareMode() {
    setCompareMode(false);
    setCompareA(null);
    setCompareB(null);
    setShowCompareSlider(false);
  }

  // ── Compare slider pointer events ─────────────────────────────────────────
  function calcPct(clientX: number) {
    if (!compareSliderRef.current) return 50;
    const r = compareSliderRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
  }
  function onPD(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isCompareDragging.current = true;
    setCompareDragPct(calcPct(e.clientX));
  }
  function onPM(e: React.PointerEvent) {
    if (!isCompareDragging.current) return;
    setCompareDragPct(calcPct(e.clientX));
  }
  function onPU(e: React.PointerEvent) {
    isCompareDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── ADD FORM ──────────────────────────────────────────────────────── */}
      {view === "add" && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background" style={{ overscrollBehavior: "contain" }}>
          <div
            className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
            style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
          >
            <BackButton onClick={() => { resetForm(); setView("list"); }} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>New Entry</p>
              <p className="text-base font-semibold text-dark leading-tight mt-0.5">Add progress check-in</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {/* Photo */}
            <div>
              <Label>Photo *</Label>
              {formPreview ? (
                <div className="relative w-full rounded-2xl overflow-hidden shadow-card" style={{ aspectRatio: "2/3" }}>
                  <img src={formPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={clearPreview}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-lg"
                    style={{ background: "rgba(0,0,0,0.55)" }}
                  >×</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-10 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
                  style={{ border: "1.5px dashed rgba(167,139,250,0.5)", background: "rgba(167,139,250,0.06)" }}
                >
                  <span className="text-3xl">📸</span>
                  <span className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Tap to add photo</span>
                  <span className="text-xs" style={{ color: "var(--color-text-mid)" }}>JPG, PNG or WEBP · max 20 MB</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Date */}
            <div>
              <Label>Date</Label>
              <input
                type="date" value={formDate} max={today}
                onChange={e => setFormDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none"
                style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)" }}
              />
            </div>

            {/* Phase */}
            {formPhase && (
              <div>
                <Label>Phase</Label>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: `${PHASE_COLOR[formPhase] ?? "#C48A97"}18`,
                    color: PHASE_COLOR[formPhase] ?? "#C48A97",
                    border: `1.5px solid ${PHASE_COLOR[formPhase] ?? "#C48A97"}40`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PHASE_COLOR[formPhase] ?? "#C48A97" }} />
                  {PHASE_LABEL[formPhase] ?? formPhase}
                  <span className="text-xs font-normal opacity-60 ml-0.5">· auto-filled</span>
                </div>
              </div>
            )}

            {/* Weight */}
            <div>
              <Label>Weight <span className="normal-case font-normal text-xs opacity-70">(optional)</span></Label>
              <div className="relative">
                <input
                  type="number" inputMode="decimal" placeholder="e.g. 66"
                  min={20} max={400} value={formWeight}
                  onChange={e => setFormWeight(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none pr-14"
                  style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)" }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "var(--color-text-mid)" }}>kg</span>
              </div>
            </div>

            {/* Mood */}
            <div>
              <Label>Mood <span className="normal-case font-normal text-xs opacity-70">(optional)</span></Label>
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setFormMood(prev => prev === m.value ? "" : m.value)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95"
                    style={{
                      background: formMood === m.value ? "rgba(167,139,250,0.18)" : "var(--color-surface)",
                      border: `1.5px solid ${formMood === m.value ? "#A78BFA" : "var(--color-border)"}`,
                      boxShadow: formMood === m.value ? "0 0 0 2px rgba(167,139,250,0.15)" : "none",
                    }}
                  >
                    <span className="text-2xl leading-none">{m.emoji}</span>
                    <span className="text-[10px] font-semibold leading-none" style={{ color: formMood === m.value ? "#A78BFA" : "var(--color-text-mid)" }}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Note <span className="normal-case font-normal text-xs opacity-70">(optional)</span></Label>
                <span className="text-xs" style={{ color: "var(--color-text-mid)" }}>{120 - formNote.length} left</span>
              </div>
              <textarea
                placeholder="Felt strong today…"
                maxLength={120} value={formNote}
                onChange={e => setFormNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-dark outline-none resize-none font-body"
                style={{ background: "var(--color-surface)", border: "1.5px solid var(--color-border)" }}
              />
            </div>

            {saveError && (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
                style={{ background: "rgba(248,113,113,0.10)", color: "#DC2626", border: "1px solid rgba(248,113,113,0.25)" }}>
                {saveError}
              </div>
            )}
            <div style={{ height: "1rem" }} />
          </div>

          <div
            className="px-4 pt-3 flex-shrink-0"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <button
              onClick={handleSave}
              disabled={saving || !formFile}
              className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving…
                </>
              ) : "Save entry"}
            </button>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background" style={{ overscrollBehavior: "contain" }}>
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
            style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
          >
            <BackButton onClick={onClose} />
            <div className="flex-1 min-w-0">
              {compareMode ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>Compare mode</p>
                  <p className="text-sm font-semibold text-dark leading-tight mt-0.5">
                    {!compareA ? "Tap Before photo" : !compareB ? "Now tap After photo" : "Opening…"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>Progress</p>
                  <p className="text-base font-semibold text-dark leading-tight mt-0.5">Timeline</p>
                </>
              )}
            </div>
            {compareMode ? (
              <button
                onClick={exitCompareMode}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 flex-shrink-0"
                style={{ background: "rgba(248,113,113,0.1)", color: "#EF4444", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                Cancel
              </button>
            ) : (
              <div className="flex gap-2 flex-shrink-0">
                {entries.length >= 2 && (
                  <button
                    onClick={() => setCompareMode(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-95"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1.5px solid rgba(167,139,250,0.25)" }}
                    title="Compare photos"
                  >◀▶</button>
                )}
                <button
                  onClick={openAdd}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
                >+ Add</button>
              </div>
            )}
          </div>

          {/* Compare mode selection indicators */}
          {compareMode && (
            <div
              className="px-4 py-2 flex items-center gap-2.5 flex-shrink-0"
              style={{ background: "rgba(167,139,250,0.07)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: compareA ? "#9ca3af" : "transparent", border: compareA ? "none" : "2px solid #9ca3af" }}
              >{compareA ? "B" : ""}</span>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: compareB ? "#A78BFA" : "transparent", border: compareB ? "none" : "2px solid #A78BFA" }}
              >{compareB ? "A" : ""}</span>
              <p className="text-xs font-semibold" style={{ color: "#A78BFA" }}>
                {!compareA ? "Tap a photo to set Before" : !compareB ? "Tap a second photo to set After" : "Opening comparison…"}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">

            {loadState === "loading" && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#A78BFA" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-sm font-body" style={{ color: "var(--color-text-mid)" }}>Loading your timeline…</p>
              </div>
            )}

            {loadState === "ready" && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-card" style={{ background: "var(--color-surface)" }}>📸</div>
                <div>
                  <p className="text-base font-semibold text-dark">No entries yet</p>
                  <p className="text-sm font-body mt-1.5 leading-relaxed" style={{ color: "var(--color-text-mid)" }}>
                    Add your first check-in photo to<br />start tracking your progress.
                  </p>
                </div>
                <button
                  onClick={openAdd}
                  className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
                >+ Add first entry</button>
              </div>
            )}

            {loadState === "ready" && entries.length > 0 && (
              <>
                <WeightSparkline entries={entries} />
                <div className="grid grid-cols-2 gap-2 pb-6">
                  {entries.map((entry) => {
                    const pc = PHASE_COLOR[entry.phase ?? ""] ?? "#A78BFA";
                    const isA = compareA?.id === entry.id;
                    const isB = compareB?.id === entry.id;
                    const isSelected = isA || isB;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => compareMode ? handleCompareSelect(entry) : setDetailEntry(entry)}
                        className="relative rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
                        style={{
                          aspectRatio: "2/3",
                          boxShadow: isA
                            ? "inset 0 0 0 3px #9ca3af"
                            : isB
                            ? "inset 0 0 0 3px #A78BFA"
                            : "none",
                        }}
                      >
                        <img src={entry.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />

                        {/* Bottom gradient */}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.06) 45%, transparent 65%)" }} />

                        {/* Date + phase */}
                        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                          <p className="text-white font-bold leading-tight" style={{ fontSize: 10 }}>
                            {formatDate(entry.date)}
                          </p>
                          {entry.phase && (
                            <p className="flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc }} />
                              <span className="font-semibold" style={{ fontSize: 9, color: pc }}>{PHASE_LABEL[entry.phase] ?? entry.phase}</span>
                            </p>
                          )}
                        </div>

                        {/* Mood (top-right) */}
                        {entry.mood && (
                          <span className="absolute top-2 right-2 text-base leading-none drop-shadow">
                            {MOOD_EMOJI[entry.mood]}
                          </span>
                        )}

                        {/* Weight (top-left) */}
                        {entry.weight !== null && (
                          <span
                            className="absolute top-2 left-2 font-bold text-white rounded-md"
                            style={{ fontSize: 9, background: "rgba(0,0,0,0.45)", padding: "2px 5px" }}
                          >
                            {entry.weight}kg
                          </span>
                        )}

                        {/* Compare mode overlay */}
                        {compareMode && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: isSelected ? "rgba(0,0,0,0.18)" : "transparent" }}
                          >
                            {isA && <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style={{ background: "rgba(107,114,128,0.92)" }}>B</span>}
                            {isB && <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style={{ background: "rgba(167,139,250,0.92)" }}>A</span>}
                            {!isSelected && <span className="w-8 h-8 rounded-full" style={{ border: "2.5px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)" }} />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CROP OVERLAY ──────────────────────────────────────────────────── */}
      {cropSrc && (
        <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#000" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ background: "#111" }}>
            <button onClick={handleCropCancel} className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Cancel</button>
            <p className="text-sm font-semibold text-white">Crop Photo</p>
            <button onClick={handleCropConfirm} disabled={!croppedAreaPixels} className="text-sm font-semibold" style={{ color: "#a78bfa" }}>Done</button>
          </div>
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
          <div className="px-6 pt-3 pb-6" style={{ background: "#111" }}>
            <p className="text-center text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Pinch or drag to zoom</p>
            <input
              type="range" min={1} max={3} step={0.01}
              value={zoom} onChange={e => setZoom(Number(e.target.value))}
              className="w-full" style={{ accentColor: "#a78bfa" }}
            />
          </div>
        </div>
      )}

      {/* ── DETAIL SHEET ──────────────────────────────────────────────────── */}
      {detailEntry && !compareMode && (
        <div
          className="fixed inset-0 z-[70] flex items-end"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => { setDetailEntry(null); setConfirmDeleteId(null); }}
        >
          <div
            className="w-full rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: "var(--color-surface)", maxHeight: "88vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
            </div>

            <div className="flex-shrink-0 flex items-center justify-center" style={{ height: "52vh", background: "#111" }}>
              <img src={detailEntry.imageUrl} className="h-full w-auto block" alt="" />
            </div>

            <div className="px-5 pt-4 pb-2 overflow-y-auto flex-1">
              <p className="text-base font-bold text-dark">{formatDate(detailEntry.date)}</p>
              {detailEntry.phase && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 mb-3"
                  style={{
                    background: `${PHASE_COLOR[detailEntry.phase] ?? "#A78BFA"}18`,
                    color: PHASE_COLOR[detailEntry.phase] ?? "#A78BFA",
                    border: `1px solid ${PHASE_COLOR[detailEntry.phase] ?? "#A78BFA"}35`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PHASE_COLOR[detailEntry.phase] ?? "#A78BFA" }} />
                  {PHASE_LABEL[detailEntry.phase] ?? detailEntry.phase}
                </span>
              )}
              <div className="flex gap-5 mt-2 mb-3">
                {detailEntry.weight !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⚖️</span>
                    <span className="text-sm font-bold text-dark">{detailEntry.weight} kg</span>
                  </div>
                )}
                {detailEntry.mood && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{MOOD_EMOJI[detailEntry.mood] ?? "😊"}</span>
                    <span className="text-sm font-bold text-dark capitalize">{detailEntry.mood}</span>
                  </div>
                )}
              </div>
              {detailEntry.note && (
                <p className="text-sm font-body italic leading-snug" style={{ color: "var(--color-text-mid)" }}>"{detailEntry.note}"</p>
              )}
            </div>

            <div
              className="px-5 pt-3 flex gap-2.5 flex-shrink-0"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              <button
                onClick={() => {
                  const d = detailEntry;
                  setDetailEntry(null);
                  setCompareMode(true);
                  setCompareA(d);
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1.5px solid rgba(167,139,250,0.3)" }}
              >
                Compare ◀▶
              </button>
              {confirmDeleteId === detailEntry.id ? (
                <>
                  <button
                    onClick={async () => { await handleDelete(detailEntry); setConfirmDeleteId(null); }}
                    disabled={deletingId === detailEntry.id}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "#EF4444" }}
                  >
                    {deletingId === detailEntry.id ? "…" : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="w-20 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                    style={{ background: "var(--color-surface-2)", color: "var(--color-text-mid)", border: "1px solid var(--color-border)" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(detailEntry.id)}
                  className="w-12 py-3 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: "rgba(248,113,113,0.1)", color: "#EF4444", border: "1px solid rgba(248,113,113,0.2)" }}
                >✕</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPARE SLIDER ────────────────────────────────────────────────── */}
      {showCompareSlider && compareA && compareB && (
        <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#0a0a0a" }}>
          <div
            className="flex items-center justify-between px-5 flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.85)",
              paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
              paddingBottom: 14,
            }}
          >
            <div>
              <p className="text-[11px] font-body" style={{ color: "rgba(255,255,255,0.45)" }}>{formatDate(compareA.date)}</p>
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Before</p>
            </div>
            <button
              onClick={() => setShowCompareSlider(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >×</button>
            <div className="text-right">
              <p className="text-[11px] font-body" style={{ color: "rgba(167,139,250,0.6)" }}>{formatDate(compareB.date)}</p>
              <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>After</p>
            </div>
          </div>

          {/* Image area — slider or tap-to-toggle */}
          {compareViewMode === "slider" ? (
            <div
              ref={compareSliderRef}
              className="flex-1 relative overflow-hidden"
              style={{ cursor: "ew-resize", userSelect: "none", touchAction: "none" }}
              onPointerDown={onPD}
              onPointerMove={onPM}
              onPointerUp={onPU}
            >
              <img src={compareA.imageUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <img
                src={compareB.imageUrl} alt="After"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 0 0 ${compareDragPct}%)` }}
                draggable={false}
              />
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{ left: `${compareDragPct}%`, width: 3, background: "white", boxShadow: "0 0 12px rgba(0,0,0,0.5)", transform: "translateX(-50%)", zIndex: 3 }}
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
              onClick={() => setCompareShowingAfter(prev => !prev)}
            >
              <img
                src={compareShowingAfter ? compareB.imageUrl : compareA.imageUrl}
                alt={compareShowingAfter ? "After" : "Before"}
                className="absolute inset-0 w-full h-full object-cover"
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
                    background: compareShowingAfter ? "rgba(167,139,250,0.85)" : "rgba(255,255,255,0.2)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    transition: "background 0.15s",
                  }}
                >{compareShowingAfter ? "After" : "Before"}</div>
              </div>
            </div>
          )}

          {/* Bottom bar — mode switcher + swap */}
          <div
            className="flex items-center justify-between flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.85)",
              padding: "10px 20px",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
            }}
          >
            <div className="flex items-center gap-1.5">
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
            <button
              onClick={() => { const a = compareA; setCompareA(compareB); setCompareB(a); setCompareDragPct(50); setCompareShowingAfter(true); }}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >Swap ⇄</button>
          </div>
        </div>
      )}
    </>
  );
}
