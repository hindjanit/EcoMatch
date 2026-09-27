import Link from 'next/link';
import DeliveryEstimatePreview from '@/components/DeliveryEstimatePreview';

export const metadata = { title: 'Delivery estimate & checkout preview | EcoMatch' };
export default function DeliveryEstimatePage() {
  return <main className="min-h-screen bg-[#07090E] px-4 py-8 sm:py-12"><div className="mx-auto max-w-6xl"><nav className="mb-8 flex items-center justify-between gap-4 text-white"><Link href="/" className="text-xl font-bold text-lime-300">EcoMatch</Link><Link href="/marketplace" className="min-h-12 rounded-xl border border-white/20 px-4 py-3 text-sm">Back to marketplace</Link></nav><DeliveryEstimatePreview/></div></main>;
}
