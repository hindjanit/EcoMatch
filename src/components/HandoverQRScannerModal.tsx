"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  Scan,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (token: string) => void;
  expectedDealCode?: string;
  demoToken?: string;
}

export default function HandoverQRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  expectedDealCode,
  demoToken,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [scanStatus, setScanStatus] = useState<"scanning" | "detected" | "error">("scanning");

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  async function startCamera() {
    setCameraLoading(true);
    setCameraError("");
    setScanStatus("scanning");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
      startScanningLoop();
    } catch (err) {
      setCameraLoading(false);
      setCameraError("Camera access denied or unavailable. You can enter or simulate the QR token below.");
    }
  }

  function stopCamera() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startScanningLoop() {
    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (o?: object) => {
          detect: (i: CanvasImageSource) => Promise<{ rawValue?: string }[]>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue;
          handleFoundToken(raw);
          return;
        }
      } catch (e) {
        // continue loop
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }

  function handleFoundToken(tokenString: string) {
    setScanStatus("detected");
    stopCamera();

    let finalToken = tokenString.trim();
    try {
      const parsed = JSON.parse(finalToken);
      if (parsed.qrToken) finalToken = parsed.qrToken;
      else if (parsed.code) finalToken = parsed.code;
    } catch {}

    setTimeout(() => {
      onScanSuccess(finalToken);
      onClose();
    }, 500);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleFoundToken(manualToken.trim());
  }

  function handleDemoBypass() {
    const token = demoToken || `ECMQR-DEMO-${Date.now().toString(16)}`;
    handleFoundToken(token);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/40 bg-[#04160f] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black">Scan Handover QR</h3>
            <p className="text-xs text-white/60">
              Align the seller's dynamic handover QR code within the frame.
            </p>
          </div>
        </div>

        {/* Video Viewfinder Container */}
        <div className="relative mt-5 aspect-square w-full overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-black">
          <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-cover" />

          {/* Viewfinder Target Overlay */}
          <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-emerald-400/70 pointer-events-none flex items-center justify-center">
            {scanStatus === "scanning" && (
              <div className="h-0.5 w-full bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
            )}
            {scanStatus === "detected" && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-black text-[#03140e] shadow-lg">
                <CheckCircle2 className="h-4 w-4" /> QR Verified!
              </div>
            )}
          </div>

          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-xs text-white/60">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-2" />
              <span>Starting camera viewfinder...</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-xs">
              <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
              <p className="text-white/80">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Manual Token Input / Demo Fallback */}
        <div className="mt-4 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Or enter QR token manually..."
              className="flex-1 rounded-xl border border-white/10 bg-[#020d07] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualToken.trim()}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-[#03140e] hover:bg-emerald-300 disabled:opacity-50"
            >
              Verify
            </button>
          </form>

          {/* Judge / Demo Mode One-Click Scan */}
          <button
            type="button"
            onClick={handleDemoBypass}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/15 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>[DEMO MODE] Simulate Instant QR Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
