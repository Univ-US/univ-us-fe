'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MessageCircle, Receipt } from 'lucide-react';
import CommunityMarketChatDrawer from '@/components/common/CommunityMarketChatDrawer';
import { getApiErrorMessage } from '@/lib/apiError';
import { getMyTrades } from '@/lib/cmypageApi';
import { getProductDetail } from '@/lib/marketApi';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/community';
import type { MyTrade } from '@/types/mypage';
import { StatusBadge, formatPrice, SectionTitle, formatDate } from './shared';

const PAGE_SIZE = 8;
const ROLE_BY_TAB = {
  전체: 'ALL',
  판매: 'SELLER',
  구매: 'BUYER',
} as const;

const S = {
  tabContainer: 'mb-4 flex gap-2',
  tabBtn: 'rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors',
  tabActive: 'bg-slate-800 text-white',
  tabInactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
  errorText: 'mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-600',
  listContainer: 'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
  listItem: 'flex items-center justify-between gap-4 px-[18px] py-4 transition-colors hover:bg-slate-50',
  listBorder: 'border-b border-border',
  itemLeft: 'min-w-0 flex flex-col gap-1.5',
  itemTopRow: 'flex items-center gap-2',
  productName: 'truncate text-[14px] font-semibold text-slate-800',
  itemBottomRow: 'flex items-center gap-2 text-[13px]',
  price: 'font-bold text-slate-900',
  divider: 'text-slate-300',
  date: 'text-slate-500',
  actionGroup: 'flex shrink-0 items-center gap-2',
  actionLink: 'flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[12px] font-bold text-slate-500 transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
  actionButton: 'flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none',
  roleBadge: 'rounded-lg px-2.5 py-1 text-[12px] font-bold',
  roleSell: 'bg-primary/5 text-primary',
  roleBuy: 'bg-rose-50 text-rose-600',
  emptyState: 'flex flex-col items-center justify-center bg-slate-50/50 py-16 text-center',
  emptyIcon: 'mb-3 size-10 text-slate-300',
  emptyText: 'text-[14px] font-medium text-slate-500',
  moreWrap: 'mt-4 flex justify-center',
  moreButton: 'rounded-xl border border-border bg-white px-5 py-2 text-[13px] font-bold text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0',
};

function getProductId(trade: MyTrade) {
  return trade.productId ?? trade.tradeId;
}

export default function MyTrades() {
  const [trades, setTrades] = useState<MyTrade[]>([]);
  const [tab, setTab] = useState<'전체' | '판매' | '구매'>('전체');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTargetProduct, setChatTargetProduct] = useState<Product | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<number | null>(null);
  const [chatLoadingProductId, setChatLoadingProductId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadTrades = useCallback(async (nextPage: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    setErrorMessage(null);
    try {
      const data = await getMyTrades(ROLE_BY_TAB[tab], nextPage, PAGE_SIZE);
      if (requestId !== requestIdRef.current) return;
      setTrades((current) => append ? [...current, ...data.content] : data.content);
      setPage(data.page);
      setTotalElements(data.totalElements);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setErrorMessage(getApiErrorMessage(err, '거래 내역을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [tab]);

  useEffect(() => {
    setTrades([]);
    setPage(0);
    setTotalElements(0);
    void loadTrades(0, false);
  }, [loadTrades]);

  const hasMore = trades.length < totalElements;

  const handleOpenChat = async (trade: MyTrade) => {
    setErrorMessage(null);

    if (trade.role === '판매') {
      setChatTargetProduct(null);
      setSelectedChatRoomId(null);
      setChatOpen(true);
      return;
    }

    const productId = getProductId(trade);
    setSelectedChatRoomId(trade.roomId ?? null);
    setChatLoadingProductId(productId);

    try {
      const product = await getProductDetail(productId);
      setChatTargetProduct(product);
      setChatOpen(true);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, '채팅방을 열지 못했습니다.'));
    } finally {
      setChatLoadingProductId(null);
    }
  };

  return (
    <>
      <SectionTitle sub='내가 등록·구매한 상품과 거래 상태를 관리해요'>
        거래 내역
      </SectionTitle>
      <div className={S.tabContainer}>
        {['전체', '판매', '구매'].map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => setTab(item as '전체' | '판매' | '구매')}
            className={cn(S.tabBtn, tab === item ? S.tabActive : S.tabInactive)}
          >
            {item}
          </button>
        ))}
      </div>

      {errorMessage && <p className={S.errorText}>{errorMessage}</p>}

      <div className={S.listContainer}>
        {trades.map((trade, index) => {
          const productId = getProductId(trade);
          const blind = Boolean(trade.isBlind);

          return (
            <div
              key={`${trade.role}-${trade.tradeId}-${trade.roomId ?? 'product'}`}
              className={cn(S.listItem, index < trades.length - 1 && S.listBorder)}
            >
              <div className={S.itemLeft}>
                <div className={S.itemTopRow}>
                  <StatusBadge status={trade.status} />
                  <span
                    className={cn(S.roleBadge, trade.role === '판매' ? S.roleSell : S.roleBuy)}
                  >
                    {trade.role}
                  </span>
                  {blind && (
                    <span className="rounded-lg bg-red-100 px-2.5 py-1 text-[12px] font-bold text-red-600">
                      블라인드
                    </span>
                  )}
                  <span className={cn(S.productName, blind && 'text-slate-400')}>
                    {blind ? '신고 누적으로 블라인드 처리된 상품입니다.' : trade.productName}
                  </span>
                </div>
                <div className={S.itemBottomRow}>
                  <span className={cn(S.price, blind && 'text-slate-400')}>
                    {blind ? `신고 ${trade.reportCount ?? 5}회 누적` : formatPrice(trade.price)}
                  </span>
                  <span className={S.divider}>|</span>
                  <span className={S.date}>{formatDate(trade.createdAt)}</span>
                </div>
              </div>
              <div className={S.actionGroup}>
                <Link href={`/community/market/${productId}`} className={S.actionLink}>
                  <ExternalLink className='size-3.5' />
                  상품 보기
                </Link>
                <button
                  type='button'
                  className={S.actionButton}
                  disabled={chatLoadingProductId === productId}
                  onClick={() => void handleOpenChat(trade)}
                >
                  <MessageCircle className='size-3.5' />
                  {chatLoadingProductId === productId ? '여는 중' : '채팅'}
                </button>
              </div>
            </div>
          );
        })}
        {trades.length === 0 && !loadingMore && (
          <div className={S.emptyState}>
            <Receipt className={S.emptyIcon} />
            <p className={S.emptyText}>거래 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className={S.moreWrap}>
          <button
            type='button'
            className={S.moreButton}
            disabled={loadingMore}
            onClick={() => void loadTrades(page + 1, true)}
          >
            {loadingMore ? '불러오는 중' : `더보기 ${trades.length} / ${totalElements}`}
          </button>
        </div>
      )}

      <CommunityMarketChatDrawer
        open={chatOpen}
        targetProduct={chatTargetProduct}
        initialRoomId={selectedChatRoomId}
        onClose={() => setChatOpen(false)}
        onRoomsChanged={() => void loadTrades(0, false)}
      />
    </>
  );
}
