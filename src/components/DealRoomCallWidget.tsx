"use client";
import {Phone} from 'lucide-react';
import {useCalling} from './GlobalCallingProvider';
interface Props {dealId:string;dealCode:string;userId:string;counterpartyId:string;counterpartyName:string;isBuyer:boolean;productTitle?:string;disabled?:boolean;}
export default function DealRoomCallWidget(p:Props){const {initiateCall,activeCallState}=useCalling();return <button className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50" disabled={p.disabled||activeCallState!=='idle'} onClick={()=>void initiateCall({targetUserId:p.counterpartyId,targetUserName:p.counterpartyName,dealId:p.dealId,dealCode:p.dealCode,productTitle:p.productTitle})}><Phone className="h-4 w-4"/> Safe call</button>;}
