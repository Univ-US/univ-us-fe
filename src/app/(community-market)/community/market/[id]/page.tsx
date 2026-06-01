'use client';

import { useParams } from 'next/navigation';

export default function MarketDetailPage() {
  const params = useParams();

  return (
    <div className='mx-auto max-w-[1200px] px-6 py-8'>
      <h1 className='text-2xl font-bold'>상품 상세 - ID: {params.id}</h1>
    </div>
  );
}
