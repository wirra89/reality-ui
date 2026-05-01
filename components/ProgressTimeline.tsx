"use client";
import { useState, useEffect, useRef } from "react";
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

interface ProgressTimelineProps {
  onClose: () => void;
  currentPhase: string;
}

type View = "list" | "add";

// Shared header back button — visible on light theme
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

// Shared field label
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-mid)" }}>
      {children}
    </p>
  );
}

export default function ProgressTimeline({ onClose, currentPhase }: ProgressTimelineProps) {
  const [view, setView]             = useState<View>("list");
  const [entries, setEntries]       = useState<ProgressEntry[]>([]);
  const [loadState, setLoadState]   = useState<"loading" | "ready">("loading");

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
  const [timelinePreview, setTimelinePreview] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoadState("loading");
    const data = await getProgressEntries();
    setEntries(data);
    setLoadState("ready");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSaveError("Please select an image."); return; }
    if (file.size > 10 * 1024 * 1024)   { setSaveError("Image must be under 10 MB."); return; }
    setSaveError(null);
    setFormFile(file);
    setFormPreview(URL.createObjectURL(file));
  }

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

  // ── ADD ENTRY FORM ──────────────────────────────────────────────────────────
  if (view === "add") {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-background"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <BackButton onClick={() => { resetForm(); setView("list"); }} />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
              New Entry
            </p>
            <p className="text-base font-semibold text-dark leading-tight mt-0.5">
              Add progress check-in
            </p>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

          {/* Photo */}
          <div>
            <Label>Photo *</Label>
            {formPreview ? (
              <div className="relative w-full rounded-2xl overflow-hidden shadow-card" style={{ aspectRatio: "4/3" }}>
                <img src={formPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={clearPreview}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-lg"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-10 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  border: "1.5px dashed rgba(167,139,250,0.5)",
                  background: "rgba(167,139,250,0.06)",
                }}
              >
                <span className="text-3xl">📸</span>
                <span className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Tap to add photo</span>
                <span className="text-xs" style={{ color: "var(--color-text-mid)" }}>JPG, PNG or WEBP · max 10 MB</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Date */}
          <div>
            <Label>Date</Label>
            <input
              type="date"
              value={formDate}
              max={today}
              onChange={e => setFormDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
              }}
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
                type="number"
                inputMode="decimal"
                placeholder="e.g. 66"
                min={20} max={400}
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none pr-14"
                style={{
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-border)",
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: "var(--color-text-mid)" }}
              >kg</span>
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
                  <span
                    className="text-[10px] font-semibold leading-none"
                    style={{ color: formMood === m.value ? "#A78BFA" : "var(--color-text-mid)" }}
                  >
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
              maxLength={120}
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-dark outline-none resize-none font-body"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
              }}
            />
          </div>

          {saveError && (
            <div className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
              style={{ background: "rgba(248,113,113,0.10)", color: "#DC2626", border: "1px solid rgba(248,113,113,0.25)" }}>
              {saveError}
            </div>
          )}

          {/* Bottom spacer so content isn't hidden behind save button */}
          <div style={{ height: "1rem" }} />
        </div>

        {/* Save button — sticky footer */}
        <div
          className="px-4 pt-3 flex-shrink-0"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
          }}
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
    );
  }

  // ── TIMELINE LIST ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <BackButton onClick={onClose} />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
            Progress
          </p>
          <p className="text-base font-semibold text-dark leading-tight mt-0.5">Timeline</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
        >
          + Add
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Loading */}
        {loadState === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#A78BFA" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm font-body" style={{ color: "var(--color-text-mid)" }}>Loading your timeline…</p>
          </div>
        )}

        {/* Empty state */}
        {loadState === "ready" && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-card"
              style={{ background: "var(--color-surface)" }}
            >
              📸
            </div>
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
            >
              + Add first entry
            </button>
          </div>
        )}

        {/* Entry list */}
        {loadState === "ready" && entries.length > 0 && (
          <div className="space-y-3 pb-6">
            {entries.map((entry) => {
              const pc = PHASE_COLOR[entry.phase ?? ""] ?? "#A78BFA";
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl overflow-hidden shadow-card"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex gap-0">
                    {/* Photo */}
                    <div className="w-32 flex-shrink-0" style={{ minHeight: "128px" }}>
                      <button
                        onClick={() => setTimelinePreview(entry.imageUrl)}
                        className="w-full h-full block"
                        style={{ minHeight: "128px" }}
                      >
                        <img
                          src={entry.imageUrl}
                          alt="Progress"
                          className="w-full h-full object-cover"
                          style={{ minHeight: "128px" }}
                        />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                      {/* Top row: date + delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-dark leading-tight">
                            {formatDate(entry.date)}
                          </p>
                          {entry.phase && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                              style={{ background: `${pc}18`, color: pc, border: `1px solid ${pc}35` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc }} />
                              {PHASE_LABEL[entry.phase] ?? entry.phase}
                            </span>
                          )}
                        </div>
                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { handleDelete(entry); setConfirmDeleteId(null); }}
                              disabled={deletingId === entry.id}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all active:scale-90 disabled:opacity-40"
                              style={{ background: "#EF4444" }}
                            >
                              {deletingId === entry.id ? "…" : "Delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-90"
                              style={{
                                background: "var(--color-surface-2)",
                                color: "var(--color-text-mid)",
                                border: "1px solid var(--color-border)",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                            style={{
                              background: "rgba(248,113,113,0.10)",
                              color: "#EF4444",
                              border: "1px solid rgba(248,113,113,0.2)",
                              fontSize: "0.85rem",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {entry.weight !== null && (
                          <span className="text-xs font-semibold text-dark flex items-center gap-1">
                            <span>⚖️</span> {entry.weight} kg
                          </span>
                        )}
                        {entry.mood && (
                          <span className="text-xs font-semibold text-dark flex items-center gap-1">
                            <span>{MOOD_EMOJI[entry.mood] ?? "😊"}</span>
                            {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Note */}
                      {entry.note && (
                        <p
                          className="text-xs font-body leading-snug mt-2 italic"
                          style={{ color: "var(--color-text-mid)" }}
                        >
                          "{entry.note}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen photo preview */}
      {timelinePreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setTimelinePreview(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={timelinePreview}
              alt="Progress photo"
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setTimelinePreview(null)}
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
