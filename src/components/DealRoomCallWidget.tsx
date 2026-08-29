"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  ShieldCheck,
  Loader2,
  Disc3,
  Volume2,
} from "lucide-react";

interface DealRoomCallWidgetProps {
  dealId: string;
  dealCode: string;
  userId: string;
  counterpartyId: string;
  counterpartyName: string;
  isBuyer: boolean;
  productTitle?: string;
  disabled?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

export default function DealRoomCallWidget({
  dealId,
  dealCode,
  userId,
  counterpartyId,
  counterpartyName,
  isBuyer,
  productTitle,
  disabled = false,
}: DealRoomCallWidgetProps) {
  const supabase = createClient();

  const [callState, setCallState] = useState<
    "idle" | "calling" | "incoming" | "connected" | "ended"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callStatusMsg, setCallStatusMsg] = useState("");
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ICE Candidates Queue for early trickle candidates
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Audio Recorder & Context refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStartedRef = useRef(false);

  // Ringtone generator refs
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneCtxRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCallCleanup();
    };
  }, []);

  // Subscribe to Supabase Realtime Signaling Channel for this deal
  useEffect(() => {
    if (!dealId || !userId) return;

    const channelName = `deal-call-${dealId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "CALL_OFFER" }, async ({ payload }) => {
        if (payload.targetId === userId) {
          pendingOfferRef.current = payload.offer;
          setCallState("incoming");
          startIncomingRingtone();
        }
      })
      .on("broadcast", { event: "CALL_ANSWER" }, async ({ payload }) => {
        if (payload.targetId === userId && peerConnectionRef.current) {
          try {
            stopRingtone();
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            );
            await flushQueuedIceCandidates();
            setCallState("connected");
            startCallTimer();
          } catch (err) {
            console.error("Set remote description answer error:", err);
          }
        }
      })
      .on("broadcast", { event: "ICE_CANDIDATE" }, async ({ payload }) => {
        if (payload.targetId === userId && payload.candidate) {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("Add ICE candidate error:", e);
            }
          } else {
            // Queue candidate until remote description is set
            iceCandidatesQueueRef.current.push(payload.candidate);
          }
        }
      })
      .on("broadcast", { event: "CALL_END" }, ({ payload }) => {
        if (payload.targetId === userId || payload.dealId === dealId) {
          handleRemoteHangup();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, userId]);

  async function flushQueuedIceCandidates() {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Flush ICE candidate error:", e);
        }
      }
    }
  }

  // Timer helpers
  function startCallTimer() {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setDuration(0);
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }

  function stopCallTimer() {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }

  // Initialize Web Audio playback fallback
  function ensureAudioPlayback(stream: MediaStream) {
    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current
          .play()
          .then(() => setHasRemoteAudio(true))
          .catch((e) => console.warn("Audio element play exception:", e));
      }

      // Web Audio destination fallback
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const source = ctx.createMediaStreamSource(stream);
        source.connect(ctx.destination);
        setHasRemoteAudio(true);
      }
    } catch (err) {
      console.warn("Ensure audio playback error:", err);
    }
  }

  // =========================================================================
  // RINGTONE & RINGBACK AUDIO SYNTHESIZER
  // =========================================================================
  function startOutgoingRingbackTone() {
    stopRingtone();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      ringtoneCtxRef.current = ctx;

      const playToneBeep = () => {
        if (!ctx || ctx.state === "closed") return;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // US standard dial/ringback tone: 440Hz + 480Hz
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      };

      playToneBeep();
      ringtoneIntervalRef.current = setInterval(playToneBeep, 3500);
    } catch (e) {
      console.warn("Could not start ringback tone:", e);
    }
  }

  function startIncomingRingtone() {
    stopRingtone();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      ringtoneCtxRef.current = ctx;

      const playMelodyChime = () => {
        if (!ctx || ctx.state === "closed") return;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});

        const now = ctx.currentTime;
        const notes = [
          { f: 587.33, t: 0 },    // D5
          { f: 783.99, t: 0.14 }, // G5
          { f: 880.00, t: 0.28 }, // A5
          { f: 1046.50, t: 0.42 },// C6
        ];

        notes.forEach(({ f, t }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(0.12, now + t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + 0.42);
        });
      };

      playMelodyChime();
      ringtoneIntervalRef.current = setInterval(playMelodyChime, 2400);
    } catch (e) {
      console.warn("Could not start incoming ringtone:", e);
    }
  }

  function stopRingtone() {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneCtxRef.current) {
      ringtoneCtxRef.current.close().catch(() => {});
      ringtoneCtxRef.current = null;
    }
  }

  // Setup Peer Connection
  async function createPeerConnection(): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Get Local Microphone Stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    localStreamRef.current = stream;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Remote Audio Stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        ensureAudioPlayback(event.streams[0]);

        // Start recording once both streams are connected
        if (!recordingStartedRef.current) {
          startCallRecording();
        }
      }
    };

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ICE_CANDIDATE",
          payload: {
            targetId: counterpartyId,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallStatusMsg("Connected • Encrypted Audio");
        setCallState("connected");
      }
    };

    return pc;
  }

  // 1. OUTGOING CALL
  async function startCall() {
    try {
      setCallStatusMsg("Accessing secure microphone...");
      setCallState("calling");
      startOutgoingRingbackTone();

      // Unlock AudioContext on user interaction
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      }

      const pc = await createPeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "CALL_OFFER",
          payload: {
            dealId,
            targetId: counterpartyId,
            callerId: userId,
            offer,
          },
        });
      }

      setCallStatusMsg(`Ringing ${counterpartyName}...`);
    } catch (err) {
      console.error("Start call error:", err);
      stopRingtone();
      setCallStatusMsg("Microphone permission required for secure call.");
      setTimeout(() => setCallState("idle"), 3000);
    }
  }

  // 2. ACCEPT INCOMING CALL
  async function acceptCall() {
    try {
      stopRingtone();
      setCallStatusMsg("Connecting audio stream...");

      // Unlock AudioContext on user click
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      }

      const pc = await createPeerConnection();

      const offer = pendingOfferRef.current;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushQueuedIceCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "CALL_ANSWER",
            payload: {
              dealId,
              targetId: counterpartyId,
              answer,
            },
          });
        }

        setCallState("connected");
        startCallTimer();
      }
    } catch (err) {
      console.error("Accept call error:", err);
      stopRingtone();
      handleEndCall();
    }
  }

  // 3. DECLINE INCOMING CALL
  function declineCall() {
    stopRingtone();
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "CALL_END",
        payload: { dealId, targetId: counterpartyId },
      });
    }
    endCallCleanup();
    setCallState("idle");
  }

  // 4. CALL RECORDING (MediaRecorder + AudioContext mixing)
  function startCallRecording() {
    try {
      if (recordingStartedRef.current) return;
      recordingStartedRef.current = true;
      audioChunksRef.current = [];

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      const dest = audioCtx.createMediaStreamDestination();

      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        const localSource = audioCtx.createMediaStreamSource(localStreamRef.current);
        localSource.connect(dest);
      }

      if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
        const remoteSource = audioCtx.createMediaStreamSource(remoteStreamRef.current);
        remoteSource.connect(dest);
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        await saveCallRecording(audioChunksRef.current, duration);
      };

      recorder.start(1000);
    } catch (recErr) {
      console.warn("Call recording initialization:", recErr);
    }
  }

  // 5. UPLOAD RECORDING & SAVE LOGS
  async function saveCallRecording(chunks: Blob[], callDuration: number) {
    if (chunks.length === 0 || callDuration < 2) return;

    try {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const fileName = `${dealId}/${Date.now()}_call_${userId.slice(0, 6)}.webm`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("deal_recordings")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: true,
        });

      let recordingUrl: string | null = null;
      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("deal_recordings")
          .getPublicUrl(fileName);
        recordingUrl = publicUrlData.publicUrl;
      }

      // Save log in deal_call_logs table
      await supabase.from("deal_call_logs").insert({
        deal_id: dealId,
        caller_id: userId,
        receiver_id: counterpartyId,
        duration_seconds: callDuration,
        recording_url: recordingUrl,
        status: "completed",
      });
    } catch (saveErr) {
      console.warn("Save call recording error:", saveErr);
    }
  }

  // 6. TOGGLE MUTE
  function toggleMute() {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }

  // 7. END CALL
  function handleEndCall() {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "CALL_END",
        payload: { dealId, targetId: counterpartyId },
      });
    }
    endCallCleanup();
    setCallState("ended");
    setTimeout(() => setCallState("idle"), 2500);
  }

  function handleRemoteHangup() {
    endCallCleanup();
    setCallState("ended");
    setTimeout(() => setCallState("idle"), 2500);
  }

  function endCallCleanup() {
    stopRingtone();
    stopCallTimer();
    recordingStartedRef.current = false;
    iceCandidatesQueueRef.current = [];
    pendingOfferRef.current = null;
    setHasRemoteAudio(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Recorder stop error:", e);
      }
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <>
      {/* Hidden Audio Element for Remote Voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main Trigger Button */}
      {callState === "idle" && (
        <button
          type="button"
          onClick={startCall}
          disabled={disabled}
          className="flex items-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-xs font-black text-sky-300 transition-all hover:bg-sky-500/25 active:scale-95 disabled:opacity-50 shadow-lg shadow-sky-500/10"
        >
          <PhoneCall className="h-4 w-4 text-sky-400 animate-pulse" />
          <span>
            📞 Call {counterpartyName} ({isBuyer ? "Seller" : "Buyer"})
            {productTitle ? ` — Re: ${productTitle}` : ""}
          </span>
        </button>
      )}

      {/* Outgoing Calling Modal */}
      {callState === "calling" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#061922] p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
              <PhoneCall className="h-8 w-8 text-sky-400 animate-bounce" />
            </div>

            <h3 className="mt-4 text-lg font-black text-white">
              Calling {counterpartyName} ({isBuyer ? "Seller" : "Buyer"})...
            </h3>

            {productTitle && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-0.5 text-xs font-semibold text-sky-300">
                <span>Regarding: {productTitle}</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-sky-300 font-mono">
              <Volume2 className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
              <span>Ringtone Active • {callStatusMsg || "Ringing..."}</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 py-1 px-3 text-[10px] font-bold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Identity & Number Masked</span>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleEndCall}
                className="flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-xs font-black text-white hover:bg-red-600 transition active:scale-95 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="h-4 w-4" /> Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Ringing Modal */}
      {callState === "incoming" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-500/40 bg-[#051c14] p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/20 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <PhoneIncoming className="h-9 w-9 text-emerald-400" />
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Incoming Handover Call
            </span>

            <h3 className="mt-2 text-xl font-black text-white">
              {counterpartyName} ({isBuyer ? "Seller" : "Buyer"})
            </h3>

            {productTitle ? (
              <p className="mt-1 text-xs text-white/80 font-semibold">
                Regarding: <span className="text-emerald-300 font-bold">{productTitle}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/60">Deal Code: #{dealCode}</p>
            )}

            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-mono">
              <Volume2 className="h-3.5 w-3.5 animate-bounce" />
              <span>Ringing • Handover Call</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
              <Disc3 className="h-3.5 w-3.5 animate-spin" />
              <span>Recorded for security & dispute safety</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={declineCall}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/15 py-3 text-xs font-bold text-red-300 hover:bg-red-500/25 transition active:scale-95"
              >
                <PhoneOff className="h-4 w-4" /> Decline
              </button>

              <button
                type="button"
                onClick={acceptCall}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 transition active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                <Phone className="h-4 w-4 fill-current" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Connected Call Drawer / Floating Card */}
      {callState === "connected" && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-3xl border border-emerald-400/50 bg-[#061f17]/95 p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Volume2 className={`h-5 w-5 ${hasRemoteAudio ? "animate-bounce" : "animate-pulse"}`} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {counterpartyName} ({isBuyer ? "Seller" : "Buyer"})
                </h4>
                {productTitle && (
                  <p className="text-[10px] text-emerald-300/80 truncate max-w-[170px]">
                    Re: {productTitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{formatTimer(duration)}</span>
                </div>
              </div>
            </div>

            {/* Recording Indicator */}
            <div className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" /> REC
            </div>
          </div>

          <p className="mt-3 text-[10px] text-white/50 text-center">
            🔒 End-to-end encrypted • Audited for handover safety
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                isMuted
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-black text-white hover:bg-red-600 transition active:scale-95 shadow-md shadow-red-500/20"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </button>
          </div>
        </div>
      )}

      {/* Call Ended Message */}
      {callState === "ended" && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60">
          <PhoneOff className="h-4 w-4 text-red-400" />
          <span>Call Ended ({formatTimer(duration)})</span>
        </div>
      )}
    </>
  );
}
