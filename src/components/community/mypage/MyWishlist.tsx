'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, formatPrice, SectionTitle } from './shared';
import type { MyWishlist as MyWishlistType } from '@/types/mypage';

const SAMPLE_WISHLIST: MyWishlistType[] = [
  {
    productId: 1,
    productName: '자료구조 전공서적 (거의 새것)',
    price: 12000,
    place: '중앙도서관 앞',
    status: '판매중',
  },
  {
    productId: 4,
    productName: '맥북 거치대 알루미늄',
    price: 20000,
    place: '학생회관',
    status: '판매중',
  },
  {
    productId: 5,
    productName: '아이패드 펜슬 2세대',
    price: 55000,
    place: '중앙도서관',
    status: '예약중',
  },
];

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
  const wishlist = SAMPLE_WISHLIST;
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
