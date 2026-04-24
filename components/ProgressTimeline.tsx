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
  ovulation: "#FBBF24", luteal:     "#A78BFA",
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00")
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
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

  // Add-entry form state
  const today = new Date().toISOString().split("T")[0];
  const [formDate, setFormDate]     = useState(today);
  const [formWeight, setFormWeight] = useState("");
  const [formMood, setFormMood]     = useState("");
  const [formNote, setFormNote]     = useState("");
  const [formPhase]                 = useState(currentPhase);
  const [formFile, setFormFile]     = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

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
    if (!formFile) { setSaveError("Please select a photo."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const entry = await createProgressEntry({
        file:   formFile,
        date:   formDate,
        weight: formWeight ? parseFloat(formWeight) : null,
        mood:   formMood  || null,
        note:   formNote  || null,
        phase:  formPhase || null,
      });
      setEntries(prev => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      resetForm();
      setView("list");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
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

  function resetForm() {
    setFormDate(today);
    setFormWeight("");
    setFormMood("");
    setFormNote("");
    setFormFile(null);
    if (formPreview) URL.revokeObjectURL(formPreview);
    setFormPreview(null);
    setSaveError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openAdd() {
    resetForm();
    setView("add");
  }

  // ── Add-entry form ──────────────────────────────────────────────────────────
  if (view === "add") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-background)" }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 pt-safe-top pb-4 pt-6 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => { resetForm(); setView("list"); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
              New Entry
            </p>
            <p className="text-base font-semibold text-dark leading-tight">Add progress check-in</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {/* Photo picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
              Photo *
            </p>
            {formPreview ? (
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <img src={formPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setFormFile(null); if (formPreview) URL.revokeObjectURL(formPreview); setFormPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-10 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-98"
                style={{ border: "1.5px dashed rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.04)" }}
              >
                <span className="text-2xl">📸</span>
                <span className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Tap to add photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Date */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
              Date
            </p>
            <input
              type="date"
              value={formDate}
              max={today}
              onChange={e => setFormDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            />
          </div>

          {/* Phase (auto-filled, read-only) */}
          {formPhase && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
                Phase
              </p>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: `${PHASE_COLOR[formPhase] ?? "#C48A97"}14`,
                  color: PHASE_COLOR[formPhase] ?? "#C48A97",
                  border: `1px solid ${PHASE_COLOR[formPhase] ?? "#C48A97"}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PHASE_COLOR[formPhase] ?? "#C48A97" }} />
                {PHASE_LABEL[formPhase] ?? formPhase} · auto-filled
              </div>
            </div>
          )}

          {/* Weight */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
              Weight <span className="normal-case font-normal">(optional)</span>
            </p>
            <div className="relative">
              <input
                type="number"
                placeholder="66"
                min={30} max={300}
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-dark outline-none pr-12"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--color-text-dim)" }}>kg</span>
            </div>
          </div>

          {/* Mood */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
              Mood <span className="normal-case font-normal">(optional)</span>
            </p>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setFormMood(prev => prev === m.value ? "" : m.value)}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{
                    background: formMood === m.value ? "rgba(167,139,250,0.15)" : "var(--color-surface)",
                    border: `1.5px solid ${formMood === m.value ? "rgba(167,139,250,0.4)" : "var(--color-border)"}`,
                  }}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] font-semibold" style={{ color: formMood === m.value ? "#A78BFA" : "var(--color-text-dim)" }}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-dim)" }}>
              Note <span className="normal-case font-normal">(optional · {120 - formNote.length} left)</span>
            </p>
            <textarea
              placeholder="Felt strong today…"
              maxLength={120}
              value={formNote}
              onChange={e => setFormNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-dark outline-none resize-none font-body"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-400 text-center font-body">{saveError}</p>
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pb-8 pt-3 flex-shrink-0 border-t" style={{ borderColor: "var(--color-border)" }}>
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

  // ── Timeline list ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-6 pb-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          ←
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>
            Progress
          </p>
          <p className="text-base font-semibold text-dark leading-tight">Timeline</p>
        </div>
        <button
          onClick={openAdd}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
        >
          + Add Entry
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading */}
        {loadState === "loading" && (
          <div className="flex items-center justify-center py-20">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#A78BFA" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}

        {/* Empty state */}
        {loadState === "ready" && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(167,139,250,0.1)" }}
            >
              📸
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-dark">No progress entries yet</p>
              <p className="text-xs font-body mt-1" style={{ color: "var(--color-text-dim)" }}>
                Add your first check-in to start your timeline.
              </p>
            </div>
            <button
              onClick={openAdd}
              className="px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #A78BFA, #7B6D8D)" }}
            >
              + Add first entry
            </button>
          </div>
        )}

        {/* Entries */}
        {loadState === "ready" && entries.length > 0 && (
          <div className="space-y-3 pb-4">
            {entries.map((entry) => {
              const phaseColor = PHASE_COLOR[entry.phase ?? ""] ?? "#A78BFA";
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={entry.imageUrl} alt="Entry" className="w-full h-full object-cover" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <p className="text-xs font-bold tracking-wider text-dark">
                            {formatDate(entry.date)}
                          </p>
                          {entry.phase && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                              style={{ background: `${phaseColor}18`, color: phaseColor }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ background: phaseColor }} />
                              {PHASE_LABEL[entry.phase] ?? entry.phase}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                          style={{ background: "rgba(248,113,113,0.08)", color: "#F87171" }}
                        >
                          {deletingId === entry.id ? "…" : "🗑"}
                        </button>
                      </div>

                      <div className="space-y-1">
                        {entry.weight !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]">⚖️</span>
                            <span className="text-xs font-semibold text-dark">{entry.weight} kg</span>
                          </div>
                        )}
                        {entry.mood && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]">{MOOD_EMOJI[entry.mood] ?? "😊"}</span>
                            <span className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>
                              {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
                            </span>
                          </div>
                        )}
                        {entry.note && (
                          <p
                            className="text-xs font-body leading-snug mt-1"
                            style={{ color: "var(--color-text-dim)" }}
                          >
                            "{entry.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
