"use client";

// components/CheckInButton.tsx

interface Props {
  cycleDay: number;
  status: "idle" | "loading" | "success" | "error";
  onSave: () => void;
}

export default function CheckInButton({ cycleDay, status, onSave }: Props) {
  const isLoading = status === "loading";

  return (
    <button
      onClick={onSave}
      disabled={isLoading}
      className="w-full py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-soft mt-1"
      style={{
        background:
          status === "success"
            ? "linear-gradient(135deg, #34D399, #10B981)"
            : status === "error"
            ? "linear-gradient(135deg, #F87171, #EF4444)"
            : "linear-gradient(135deg, #C48A97, #7B6D8D)",
      }}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="white" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="white"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Saving…
        </span>
      ) : status === "success" ? (
        "✓ Saved!"
      ) : status === "error" ? (
        "✗ Retry"
      ) : (
        `Save Check-in · Day ${cycleDay}`
      )}
    </button>
  );
}
