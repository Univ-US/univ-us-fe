'use client';

import { useEffect, useState, useCallback } from 'react';
import CommunityMarketList from '@/components/common/CommunityMarketList';
import { getProductList } from '@/lib/marketApi';
import type { Product } from '@/types/community';

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductList({ page: 0, size: 50 });
      setProducts(data.list ?? []);
    } catch (err) {
      console.error('MarketPage fetch error:', err);
      setError('상품 목록을 불러오는 데 실패했어. 백엔드가 켜져 있는지 확인해줘.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-[14px]">
        상품 불러오는 중...
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400 text-[14px]">
        {error}
      </div>
    );

  return (
    <CommunityMarketList
      products={products}
      onSelectProduct={() => {}} // 카드 클릭은 router.push로 처리
      onRefresh={fetchProducts}
    />
  );
}
