import { Clock, RefreshCw, Trash2 } from 'lucide-react';

import type { ReadingSeatReservation } from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import {
  formatReservationPeriod,
  getReservationStatusClassName,
  getReservationStatusLabel,
  isCancelableReservation,
} from '../reservationUtils';

type MyReadingSeatReservationsProps = {
  reservations: ReadingSeatReservation[];
  loading: boolean;
  error: string;
  cancelingReservationId: number | null;
  onCancel: (reservationId: number) => void;
  onRefresh: () => void;
};

export default function MyReadingSeatReservations({
  reservations,
  loading,
  error,
  cancelingReservationId,
  onCancel,
  onRefresh,
}: MyReadingSeatReservationsProps) {
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
            const isCanceling =
              cancelingReservationId === reservation.reservationId;

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
            );
          })}
        </div>
      )}
    </div>
  );
}
