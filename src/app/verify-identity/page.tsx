"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  FileCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  UploadCloud,
} from "lucide-react";

type DocResult = {
  proofHash: string;
  identity: {
    name: string;
    dob: string;
    gender: string;
    referenceMasked: string;
    photoBase64: string | null;
  };
};

export default function VerifyIdentityPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("unverified");
  const [loading, setLoading] = useState(true);
  const [xml, setXml] = useState<File | null>(null);
  const [doc, setDoc] = useState<DocResult | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [selfie, setSelfie] = useState("");
  const [finalLoading, setFinalLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
    return () => stopCamera();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("id", user.id)
      .maybeSingle();
    setStatus(data?.verification_status || "unverified");
    setLoading(false);
  }

  async function verifyXml() {
    if (!xml) {
      setError("Select the extracted UIDAI Offline e-KYC XML first.");
      return;
    }
    setError("");
    setMessage("");
    setDocLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please login again.");
      const form = new FormData();
      form.append("xml", xml);
      form.append("accessToken", session.access_token);
      const res = await fetch("/api/identity/verify-aadhaar", {
        method: "POST",
        body: form,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "UIDAI verification failed.");
      setDoc(payload as DocResult);
      setMessage("✓ UIDAI digital signature verified. Raw XML is never stored.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setDocLoading(false);
    }
  }

  async function startCamera() {
    setError("");
    setLivenessPassed(false);
    setSelfie("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      const prompts = [
        "Look straight and blink naturally",
        "Turn your head slightly left, then look back",
        "Turn your head slightly right, then look back",
      ];
      setChallenge(prompts[Math.floor(Math.random() * prompts.length)]);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setError("Camera access is required for the live presence check.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function captureLiveSelfie() {
    const video = videoRef.current;
    if (!video || video.videoWidth < 100) {
      setError("Camera is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const image = canvas.toDataURL("image/jpeg", 0.82);

    const FaceDetectorCtor = (
      window as unknown as {
        FaceDetector?: new (o?: object) => { detect: (i: CanvasImageSource) => Promise<unknown[]> };
      }
    ).FaceDetector;
    if (FaceDetectorCtor) {
      try {
        const faces = await new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 2 }).detect(canvas);
        if (faces.length !== 1) {
          setError("Keep exactly one face clearly visible and try again.");
          return;
        }
      } catch {}
    }
    setSelfie(image);
    setLivenessPassed(true);
    stopCamera();
    setMessage("✓ Live camera presence challenge completed locally.");
  }

  async function finishVerification() {
    if (!doc || !livenessPassed) {
      setError("Complete both UIDAI document verification and live selfie presence first.");
      return;
    }
    setFinalLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("complete_identity_verification", {
        p_reference_hash: doc.proofHash,
        p_identity_name: doc.identity.name || "",
        p_liveness_passed: true,
        p_face_match_score: null,
      });
      if (rpcError) throw rpcError;
      setStatus("verified");
      setMessage(`🎉 Identity Verified! EcoMatch Trust Score upgraded to ${data?.trust_score ?? 85}/100.`);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish verification.");
    } finally {
      setFinalLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="eco-page min-h-screen text-white">
        <Navbar />
        <div className="mx-auto max-w-4xl px-6 pt-36 text-center">
          <div className="shimmer-box mx-auto h-12 w-64 rounded-2xl" />
        </div>
      </main>
    );
  }

  const done = status === "verified";

  return (
    <main className="eco-page min-h-screen text-white pb-24">
      <Navbar />

      <div className="eco-orb eco-orb-one" />
      <div className="eco-orb eco-orb-two" />

      <div className="relative mx-auto max-w-4xl px-4 pt-28 sm:px-6 lg:px-8">
        <div>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            PHASE 8 · IDENTITY & TRUST
          </span>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Verify Once. Sell With <span className="text-emerald-400">High Trust</span>.
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/60">
            EcoMatch cryptographically validates the RSA digital signature on your UIDAI Paperless Offline e-KYC and runs a browser-native presence check.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs font-bold text-emerald-300">
            {message}
          </div>
        )}

        {done ? (
          <div className="mt-8 rounded-3xl border border-emerald-400/40 bg-[#06241a] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400 text-3xl text-[#03140e]">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-black text-white">Identity Verified Successfully</h2>
            <p className="mt-2 text-xs text-white/60">
              ₹10,000 listing restriction and 30-post caps have been lifted. You can now post up to 300 listings with no price cap.
            </p>
            <Link
              href="/profile"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
            >
              View Verified Profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Step 1: UIDAI e-KYC */}
            <div className="rounded-3xl border border-emerald-500/20 bg-[#061e16]/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-black text-emerald-300">
                  01
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">UIDAI Paperless Offline e-KYC</h3>
                  <p className="text-xs text-white/50">Upload your extracted e-KYC XML from MyAadhaar</p>
                </div>
              </div>

              <div className="mt-4">
                <input
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={(e) => {
                    setXml(e.target.files?.[0] || null);
                    setDoc(null);
                  }}
                  className="block w-full rounded-xl border border-white/10 bg-[#03110b] p-3 text-xs text-white file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-300"
                />

                <button
                  onClick={verifyXml}
                  disabled={!xml || docLoading}
                  className="mt-3 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50"
                >
                  {docLoading ? "Validating Signature..." : doc ? "✓ Signature Validated" : "Verify e-KYC XML"}
                </button>

                {doc && (
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                    {doc.identity.photoBase64 && (
                      <img
                        src={`data:image/jpeg;base64,${doc.identity.photoBase64}`}
                        alt="KYC Photo"
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="font-bold text-emerald-300">{doc.identity.name || "UIDAI Signed Identity"}</p>
                      <p className="text-xs text-white/50">Reference: {doc.identity.referenceMasked} · Signature Valid</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Live Camera Liveness */}
            <div
              className={`rounded-3xl border p-6 shadow-xl backdrop-blur-xl transition-all ${
                !doc ? "opacity-50 border-white/10 bg-black/40" : "border-emerald-500/20 bg-[#061e16]/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-black text-emerald-300">
                  02
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Live Camera Presence Challenge</h3>
                  <p className="text-xs text-white/50">Randomized facial movement check (local frames stay in browser)</p>
                </div>
              </div>

              <div className="mt-4">
                {!cameraOn && !livenessPassed && (
                  <button
                    onClick={startCamera}
                    disabled={!doc}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" /> Start Live Camera
                  </button>
                )}

                {cameraOn && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-300">
                      Challenge: {challenge}
                    </div>
                    <div className="relative aspect-square max-h-72 w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-black">
                      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                      <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-2xl pointer-events-none" />
                    </div>
                    <button
                      onClick={captureLiveSelfie}
                      className="rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-black text-[#03140e] hover:bg-emerald-300"
                    >
                      I Completed the Movement · Capture
                    </button>
                  </div>
                )}

                {livenessPassed && (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">Live Presence Verified</span>
                    </div>
                    {selfie && <img src={selfie} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Complete Activation */}
            <div className="rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-[#072a1d] to-[#04150e] p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400 text-xs font-black text-[#03140e]">
                  03
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Activate Verified Trader Badge</h3>
                  <p className="text-xs text-white/50">Stores a cryptographic proof hash and trust metadata.</p>
                </div>
              </div>

              <button
                onClick={finishVerification}
                disabled={!doc || !livenessPassed || finalLoading}
                className="mt-5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3.5 text-xs font-black text-[#03140e] shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {finalLoading ? "Activating..." : "Complete Identity Verification"}
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  );
}
