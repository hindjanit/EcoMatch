"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Bell,
  MapPin,
  Mic,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedFeature?: "call" | "location" | "camera" | "notification" | "general";
  onPermissionGranted?: (feature: string) => void;
}

export default function EcoMatchPermissionsModal({
  isOpen,
  onClose,
  requestedFeature = "general",
  onPermissionGranted,
}: PermissionsModalProps) {
  const [notifState, setNotifState] = useState<NotificationPermission>("default");
  const [locState, setLocState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [micGranted, setMicGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifState(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleRequestNotification() {
    setFeedback("");
    if (typeof window === "undefined" || !("Notification" in window)) {
      setFeedback("Browser notifications are not supported on this device.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifState(perm);
      if (perm === "granted") {
        setFeedback("✓ Notification alerts enabled for incoming calls and deals.");
        onPermissionGranted?.("notification");
      } else {
        setFeedback("Notification permission was denied. You can re-enable it in browser settings.");
      }
    } catch (e) {
      setFeedback("Error requesting notification access.");
    }
  }

  async function handleRequestLocation() {
    setFeedback("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFeedback("GPS location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocState("granted");
        setFeedback("✓ Location enabled. Ready to discover nearby materials and verify meetings.");
        onPermissionGranted?.("location");
      },
      (err) => {
        setLocState("denied");
        setFeedback(
          err.code === 1
            ? "Location permission was denied. Please allow location in site settings."
            : "Could not retrieve GPS coordinates."
        );
      },
      { timeout: 8000 }
    );
  }

  async function handleRequestMic() {
    setFeedback("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicGranted(true);
      setFeedback("✓ Microphone verified for encrypted WebRTC voice calls.");
      onPermissionGranted?.("call");
    } catch (e) {
      setFeedback("Microphone access was denied or device is unavailable.");
    }
  }

  async function handleRequestCamera() {
    setFeedback("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCamGranted(true);
      setFeedback("✓ Camera verified for in-app QR scanner and presence check.");
      onPermissionGranted?.("camera");
    } catch (e) {
      setFeedback("Camera access was denied or device is unavailable.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#061d15] p-6 text-white shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black">Enable EcoMatch Experience</h3>
            <p className="text-xs text-white/60">
              Control which hardware permissions are granted for safe marketplace communication.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-300">
            {feedback}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {/* Notifications */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#03140e] p-4">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Incoming Call & Deal Alerts</h4>
                <p className="text-xs text-white/50">
                  Receive rings when buyers call you, meeting updates, and dispute warnings.
                </p>
              </div>
            </div>
            {notifState === "granted" ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestNotification}
                className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-3.5 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 transition"
              >
                Allow
              </button>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#03140e] p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Location Proximity</h4>
                <p className="text-xs text-white/50">
                  Discover nearby circular materials and verify physical exchange coordinates.
                </p>
              </div>
            </div>
            {locState === "granted" ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestLocation}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
              >
                Allow
              </button>
            )}
          </div>

          {/* Microphone */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#03140e] p-4">
            <div className="flex items-start gap-3">
              <Mic className="mt-0.5 h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Microphone (WebRTC Voice)</h4>
                <p className="text-xs text-white/50">
                  Required only when placing or answering encrypted in-app voice calls.
                </p>
              </div>
            </div>
            {micGranted ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestMic}
                className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
              >
                Allow
              </button>
            )}
          </div>

          {/* Camera */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#03140e] p-4">
            <div className="flex items-start gap-3">
              <Camera className="mt-0.5 h-5 w-5 text-purple-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Camera Scanner</h4>
                <p className="text-xs text-white/50">
                  Used for scanning single-use handover QR codes and live presence check.
                </p>
              </div>
            </div>
            {camGranted ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
              </span>
            ) : (
              <button
                onClick={handleRequestCamera}
                className="rounded-xl border border-purple-400/40 bg-purple-500/20 px-3.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/30 transition"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>EcoMatch never accesses camera or microphone outside active calls.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
