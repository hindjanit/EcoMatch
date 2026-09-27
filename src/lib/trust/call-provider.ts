import { trustFetch,trustPost } from './client';
export interface CallProvider {
 startCall(data:Record<string,unknown>):Promise<{callId:string}>;
 acceptCall(callId:string):Promise<unknown>;rejectCall(callId:string):Promise<unknown>;endCall(callId:string):Promise<unknown>;
 startRecording(callId:string):Promise<{path:string;token:string}>;
 getRecording(callId:string,recordingId:string):Promise<{signedUrl:string}>;
 getCallStatus(callId:string):Promise<{call:Record<string,unknown>;recordingAllowed:boolean}>;
}
export class EcoMatchWebRTCCallProvider implements CallProvider {
 startCall(data:Record<string,unknown>){return trustPost('/api/trust/calls',{action:'start',consent:true,...data});}
 acceptCall(callId:string){return trustPost('/api/trust/calls',{action:'accept',callId,consent:true});}
 rejectCall(callId:string){return trustPost('/api/trust/calls',{action:'reject',callId});}
 endCall(callId:string){return trustPost('/api/trust/calls',{action:'end',callId});}
 startRecording(callId:string){return trustPost('/api/trust/calls/recording',{action:'upload',callId});}
 getRecording(callId:string,recordingId:string){return trustPost('/api/trust/media',{operation:'read',callId,recordingId});}
 getCallStatus(callId:string){return trustFetch(`/api/trust/calls?id=${callId}`);}
}
