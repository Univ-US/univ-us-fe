'use client';

import { Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StatusBadge, formatPrice, SectionTitle } from './shared';
import type { MyWishlist as MyWishlistType } from '@/types/mypage';
import { getMyWishlist } from '@/lib/cmypageApi';



const S = {
  grid: 'grid grid-cols-2 gap-4 lg:grid-cols-3',
  card: 'group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md',
  imagePlaceholder: 'aspect-square bg-slate-100',
  content: 'p-4',
  topRow: 'mb-2 flex items-center justify-between gap-2',
  bookmarkIcon: 'size-4 fill-slate-200 text-slate-200 transition-colors group-hover:fill-rose-400 group-hover:text-rose-400',
  productName: 'mb-1 truncate text-[14px] font-semibold text-slate-800',
  price: 'text-[15px] font-extrabold text-slate-900',
  place: 'mt-2 text-[12px] text-slate-400',
};

export default function MyWishlist() {
  const [wishlist, setWishlist] = useState<MyWishlistType[]>([]);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await getMyWishlist();
        setWishlist(data);
      } catch (err) {
        console.error('Failed to fetch wishlist', err);
      }
    };
    fetchWishlist();
  }, []);
  return (
    <>
      <SectionTitle sub='찜해둔 상품을 한눈에 확인하세요'>관심목록</SectionTitle>
      <div className={S.grid}>
        {wishlist.map((item) => (
          <div key={item.productId} className={S.card}>
            <div className={S.imagePlaceholder} />
            <div className={S.content}>
              <div className={S.topRow}>
                <StatusBadge status={item.status} />
                <Bookmark className={S.bookmarkIcon} />
              </div>
              <h3 className={S.productName}>
                {item.productName}
              </h3>
              <div className={S.price}>
                {formatPrice(item.price)}
              </div>
              <div className={S.place}>{item.place}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
