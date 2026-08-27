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
  disabled?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function DealRoomCallWidget({
  dealId,
  dealCode,
  userId,
  counterpartyId,
  counterpartyName,
  isBuyer,
  disabled = false,
}: DealRoomCallWidgetProps) {
  const supabase = createClient();

  const [callState, setCallState] = useState<
    "idle" | "calling" | "incoming" | "connected" | "ended"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callStatusMsg, setCallStatusMsg] = useState("");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Audio Recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
          if (callState === "idle") {
            setCallState("incoming");
            // Store offer data temporarily
            (window as unknown as { pendingOffer: RTCSessionDescriptionInit }).pendingOffer = payload.offer;
          }
        }
      })
      .on("broadcast", { event: "CALL_ANSWER" }, async ({ payload }) => {
        if (payload.targetId === userId && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          );
          setCallState("connected");
          startCallTimer();
          startCallRecording();
        }
      })
      .on("broadcast", { event: "ICE_CANDIDATE" }, async ({ payload }) => {
        if (payload.targetId === userId && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          } catch (e) {
            console.warn("ICE candidate error:", e);
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
  }, [dealId, userId, callState]);

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
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((e) => console.warn("Audio autoplay:", e));
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
            candidate: event.candidate,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        handleEndCall();
      }
    };

    return pc;
  }

  // 1. OUTGOING CALL
  async function startCall() {
    try {
      setCallStatusMsg("Connecting encrypted voice channel...");
      setCallState("calling");

      const pc = await createPeerConnection();
      const offer = await pc.createOffer();
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
      setCallStatusMsg("Microphone permission required for secure call.");
      setTimeout(() => setCallState("idle"), 3000);
    }
  }

  // 2. ACCEPT INCOMING CALL
  async function acceptCall() {
    try {
      setCallStatusMsg("Connecting audio stream...");
      const pc = await createPeerConnection();

      const pendingOffer = (window as unknown as { pendingOffer?: RTCSessionDescriptionInit }).pendingOffer;
      if (pendingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
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
        startCallRecording();
      }
    } catch (err) {
      console.error("Accept call error:", err);
      handleEndCall();
    }
  }

  // 3. DECLINE INCOMING CALL
  function declineCall() {
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
      audioChunksRef.current = [];
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      if (localStreamRef.current) {
        const localSource = audioCtx.createMediaStreamSource(localStreamRef.current);
        localSource.connect(dest);
      }

      if (remoteStreamRef.current) {
        const remoteSource = audioCtx.createMediaStreamSource(remoteStreamRef.current);
        remoteSource.connect(dest);
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        await saveCallRecording(audioChunksRef.current, duration);
      };

      recorder.start(1000);
    } catch (recErr) {
      console.warn("Call recording initialization failed:", recErr);
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
    stopCallTimer();

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
          <span>📞 Call {isBuyer ? "Seller" : "Buyer"} (Secure In-App)</span>
        </button>
      )}

      {/* Outgoing Calling Modal */}
      {callState === "calling" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#061922] p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
              <PhoneCall className="h-8 w-8 text-sky-400 animate-bounce" />
            </div>

            <h3 className="mt-4 text-lg font-black text-white">Calling {counterpartyName}...</h3>
            <p className="mt-1 text-xs text-sky-300/80">{callStatusMsg || "Deal Room Encrypted Audio"}</p>

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

            <h3 className="mt-2 text-xl font-black text-white">{counterpartyName}</h3>
            <p className="mt-1 text-xs text-white/60">Deal Code: #{dealCode}</p>

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
                <Volume2 className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{counterpartyName}</h4>
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400">
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
