'use client';

import { useEffect, useState } from 'react';
import { getProductDetail } from '@/lib/marketApi';
import CommunityMarketDetail from '@/components/common/CommunityMarketDetail';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types/community';

export default function MarketDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      const numericId = Number(id);
      if (!id || isNaN(numericId) || numericId <= 0) {
        setError('올바르지 않은 상품 ID입니다.');
        setLoading(false);
        return;
      }
      try {
        const data = await getProductDetail(numericId);
        setProduct(data);
      } catch (err) {
        console.error('MarketDetailClient fetch error:', err);
        setError('상품을 찾을 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-[14px]">
        상품 불러오는 중...
      </div>
    );

  if (error || !product)
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400 text-[14px]">
        {error ?? '상품을 찾을 수 없습니다.'}
      </div>
    );

  return (
    <CommunityMarketDetail
      product={product}
      onBack={() => router.push('/community/market')}
    />
  );
}
