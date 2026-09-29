"use client";
import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {EcoMatchWebRTCCallProvider} from '@/lib/trust/call-provider';
import {trustFetch,trustPost} from '@/lib/trust/client';
import {RECORDING_NOTICE} from '@/lib/trust/domain';
import {Phone,PhoneOff,Mic,MicOff,ShieldCheck} from 'lucide-react';
export interface CallInitiateParams {targetUserId:string;targetUserName:string;productId?:number|string|null;productTitle?:string|null;dealId?:string|null;dealCode?:string|null;}
type State='idle'|'calling'|'incoming'|'connected';
const CallingContext=createContext<{initiateCall:(params:CallInitiateParams)=>Promise<void>;activeCallState:State;activeCounterpartyName:string;activeProductTitle:string}>({initiateCall:async()=>{},activeCallState:'idle',activeCounterpartyName:'',activeProductTitle:''});
export const useCalling=()=>useContext(CallingContext);
type Session={id:string;peer:string;name:string;title:string;state:State;offer?:RTCSessionDescriptionInit};
type Signal={callId:string;senderId:string;offer?:RTCSessionDescriptionInit;answer?:RTCSessionDescriptionInit;candidate?:RTCIceCandidateInit};
export default function GlobalCallingProvider({children}:{children:React.ReactNode}){
 const db=useMemo(()=>createClient(),[]),provider=useMemo(()=>new EcoMatchWebRTCCallProvider(),[]);
 const [userId,setUserId]=useState(''),[session,setSession]=useState<Session|null>(null),[notice,setNotice]=useState(''),[muted,setMuted]=useState(false),[recording,setRecording]=useState(false),[duration,setDuration]=useState(0);
 const current=useRef<Session|null>(null),userRef=useRef(''),pc=useRef<RTCPeerConnection|null>(null),stream=useRef<MediaStream|null>(null),audio=useRef<HTMLAudioElement|null>(null),recorder=useRef<MediaRecorder|null>(null),ice=useRef<RTCIceCandidateInit[]>([]),started=useRef(0),recordingCall=useRef(''),ringTimer=useRef<number|undefined>(undefined),ringContext=useRef<AudioContext|null>(null);
 function update(s:Session|null){current.current=s;setSession(s);}
 function stopRinging(){if(ringTimer.current!==undefined){window.clearInterval(ringTimer.current);ringTimer.current=undefined;}void ringContext.current?.close();ringContext.current=null;navigator.vibrate?.(0);}
 function startRinging(){if(ringTimer.current!==undefined)return;try{const AudioContextCtor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!AudioContextCtor)return;const context=new AudioContextCtor();ringContext.current=context;const ring=()=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.setValueAtTime(880,context.currentTime);gain.gain.setValueAtTime(.06,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.42);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.42);};ring();ringTimer.current=window.setInterval(ring,1500);navigator.vibrate?.([180,110,180]);}catch{/* A browser may require a previous user interaction before playing a ringtone. */}}
 function cleanup(){stopRinging();if(recorder.current?.state==='recording'){recorder.current.stop();}recorder.current=null;recordingCall.current='';stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;pc.current?.close();pc.current=null;ice.current=[];setRecording(false);setMuted(false);setDuration(0);update(null);}
 async function send(peer:string,event:string,payload:Signal){const channel=db.channel(`user-signaling-${peer}`,{config:{private:true}});await new Promise<void>((resolve,reject)=>{channel.subscribe(status=>{if(status==='SUBSCRIBED')resolve();if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))reject(new Error('Secure signaling unavailable'));});});try{await channel.send({type:'broadcast',event,payload});}finally{await db.removeChannel(channel);}}
 async function startRecording(s:Session){
  if(recordingCall.current===s.id||!stream.current)return;
  const verified=await provider.getCallStatus(s.id);if(!verified.recordingAllowed)throw new Error('Recording consent is incomplete');
  if(!MediaRecorder.isTypeSupported('audio/webm')){setNotice('Audio connected. This browser cannot record the supported format.');return;}
  recordingCall.current=s.id;
  // Each participant captures only their microphone; no misleading automatic speaker attribution.
  const chunks:Blob[]=[];let bytes=0;const rec=new MediaRecorder(stream.current,{mimeType:'audio/webm',audioBitsPerSecond:32000});recorder.current=rec;
  rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>14000000&&rec.state==='recording'){rec.stop();setNotice('Recording limit reached. End this call and start a new one to continue recording.');}}};
  rec.onstop=async()=>{setRecording(false);if(!chunks.length)return;try{const upload=await provider.startRecording(s.id);const {error}=await db.storage.from('call-recordings-private').uploadToSignedUrl(upload.path,upload.token,new Blob(chunks,{type:'audio/webm'}),{contentType:'audio/webm'});if(error)throw error;const result=await trustPost('/api/trust/calls/recording',{action:'analyse',callId:s.id});setNotice(result.status==='COMPLETE'?'Private call recording saved and analysed.':'Recording saved privately; analysis needs retry in Call History.');}catch(e){setNotice(`Recording could not be saved: ${e instanceof Error?e.message:'Please retry'}`);}};
  rec.start(1000);setRecording(true);
 }
 async function connection(s:Session){
  const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});stream.current=media;
  const turnUrls=(process.env.NEXT_PUBLIC_TURN_URLS||'').split(',').map(url=>url.trim()).filter(Boolean);const iceServers:RTCIceServer[]=[{urls:'stun:stun.l.google.com:19302'},...(turnUrls.length?[{urls:turnUrls,username:process.env.NEXT_PUBLIC_TURN_USERNAME||'',credential:process.env.NEXT_PUBLIC_TURN_CREDENTIAL||''}]:[])];
  const peer=new RTCPeerConnection({iceServers});pc.current=peer;
  media.getTracks().forEach(t=>peer.addTrack(t,media));peer.ontrack=e=>{if(audio.current){audio.current.srcObject=e.streams[0];audio.current.play().catch(()=>setNotice('Tap the audio player to hear this call.'));}};
  peer.onicecandidate=e=>{if(e.candidate)void send(s.peer,'ICE_CANDIDATE',{callId:s.id,senderId:userRef.current,candidate:e.candidate.toJSON()}).catch(e=>setNotice(e.message));};
  peer.onconnectionstatechange=()=>{if(peer.connectionState==='failed')setNotice('Connection failed. Your network may require a configured TURN relay. Please end and retry.');};return peer;
 }
 async function flush(){if(!pc.current?.remoteDescription)return;for(const c of ice.current.splice(0))await pc.current.addIceCandidate(c);}
 async function applyAnswer(s:Session,answer:RTCSessionDescriptionInit){if(s.state!=='calling'||!pc.current||pc.current.currentRemoteDescription)return;await pc.current.setRemoteDescription(answer);await flush();started.current=Date.now();update({...s,state:'connected'});await startRecording(s);}
 async function initiateCall(p:CallInitiateParams){
  if(current.current){setNotice('End your current call first.');return;}if(!userRef.current){setNotice('Please sign in to call.');return;}
  if(!window.confirm(`${RECORDING_NOTICE}\n\nI consent to recording and safety analysis of this call.`))return;
  try{const {callId}=await provider.startCall({...p});const s:Session={id:callId,peer:p.targetUserId,name:p.targetUserName,title:p.productTitle||'',state:'calling'};update(s);const peer=await connection(s);const offer=await peer.createOffer();await peer.setLocalDescription(offer);await trustPost('/api/trust/calls',{action:'save_offer',callId,offer});await send(s.peer,'CALL_OFFER',{callId,senderId:userRef.current,offer});}catch(e){const failed=current.current as Session|null;if(failed)await provider.endCall(failed.id).catch(()=>{});cleanup();setNotice(e instanceof Error?e.message:'Call unavailable');}
 }
 async function accept(){const s=current.current;if(!s?.offer)return;if(!window.confirm(`${RECORDING_NOTICE}\n\nI consent to recording and safety analysis of this call.`))return;
  try{const peer=await connection(s);await provider.acceptCall(s.id);await peer.setRemoteDescription(s.offer);await flush();const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await trustPost('/api/trust/calls',{action:'save_answer',callId:s.id,answer});await send(s.peer,'CALL_ANSWER',{callId:s.id,senderId:userRef.current,answer});started.current=Date.now();update({...s,state:'connected'});await startRecording(s);}catch(e){setNotice(e instanceof Error?e.message:'Unable to accept');await provider.endCall(s.id).catch(()=>{});cleanup();}
 }
 async function end(reject=false){const s=current.current;if(!s)return;try{await send(s.peer,'CALL_END',{callId:s.id,senderId:userRef.current});await (reject?provider.rejectCall(s.id):provider.endCall(s.id));}catch(e){setNotice(e instanceof Error?e.message:'Could not update call');}finally{cleanup();}}
 useEffect(()=>{let alive=true;void db.auth.getUser().then(({data})=>{if(alive){userRef.current=data.user?.id||'';setUserId(userRef.current);}});const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{userRef.current=s?.user.id||'';setUserId(userRef.current);});return()=>{alive=false;subscription.unsubscribe();};},[db]);
 useEffect(()=>{
  if(!userId)return;
  const channel=db.channel(`user-signaling-${userId}`,{config:{private:true}});
  const handle=async(event:string,p:Signal)=>{try{
   if(event==='CALL_OFFER'){
    if(current.current)return;const verified=await provider.getCallStatus(p.callId);if(verified.call.caller_id!==p.senderId||verified.call.receiver_id!==userId||verified.call.status!=='RINGING')return;
    update({id:p.callId,peer:p.senderId,name:'EcoMatch member',title:'Safe in-app call',state:'incoming',offer:p.offer});startRinging();return;
   }
   const s=current.current;if(!s||p.callId!==s.id||p.senderId!==s.peer)return;
   if(event==='ICE_CANDIDATE'&&p.candidate){ice.current.push(p.candidate);await flush();}
   if(event==='CALL_ANSWER'&&p.answer&&s.state==='calling'){const v=await provider.getCallStatus(s.id);if(!v.recordingAllowed)return;await applyAnswer(s,p.answer);}
   if(event==='CALL_END'){await provider.endCall(s.id);cleanup();}
  }catch(e){setNotice(e instanceof Error?e.message:'Call signaling failed');}};
  for(const event of ['CALL_OFFER','CALL_ANSWER','ICE_CANDIDATE','CALL_END'])channel.on('broadcast',{event},({payload})=>{void handle(event,payload as Signal);});
  channel.subscribe();return()=>{void db.removeChannel(channel);};
  // Handler reads active call and media refs, not render-time session snapshots.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId,db,provider]);
 useEffect(()=>{if(!session)return;const timer=setInterval(()=>{if(current.current?.state==='connected')setDuration(Math.floor((Date.now()-started.current)/1000));},1000);const timeout=session.state==='calling'?setTimeout(()=>{void end();setNotice('No answer. Call ended.');},35000):undefined;return()=>{clearInterval(timer);clearTimeout(timeout);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[session?.id,session?.state]);
 useEffect(()=>{if(!userId)return;const checkCall=async()=>{try{const data=await trustFetch('/api/trust/calls') as {calls?:Array<{id:string;caller_id:string;receiver_id:string;status:string;offer?:RTCSessionDescriptionInit;answer?:RTCSessionDescriptionInit}>};const call=data.calls?.find(c=>c.receiver_id===userId&&c.status==='RINGING'&&c.offer);if(!current.current&&call){update({id:call.id,peer:call.caller_id,name:'EcoMatch member',title:'Safe in-app call',state:'incoming',offer:call.offer});startRinging();}const active=current.current;if(active?.state==='calling'){const answered=data.calls?.find(c=>c.id===active.id&&c.answer);if(answered?.answer)await applyAnswer(active,answered.answer);}}catch{/* Broadcast remains the primary low-latency path. */}};void checkCall();const timer=setInterval(()=>void checkCall(),350);return()=>clearInterval(timer);},[userId]);
 async function report(){const s=current.current;if(!s)return;const description=window.prompt('Describe the call safety concern.');if(!description)return;const {error}=await db.from('communication_reports').insert({reporter_id:userId,reported_user_id:s.peer,call_id:s.id,reason:'Call safety concern',description,status:'PENDING'});setNotice(error?error.message:'Report sent to the safety team.');}
 return <CallingContext.Provider value={{initiateCall,activeCallState:session?.state||'idle',activeCounterpartyName:session?.name||'',activeProductTitle:session?.title||''}}>{children}<audio ref={audio} autoPlay controls={!!session} className="fixed bottom-2 left-2 z-50 max-w-48"/>{notice&&<div role="status" className="fixed bottom-20 left-4 z-[90] max-w-md rounded-2xl bg-amber-50 p-4 text-sm text-slate-900 shadow-xl">{notice}<button className="ml-3 min-h-12 underline" onClick={()=>setNotice('')}>Dismiss</button></div>}{session&&<section className="fixed bottom-6 right-4 z-[80] w-[min(92vw,380px)] rounded-3xl border border-emerald-300/30 bg-[#062016] p-6 text-white shadow-2xl" aria-label="EcoMatch safe call"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck/>EcoMatch Safe Call</h2><p className="mt-3">{session.name} · {session.state}</p><p className="text-sm opacity-70">{session.title}</p><p className="my-3 text-xs">{RECORDING_NOTICE}</p><p className="text-sm text-lime-300">{recording?'● Recording your microphone':session.state==='connected'?'Audio connected':'Consent is required before recording'} · {duration}s</p><div className="mt-4 flex flex-wrap gap-2">{session.state==='incoming'&&<button className="min-h-12 rounded-xl bg-lime-300 px-4 text-black" onClick={()=>void accept()}><Phone className="inline h-4"/> Accept & consent</button>}{session.state==='connected'&&<button aria-label={muted?'Unmute':'Mute'} className="min-h-12 rounded-xl bg-white/10 px-4" onClick={()=>{stream.current?.getAudioTracks().forEach(t=>t.enabled=muted);setMuted(!muted);}}>{muted?<MicOff/>:<Mic/>}</button>}<button className="min-h-12 rounded-xl bg-red-700 px-4" onClick={()=>void end(session.state==='incoming')}><PhoneOff className="inline h-4"/> {session.state==='incoming'?'Decline':'End'}</button><button className="min-h-12 px-3 underline" onClick={()=>void report()}>Report</button></div></section>}</CallingContext.Provider>;
}
