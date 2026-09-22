"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  ShieldCheck,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flag,
  Loader2,
  X,
  Disc3,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

export interface CallInitiateParams {
  targetUserId: string;
  targetUserName: string;
  productId?: number | string | null;
  productTitle?: string | null;
  dealId?: string | null;
  dealCode?: string | null;
}

interface CallingContextType {
  initiateCall: (params: CallInitiateParams) => Promise<void>;
  activeCallState: "idle" | "calling" | "incoming" | "connected";
  activeCounterpartyName: string;
  activeProductTitle: string;
}

const CallingContext = createContext<CallingContextType>({
  initiateCall: async () => {},
  activeCallState: "idle",
  activeCounterpartyName: "",
  activeProductTitle: "",
});

export const useCalling = () => useContext(CallingContext);

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

export default function GlobalCallingProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const [counterpartyId, setCounterpartyId] = useState<string>("");
  const [counterpartyName, setCounterpartyName] = useState<string>("");
  const [productTitle, setProductTitle] = useState<string>("");
  const [dealCode, setDealCode] = useState<string>("");
  const [dealId, setDealId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Trying to move transaction outside EcoMatch");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [demoNotice, setDemoNotice] = useState("");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingStartedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noAnswerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesized Web Audio Ringtone
  const ringtoneCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Auth
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        setUserName(profile?.full_name || "EcoMatch Member");
      }
    }
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Subscribe to user personal signaling channel
  useEffect(() => {
    if (!userId) return;

    const channelName = `user-signaling-${userId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "CALL_OFFER" }, async ({ payload }) => {
        if (callState !== "idle") {
          // If already in call, send busy signal
          channel.send({
            type: "broadcast",
            event: "CALL_BUSY",
            payload: { targetId: payload.callerId, callId: payload.callId },
          });
          return;
        }

        setActiveCallId(payload.callId || null);
        setCounterpartyId(payload.callerId);
        setCounterpartyName(payload.callerName || "EcoMatch Member");
        setProductTitle(payload.productTitle || "");
        setDealCode(payload.dealCode || "");
        setDealId(payload.dealId || "");
        setProductId(payload.productId || "");

        pendingOfferRef.current = payload.offer;
        setCallState("incoming");
        startIncomingRingtone();
      })
      .on("broadcast", { event: "CALL_ANSWER" }, async ({ payload }) => {
        if (peerConnectionRef.current) {
          try {
            stopRingtone();
            clearTimeout(noAnswerTimerRef.current as NodeJS.Timeout);
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.answer)
            );
            await flushIceCandidates();
            setCallState("connected");
            startTimer();
            startGlobalCallRecording();
          } catch (e) {
            console.error("Set answer error:", e);
          }
        }
      })
      .on("broadcast", { event: "ICE_CANDIDATE" }, async ({ payload }) => {
        if (payload.candidate) {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.warn("ICE candidate error:", err);
            }
          } else {
            iceQueueRef.current.push(payload.candidate);
          }
        }
      })
      .on("broadcast", { event: "CALL_END" }, () => {
        handleRemoteHangup();
      })
      .on("broadcast", { event: "CALL_DECLINE" }, () => {
        stopRingtone();
        setDemoNotice("Call was declined by recipient.");
        setTimeout(() => cleanupCall(), 1500);
      })
      .on("broadcast", { event: "CALL_BUSY" }, () => {
        stopRingtone();
        setDemoNotice("Recipient is currently busy in another call.");
        setTimeout(() => cleanupCall(), 2000);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, callState, supabase]);

  // Audio synthesis: Outgoing Ringback (440Hz + 480Hz)
  function startOutgoingRingback() {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ringtoneCtxRef.current = ctx;

      const playPulse = () => {
        if (ctx.state === "suspended") ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        osc1.type = "sine";
        osc2.type = "sine";

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 2.0);
        osc2.stop(ctx.currentTime + 2.0);
      };

      playPulse();
      ringtoneIntervalRef.current = setInterval(playPulse, 4000);
    } catch (e) {
      console.warn("Ringback audio error:", e);
    }
  }

  // Audio synthesis: Incoming Melodic Chime (D5 -> G5 -> A5 -> C6)
  function startIncomingRingtone() {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ringtoneCtxRef.current = ctx;

      const playMelody = () => {
        if (ctx.state === "suspended") ctx.resume();
        const notes = [587.33, 783.99, 880.0, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + idx * 0.22;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
      };

      playMelody();
      ringtoneIntervalRef.current = setInterval(playMelody, 2500);

      // Browser vibration if supported
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([250, 150, 250, 150, 400]);
      }
    } catch (e) {
      console.warn("Incoming ringtone error:", e);
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

  // Web Audio Stream Mixer & Call Recorder for Marketplace & Direct Calls
  function startGlobalCallRecording() {
    try {
      if (recordingStartedRef.current) return;
      recordingStartedRef.current = true;
      audioChunksRef.current = [];

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!recordingAudioCtxRef.current || recordingAudioCtxRef.current.state === "closed") {
        recordingAudioCtxRef.current = new AudioCtx();
      }
      const ctx = recordingAudioCtxRef.current;
      const dest = ctx.createMediaStreamDestination();

      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        try {
          const localSrc = ctx.createMediaStreamSource(localStreamRef.current);
          localSrc.connect(dest);
        } catch (e) {}
      }

      if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
        try {
          const remoteSrc = ctx.createMediaStreamSource(remoteStreamRef.current);
          remoteSrc.connect(dest);
        } catch (e) {}
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
        await saveGlobalCallRecording(audioChunksRef.current, duration);
      };

      recorder.start(1000);
    } catch (err) {
      console.warn("Global call recording start error:", err);
    }
  }

  async function saveGlobalCallRecording(chunks: Blob[], callDuration: number) {
    if (chunks.length === 0 || callDuration < 1) return;
    try {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const fileName = `direct_calls/${Date.now()}_call_${userId.slice(0, 6)}.webm`;

      // 1. Upload audio recording to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("deal_recordings")
        .upload(fileName, audioBlob, { contentType: "audio/webm", upsert: true });

      let recordingUrl: string | null = null;
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from("deal_recordings").getPublicUrl(fileName);
        recordingUrl = urlData.publicUrl;
      }

      // 2. Transcribe & run AI anti-diversion detection via /api/calls/analyze
      let analysisData: any = null;
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const b64 = (reader.result as string)?.split(",")?.[1] || "";
            resolve(b64);
          };
          reader.readAsDataURL(audioBlob);
        });

        const audioBase64 = await base64Promise;
        const res = await fetch("/api/calls/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64,
            audioMimeType: "audio/webm",
            callerRole: "buyer",
            receiverRole: "seller",
          }),
        });
        const json = await res.json();
        if (json.success && json.analysis) {
          analysisData = json.analysis;
        }
      } catch (analyzeErr) {
        console.warn("Call analysis API error:", analyzeErr);
      }

      // 3. Save to deal_call_logs table so Admin immediately sees the recording & AI classification
      await supabase.from("deal_call_logs").insert({
        deal_id: dealId || null,
        caller_id: userId,
        receiver_id: counterpartyId,
        duration_seconds: callDuration,
        recording_url: recordingUrl,
        status: "completed",
        transcript: analysisData?.transcript || "Direct marketplace call session completed.",
        is_diverted: Boolean(analysisData?.is_diverted),
        diverted_party: analysisData?.diverted_party || null,
        diversion_reason: analysisData?.diversion_reason || null,
        diversion_snippet: analysisData?.diversion_snippet || null,
        risk_score: analysisData?.risk_score || 0,
        risk_level: analysisData?.risk_level || "LOW",
      });

      // 4. Also update calls table
      if (activeCallId) {
        try {
          await supabase.from("calls").update({
            recording_url: recordingUrl,
            transcript: analysisData?.transcript || "Direct call completed.",
            is_diverted: Boolean(analysisData?.is_diverted),
            diverted_party: analysisData?.diverted_party || null,
            diversion_reason: analysisData?.diversion_reason || null,
            diversion_snippet: analysisData?.diversion_snippet || null,
            risk_score: analysisData?.risk_score || 0,
            risk_level: analysisData?.risk_level || "LOW",
          }).eq("id", activeCallId);
        } catch {}
      }

      // 5. If diversion detected, create urgent admin alert in communication_risk_events
      if (analysisData?.is_diverted) {
        try {
          await supabase.from("communication_risk_events").insert({
            actor_id: counterpartyId,
            call_id: activeCallId || null,
            deal_id: dealId || null,
            risk_type: "OFF_PLATFORM_DIVERSION",
            risk_score: analysisData.risk_score || 95,
            confidence: "HIGH",
            snippet_excerpt: analysisData.diversion_snippet || "Off-platform diversion attempt detected in direct call.",
            review_status: "PENDING",
          });
        } catch {}
      }
    } catch (saveErr) {
      console.warn("Save global call recording error:", saveErr);
    }
  }

  function startTimer() {
    setDuration(0);
    durationTimerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }

  async function flushIceCandidates() {
    if (!peerConnectionRef.current) return;
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift();
      if (candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Flush candidate error:", e);
        }
      }
    }
  }

  function cleanupCall() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    recordingStartedRef.current = false;
    if (recordingAudioCtxRef.current) {
      recordingAudioCtxRef.current.close().catch(() => {});
      recordingAudioCtxRef.current = null;
    }
    stopRingtone();
    clearTimeout(noAnswerTimerRef.current as NodeJS.Timeout);
    clearInterval(durationTimerRef.current as NodeJS.Timeout);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setCallState("idle");
    setActiveCallId(null);
    setCounterpartyId("");
    setCounterpartyName("");
    setProductTitle("");
    setDealCode("");
    setDealId("");
    setProductId("");
    setDuration(0);
    setIsMuted(false);
    setHasRemoteAudio(false);
    pendingOfferRef.current = null;
    iceQueueRef.current = [];
  }

  function handleRemoteHangup() {
    cleanupCall();
    setDemoNotice("Call ended by counterparty.");
    setTimeout(() => setDemoNotice(""), 3000);
  }

  // OUTGOING CALL INITIATOR
  async function initiateCall(params: CallInitiateParams) {
    if (!userId) {
      alert("Please login to place secure in-app calls.");
      return;
    }
    if (userId === params.targetUserId) {
      alert("You cannot call yourself.");
      return;
    }

    setCounterpartyId(params.targetUserId);
    setCounterpartyName(params.targetUserName);
    setProductTitle(params.productTitle || "");
    setDealCode(params.dealCode || "");
    setDealId(params.dealId || "");
    setProductId(String(params.productId || ""));
    setCallState("calling");
    startOutgoingRingback();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
    } catch (err) {
      stopRingtone();
      setCallState("idle");
      alert("Microphone permission is required to place calls.");
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (event) => {
      const [remote] = event.streams;
      remoteStreamRef.current = remote;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remote;
        remoteAudioRef.current.play().catch(() => {});
        setHasRemoteAudio(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const targetChannel = supabase.channel(`user-signaling-${params.targetUserId}`);
        targetChannel.send({
          type: "broadcast",
          event: "ICE_CANDIDATE",
          payload: { candidate: event.candidate },
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Save call to database
    let createdCallId: string | null = null;
    try {
      const { data } = await supabase.rpc("initiate_call", {
        p_receiver_id: params.targetUserId,
        p_product_id: params.productId ? Number(params.productId) : null,
        p_deal_id: params.dealId || null,
      });
      if (data?.call_id) {
        createdCallId = data.call_id;
        setActiveCallId(data.call_id);
      }
    } catch (e) {
      console.warn("DB initiate_call fallback:", e);
    }

    // Broadcast offer to recipient channel
    const targetChannel = supabase.channel(`user-signaling-${params.targetUserId}`);
    targetChannel.send({
      type: "broadcast",
      event: "CALL_OFFER",
      payload: {
        callId: createdCallId,
        callerId: userId,
        callerName: userName,
        productId: params.productId,
        productTitle: params.productTitle,
        dealId: params.dealId,
        dealCode: params.dealCode,
        offer,
      },
    });

    // 35-sec Timeout for Missed Call
    noAnswerTimerRef.current = setTimeout(async () => {
      stopRingtone();
      if (createdCallId) {
        try {
          await supabase.rpc("update_call_status", {
            p_call_id: createdCallId,
            p_status: "MISSED",
            p_duration_seconds: 0,
            p_end_reason: "NO_ANSWER_TIMEOUT",
          });
        } catch {}
      }
      setDemoNotice("No answer. Receiver marked as missed call.");
      cleanupCall();
    }, 35000);
  }

  // ACCEPT INCOMING CALL
  async function acceptIncomingCall() {
    stopRingtone();
    if (!pendingOfferRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
    } catch (err) {
      alert("Microphone access is required to answer this call.");
      declineIncomingCall();
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (event) => {
      const [remote] = event.streams;
      remoteStreamRef.current = remote;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remote;
        remoteAudioRef.current.play().catch(() => {});
        setHasRemoteAudio(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && counterpartyId) {
        const callerChannel = supabase.channel(`user-signaling-${counterpartyId}`);
        callerChannel.send({
          type: "broadcast",
          event: "ICE_CANDIDATE",
          payload: { candidate: event.candidate },
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
    await flushIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Broadcast answer to caller
    const callerChannel = supabase.channel(`user-signaling-${counterpartyId}`);
    callerChannel.send({
      type: "broadcast",
      event: "CALL_ANSWER",
      payload: { answer },
    });

    if (activeCallId) {
      try {
        await supabase.rpc("update_call_status", {
          p_call_id: activeCallId,
          p_status: "ACCEPTED",
        });
      } catch {}
    }

    setCallState("connected");
    startTimer();
    startGlobalCallRecording();
  }

  // DECLINE INCOMING CALL
  function declineIncomingCall() {
    stopRingtone();
    if (counterpartyId) {
      const callerChannel = supabase.channel(`user-signaling-${counterpartyId}`);
      callerChannel.send({
        type: "broadcast",
        event: "CALL_DECLINE",
        payload: { targetId: counterpartyId },
      });
    }

    if (activeCallId) {
      supabase.rpc("update_call_status", {
        p_call_id: activeCallId,
        p_status: "DECLINED",
        p_end_reason: "USER_DECLINED",
      });
    }

    cleanupCall();
  }

  // END ACTIVE CALL
  async function endCall() {
    if (counterpartyId) {
      const peerChannel = supabase.channel(`user-signaling-${counterpartyId}`);
      peerChannel.send({
        type: "broadcast",
        event: "CALL_END",
        payload: { targetId: counterpartyId },
      });
    }

    if (activeCallId) {
      try {
        await supabase.rpc("update_call_status", {
          p_call_id: activeCallId,
          p_status: "ENDED",
          p_duration_seconds: duration,
          p_end_reason: "NORMAL_HANGUP",
        });
      } catch {}

      // Also ensure record exists in deal_call_logs so admin immediately sees it
      try {
        await supabase.from("deal_call_logs").insert({
          deal_id: dealId || null,
          caller_id: userId,
          receiver_id: counterpartyId,
          duration_seconds: duration,
          status: "completed",
        });
      } catch (insertLogErr) {
        console.warn("Global call log insert:", insertLogErr);
      }
    }

    cleanupCall();
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }

  function toggleSpeaker() {
    if (!remoteAudioRef.current) return;
    setIsSpeakerOn(!isSpeakerOn);
    remoteAudioRef.current.muted = isSpeakerOn;
  }

  // SIMULATE DEMO SAFETY EVENT
  async function triggerDemoSafetyEvent() {
    setDemoNotice("Simulating test phrase: 'Let's move this transaction outside EcoMatch'...");
    try {
      await supabase.from("communication_risk_events").insert({
        actor_id: userId,
        call_id: activeCallId || null,
        deal_id: dealId || null,
        risk_type: "OFF_PLATFORM_DIVERSION",
        risk_score: 94,
        confidence: "HIGH",
        snippet_excerpt: "Let's move this transaction outside EcoMatch to WhatsApp.",
        review_status: "PENDING",
        is_demo: true,
      });
      setDemoNotice("✓ [DEMO ALERT] Flagged to Admin as High-Risk Off-Platform Diversion!");
      setTimeout(() => setDemoNotice(""), 4000);
    } catch (e) {
      setDemoNotice("Demo safety event recorded locally.");
      setTimeout(() => setDemoNotice(""), 3000);
    }
  }

  // SUBMIT USER REPORT
  async function submitReport() {
    if (!userId || !counterpartyId) return;
    setReportSubmitting(true);
    try {
      await supabase.from("communication_reports").insert({
        reporter_id: userId,
        reported_user_id: counterpartyId,
        call_id: activeCallId || null,
        deal_id: dealId || null,
        reason: reportReason,
        description: reportDescription,
        status: "PENDING",
      });
      alert("Thank you. This incident has been escalated to EcoMatch safety moderators.");
      setShowReportModal(false);
      setReportDescription("");
    } catch (e) {
      alert("Report submitted.");
      setShowReportModal(false);
    } finally {
      setReportSubmitting(false);
    }
  }

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <CallingContext.Provider
      value={{
        initiateCall,
        activeCallState: callState,
        activeCounterpartyName: counterpartyName,
        activeProductTitle: productTitle,
      }}
    >
      {children}

      {/* Hidden audio element for WebRTC audio track */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* DEMO NOTICE TOAST */}
      {demoNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-amber-400/40 bg-[#061d15]/95 px-5 py-3 text-xs font-black text-amber-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span>{demoNotice}</span>
        </div>
      )}

      {/* 1. OUTGOING CALLING MODAL */}
      {callState === "calling" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-sky-500/30 bg-[#061922] p-6 text-center shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
              <PhoneCall className="h-8 w-8 text-sky-400 animate-bounce" />
            </div>

            <h3 className="mt-4 text-lg font-black text-white">Calling {counterpartyName}...</h3>
            {productTitle && (
              <span className="mt-1.5 inline-block rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-0.5 text-xs font-semibold text-sky-300">
                Regarding: {productTitle}
              </span>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-sky-300 font-mono">
              <Volume2 className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
              <span>Ringing • Realtime WebRTC</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 py-1 px-3 text-[10px] font-bold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Real phone number masked</span>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={endCall}
                className="flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-xs font-black text-white hover:bg-red-600 transition active:scale-95 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="h-4 w-4" /> Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INCOMING CALL MODAL */}
      {callState === "incoming" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-500/40 bg-[#051c14] p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-in zoom-in-95">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/20 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <PhoneIncoming className="h-9 w-9 text-emerald-400" />
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              INCOMING ECOMATCH CALL
            </span>

            <h3 className="mt-2 text-xl font-black text-white">{counterpartyName}</h3>
            {productTitle && (
              <p className="mt-1 text-xs text-white/80 font-semibold">
                Calling about: <span className="text-emerald-300 font-bold">{productTitle}</span>
              </p>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-mono">
              <Volume2 className="h-3.5 w-3.5 animate-bounce" />
              <span>Ringing • Encrypted In-App Audio</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={declineIncomingCall}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/15 py-3 text-xs font-bold text-red-300 hover:bg-red-500/25 transition active:scale-95"
              >
                <PhoneOff className="h-4 w-4" /> Decline
              </button>

              <button
                type="button"
                onClick={acceptIncomingCall}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3 text-xs font-black text-[#03140e] hover:bg-emerald-300 transition active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                <Phone className="h-4 w-4 fill-current" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONNECTED CALL ACTIVE DRAWER (PERSISTENT ACROSS ALL PAGES) */}
      {callState === "connected" && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-3xl border border-emerald-400/50 bg-[#061f17]/95 p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Volume2 className={`h-5 w-5 ${hasRemoteAudio ? "animate-bounce" : "animate-pulse"}`} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{counterpartyName}</h4>
                {productTitle && (
                  <p className="text-[10px] text-emerald-300/80 truncate max-w-[170px]">
                    Re: {productTitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 mt-0.5 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{formatTimer(duration)}</span>
                </div>
              </div>
            </div>

            {/* Recording / Safety Indicator */}
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> SECURE
            </div>
          </div>

          {/* Call Controls */}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                  isMuted
                    ? "border-red-500/40 bg-red-500/20 text-red-300"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                onClick={toggleSpeaker}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                  !isSpeakerOn
                    ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-amber-400 transition"
                title="Report User"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={endCall}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white hover:bg-red-600 transition shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="h-3.5 w-3.5" /> End Call
            </button>
          </div>

          {/* DEMO SAFETY TRIGGER BUTTON */}
          <div className="mt-3 border-t border-white/5 pt-2">
            <button
              onClick={triggerDemoSafetyEvent}
              className="w-full flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>[DEMO] Test phrase: "Move transaction outside"</span>
            </button>
          </div>
        </div>
      )}

      {/* REPORT USER MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#061710] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2 text-red-300">
                <Flag className="h-4 w-4" /> Report Communication Incident
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-white/60">
              Escalate suspicious or unsafe activity to EcoMatch safety administrators.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-white/80">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#020e08] p-2.5 text-white"
                >
                  <option>Trying to move transaction outside EcoMatch</option>
                  <option>Suspicious payment request</option>
                  <option>Fraud / scam</option>
                  <option>Harassment or abusive language</option>
                  <option>Unsafe handover meeting behavior</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-white/80">Additional Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide context for our moderation team..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#020e08] p-2.5 text-white placeholder:text-white/30"
                />
              </div>

              <div className="mt-4 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={reportSubmitting}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CallingContext.Provider>
  );
}
