'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, ShieldAlert, X } from 'lucide-react';

import {
  getReservationPenaltyHistory,
  type ReservationPenaltyHistory,
} from '@/lib/reservationApi';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 5;

type ReservationPenaltyHistoryModalProps = {
  open: boolean;
  onClose: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const normalized = value.trim().replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getPenaltyTypeLabel(type: string) {
  return type === 'NO_SHOW' ? '노쇼' : type;
}

export default function ReservationPenaltyHistoryModal({
  open,
  onClose,
}: ReservationPenaltyHistoryModalProps) {
  const [history, setHistory] = useState<ReservationPenaltyHistory[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (nextPage: number, append: boolean) => {
    setLoading(true);
    setError('');
    try {
      const data = await getReservationPenaltyHistory(nextPage, PAGE_SIZE);
      setHistory((current) => append ? [...current, ...data.content] : data.content);
      setPage(data.page);
      setTotalElements(data.totalElements);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, '패널티 이력을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setHistory([]);
    setPage(0);
    setTotalElements(0);
    void loadHistory(0, false);
  }, [loadHistory, open]);

  if (!open) return null;

  const hasMore = history.length < totalElements;

  return (
    <div className='fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='reservation-penalty-history-title'
        className='flex max-h-[82vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl'
      >
        <div className='flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5'>
          <div>
            <div className='flex items-center gap-2'>
              <ShieldAlert className='size-5 text-amber-600' />
              <h2
                id='reservation-penalty-history-title'
                className='text-[18px] font-extrabold text-slate-900'
              >
                예약 패널티 이력
              </h2>
            </div>
            <p className='mt-1.5 text-[13px] text-slate-500'>
              노쇼 발생 사유와 서약 처리 내역을 확인할 수 있습니다.
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='패널티 이력 닫기'
            className='flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='size-4' />
          </button>
        </div>

        <div className='overflow-y-auto px-6 py-5'>
          {error && (
            <div className='rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600'>
              {error}
            </div>
          )}

          {!error && loading && history.length === 0 && (
            <div className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-10 text-center text-[13px] font-semibold text-slate-400'>
              패널티 이력을 불러오는 중입니다.
            </div>
          )}

          {!error && !loading && history.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-[13px] font-semibold text-slate-400'>
              발생한 예약 패널티가 없습니다.
            </div>
          )}

          {history.length > 0 && (
            <div className='space-y-3'>
              {history.map((item) => {
                const active = item.status === 'ACTIVE';
                return (
                  <div
                    key={item.penaltyId}
                    className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <span className='rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-700'>
                          {getPenaltyTypeLabel(item.penaltyType)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                            active
                              ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {active ? '활성' : item.status === 'PLEDGED' ? '서약 완료' : item.status}
                        </span>
                      </div>
                      <span className='flex items-center gap-1.5 text-[12px] font-semibold text-slate-400'>
                        <CalendarClock className='size-3.5' />
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className='mt-3 text-[13px] font-semibold leading-5 text-slate-700'>
                      {item.reason}
                    </p>
                    {item.resolvedAt && (
                      <p className='mt-2 text-[12px] font-semibold text-emerald-700'>
                        서약 처리: {formatDateTime(item.resolvedAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className='mt-4 flex justify-center'>
              <button
                type='button'
                disabled={loading}
                onClick={() => void loadHistory(page + 1, true)}
                className='flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
              >
                <ChevronDown className='size-3.5' />
                {loading ? '불러오는 중' : `더보기 ${history.length} / ${totalElements}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
