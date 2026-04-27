"use client";

// components/BarcodeScanner.tsx
// PWA barcode scanner using @zxing/browser camera API.
// Renders a full-screen overlay with a live video feed + scanning crosshair.

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose:    () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const controlsRef    = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const detectedRef    = useRef(false);

  useEffect(() => {
    let active = true;

    async function startScanner() {
      try {
        // Dynamic import — @zxing/browser + @zxing/library use browser-only APIs
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (!active || !videoRef.current) return;

        // Restrict to common food barcode formats — much faster than scanning all
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        // Force back/environment camera — undefined picks front camera on mobile
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, err) => {
            if (!active || detectedRef.current) return;
            if (result) {
              detectedRef.current = true;
              setScanning(false);
              onDetected(result.getText());
            }
            // err fires every frame that fails to decode — ignore
            void err;
          },
        );
        if (active) controlsRef.current = controls;
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (msg.toLowerCase().includes("found") || msg.toLowerCase().includes("device")) {
          setError("No camera found on this device.");
        } else {
          setError("Could not start scanner. Please try again.");
        }
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe-top pt-5 pb-3"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
        >
          ✕
        </button>
        <p className="text-white font-semibold text-sm">Scan barcode</p>
        <div className="w-10" />
      </div>

      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Scanning crosshair overlay */}
      {scanning && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-40">
            {/* Dimming backdrop */}
            <div className="absolute inset-0 -top-96 -bottom-96 -left-96 -right-96"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }} />

            {/* Corner brackets */}
            {(["tl","tr","bl","br"] as const).map(c => (
              <span key={c} className="absolute w-6 h-6 border-white"
                style={{
                  top:    c.startsWith("t") ? 0 : "auto",
                  bottom: c.startsWith("b") ? 0 : "auto",
                  left:   c.endsWith("l")   ? 0 : "auto",
                  right:  c.endsWith("r")   ? 0 : "auto",
                  borderTopWidth:    c.startsWith("t") ? 3 : 0,
                  borderBottomWidth: c.startsWith("b") ? 3 : 0,
                  borderLeftWidth:   c.endsWith("l")   ? 3 : 0,
                  borderRightWidth:  c.endsWith("r")   ? 3 : 0,
                  borderRadius:
                    c === "tl" ? "4px 0 0 0" :
                    c === "tr" ? "0 4px 0 0" :
                    c === "bl" ? "0 0 0 4px" :
                                 "0 0 4px 0",
                }}
              />
            ))}

            {/* Scan line animation */}
            <div className="absolute left-2 right-2 h-0.5 animate-bounce"
              style={{ background: "linear-gradient(90deg, transparent, #fff, transparent)", top: "50%" }} />
          </div>
        </div>
      )}

      {/* Bottom instruction */}
      {scanning && !error && (
        <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom pb-10 px-6 text-center pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }}>
          <p className="text-white text-sm font-body opacity-80">
            Point at any food barcode to look it up
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div className="rounded-2xl p-6 max-w-xs"
            style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-3xl mb-3">📷</p>
            <p className="text-white font-semibold text-sm mb-2">Scanner unavailable</p>
            <p className="text-white/60 text-xs font-body mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              Search manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
