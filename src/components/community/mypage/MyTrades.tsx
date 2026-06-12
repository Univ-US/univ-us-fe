'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, formatPrice, SectionTitle } from './shared';
import type { MyTrade } from '@/types/mypage';

const SAMPLE_TRADES: MyTrade[] = [
  {
    tradeId: 1,
    productName: '자료구조 전공서적 (거의 새것)',
    price: 12000,
    status: '판매중',
    role: '판매',
    createdAt: '3분 전',
  },
  {
    tradeId: 2,
    productName: '맥북 거치대 알루미늄',
    price: 20000,
    status: '예약중',
    role: '판매',
    createdAt: '어제',
  },
  {
    tradeId: 3,
    productName: '전공 원서 3권 일괄',
    price: 25000,
    status: '거래완료',
    role: '구매',
    createdAt: '2주 전',
  },
];

const S = {
  tabContainer: 'mb-4 flex gap-2',
  tabBtn: 'rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors',
  tabActive: 'bg-slate-800 text-white',
  tabInactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'flex items-center justify-between px-[18px] py-4 transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  itemLeft: 'flex flex-col gap-1.5',
  itemTopRow: 'flex items-center gap-2',
  productName: 'text-[14px] font-semibold text-slate-800',
  itemBottomRow: 'flex items-center gap-2 text-[13px]',
  price: 'font-bold text-slate-900',
  divider: 'text-slate-300',
  date: 'text-slate-500',
  roleBadge: 'rounded-lg px-2.5 py-1 text-[12px] font-bold',
  roleSell: 'bg-blue-50 text-blue-600',
  roleBuy: 'bg-rose-50 text-rose-600',
  emptyState: 'flex flex-col items-center justify-center bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
};

export default function MyTrades() {
  const [tab, setTab] = useState<'전체' | '판매' | '구매'>('전체');
  const filtered = SAMPLE_TRADES.filter((t) =>
    tab === '전체' ? true : t.role === tab,
  );

  return (
    <>
      <SectionTitle sub='내가 등록·구매한 상품과 거래 상태를 관리해요'>
        거래 내역
      </SectionTitle>
      <div className={S.tabContainer}>
        {['전체', '판매', '구매'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as '전체' | '판매' | '구매')}
            className={cn(S.tabBtn, tab === t ? S.tabActive : S.tabInactive)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={S.listContainer}>
        {filtered.map((trade, i) => (
          <div
            key={trade.tradeId}
            className={cn(S.listItem, i < filtered.length - 1 && S.listBorder)}
          >
            <div className={S.itemLeft}>
              <div className={S.itemTopRow}>
                <StatusBadge status={trade.status} />
                <span className={S.productName}>
                  {trade.productName}
                </span>
              </div>
              <div className={S.itemBottomRow}>
                <span className={S.price}>{formatPrice(trade.price)}</span>
                <span className={S.divider}>|</span>
                <span className={S.date}>{trade.createdAt}</span>
              </div>
            </div>
            <span
              className={cn(S.roleBadge, trade.role === '판매' ? S.roleSell : S.roleBuy)}
            >
              {trade.role}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={S.emptyState}>
            <Receipt className={S.emptyIcon} />
            <p className={S.emptyText}>거래 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
