import { useState } from 'react';
import { Clock, RefreshCw, Trash2, CheckCircle2, Clock4, Info } from 'lucide-react';

import type { ReadingSeatReservation } from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import {
  formatReservationPeriod,
  getReservationStatusClassName,
  getReservationStatusLabel,
  isCancelableReservation,
} from '../reservationUtils';

const CHECK_IN_WINDOW_MINUTES = 20;
const EXTEND_WINDOW_MINUTES = 20;

function getDateTimeMs(dateTime: string) {
  const normalized = dateTime
    .trim()
    .replace(' ', 'T')
    .replace(/\.(\d{3})\d*/, '.$1');
  const time = new Date(normalized).getTime();

  return Number.isNaN(time) ? null : time;
}

type MyReadingSeatReservationsProps = {
  reservations: ReadingSeatReservation[];
  loading: boolean;
  error: string;
  cancelingReservationId: number | null;
  checkingInReservationId?: number | null;
  extendingReservationId?: number | null;
  onCancel: (reservationId: number) => void;
  onCheckIn?: (reservationId: number) => void;
  onExtend?: (reservationId: number) => void;
  onRefresh: () => void;
};

export default function MyReadingSeatReservations({
  reservations,
  loading,
  error,
  cancelingReservationId,
  checkingInReservationId = null,
  extendingReservationId = null,
  onCancel,
  onCheckIn,
  onExtend,
  onRefresh,
}: MyReadingSeatReservationsProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleExtendClick = (
    reservationId: number,
    isExtendableTime: boolean,
    unavailableMessage: string,
  ) => {
    if (!isExtendableTime) {
      setToastMsg(unavailableMessage);
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    if (onExtend) {
      onExtend(reservationId);
    }
  };

  return (
    <div className='mb-5 rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <div className='text-[14px] font-bold text-slate-900'>
            내 좌석 예약
          </div>
          <div className='mt-0.5 text-[12px] font-semibold text-slate-400'>
            {reservations.length > 0 ? `${reservations.length}건` : '예약 없음'}
          </div>
        </div>
        <button
          type='button'
          onClick={onRefresh}
          disabled={loading}
          title='내 예약 새로고침'
          aria-label='내 예약 새로고침'
          className='flex size-9 items-center justify-center rounded-lg border border-border bg-white text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-sm hover:text-primary active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-500'>
          {error}
        </div>
      ) : loading && reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 내역을 불러오는 중입니다.
        </div>
      ) : reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 내역이 없습니다.
        </div>
      ) : (
        <div className='max-h-[260px] space-y-3 overflow-y-auto pr-1'>
          {reservations.map((reservation) => {
            const isCancelable = isCancelableReservation(reservation.status);
            const isCanceling = cancelingReservationId === reservation.reservationId;
            const isReserved = reservation.status === 'RESERVED';
            const isUsing = reservation.status === 'USING';
            const isCheckingIn = checkingInReservationId === reservation.reservationId;
            const isExtending = extendingReservationId === reservation.reservationId;

            const now = Date.now();
            const startTimeMs = getDateTimeMs(reservation.startTime);
            const endTimeMs = getDateTimeMs(reservation.endTime);
            const createdAtMs = reservation.createdAt
              ? getDateTimeMs(reservation.createdAt)
              : null;
            const checkInWindowStartMs =
              startTimeMs == null
                ? null
                : Math.max(createdAtMs ?? startTimeMs, startTimeMs);
            const checkInDeadlineMs =
              checkInWindowStartMs == null || endTimeMs == null
                ? null
                : Math.min(
                    checkInWindowStartMs + CHECK_IN_WINDOW_MINUTES * 60 * 1000,
                    endTimeMs,
                  );
            const canCheckIn =
              startTimeMs != null
              && endTimeMs != null
              && checkInDeadlineMs != null
              && now >= startTimeMs
              && now <= checkInDeadlineMs
              && now < endTimeMs;
            const checkInUnavailableLabel =
              startTimeMs == null || endTimeMs == null
                ? '시간 확인불가'
                : now < startTimeMs
                  ? '입실 전'
                  : '입실 만료';
            const timeUntilEndMs = endTimeMs == null ? null : endTimeMs - now;
            const isExtendableTime =
              timeUntilEndMs != null
              && timeUntilEndMs <= EXTEND_WINDOW_MINUTES * 60 * 1000
              && timeUntilEndMs > 0;
            const extendUnavailableMessage =
              timeUntilEndMs != null && timeUntilEndMs <= 0
                ? '이미 종료된 예약은 연장할 수 없습니다.'
                : '만료 20분 전부터 연장 가능합니다.';
            const extendLabel = isExtendableTime
              ? '연장'
              : timeUntilEndMs != null && timeUntilEndMs <= 0
                ? '연장 만료'
                : '20분 전 가능';

            return (
              <div
                key={reservation.reservationId}
                className='grid gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate text-[13px] font-bold text-slate-900'>
                      {reservation.roomName ?? '독서실'}
                    </span>
                    <span className='rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 transition-transform duration-200 hover:scale-105'>
                      {reservation.seatNumber
                        ? `${reservation.seatNumber}번`
                        : `좌석 ${reservation.seatId}`}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold transition-transform duration-200 hover:scale-105',
                        getReservationStatusClassName(reservation.status),
                      )}
                    >
                      {getReservationStatusLabel(reservation.status)}
                    </span>
                  </div>
                  <div className='mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-500'>
                    <Clock className='size-3.5 shrink-0' />
                    <span className='truncate'>
                      {formatReservationPeriod(
                        reservation.startTime,
                        reservation.endTime,
                      )}
                    </span>
                  </div>
                </div>

                <div className='flex gap-2'>
                  {isReserved && onCheckIn && (
                    <button
                      type='button'
                      onClick={() => onCheckIn(reservation.reservationId)}
                      disabled={isCheckingIn || isCanceling || !canCheckIn}
                      title={canCheckIn ? '입실' : checkInUnavailableLabel}
                      className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 text-[12px] font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <CheckCircle2 className='size-3.5' />
                      {isCheckingIn ? '처리 중' : canCheckIn ? '입실' : checkInUnavailableLabel}
                    </button>
                  )}
                  {isUsing && onExtend && (
                    <button
                      type='button'
                      onClick={() =>
                        handleExtendClick(
                          reservation.reservationId,
                          isExtendableTime,
                          extendUnavailableMessage,
                        )
                      }
                      disabled={isExtending}
                      className={cn(
                        'flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50',
                        !isExtendableTime
                          ? 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
                          : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
                      )}
                    >
                      <Clock4 className='size-3.5' />
                      {isExtending ? '처리 중' : extendLabel}
                    </button>
                  )}
                  {isCancelable && (
                    <button
                      type='button'
                      onClick={() => onCancel(reservation.reservationId)}
                      disabled={isCanceling}
                      className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-[12px] font-bold text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <Trash2 className='size-3.5' />
                      {isCanceling ? '취소 중' : '취소'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toastMsg && (
        <div className='fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex animate-in fade-in slide-in-from-bottom-2 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-lg duration-300'>
          <Info className='size-4 text-slate-500' />
          <p className='text-[13px] font-semibold text-slate-700'>{toastMsg}</p>
        </div>
      )}
    </div>
  );
}
