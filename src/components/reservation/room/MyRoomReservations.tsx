import { CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';

import type {
  ReservationPenaltyStatus,
  RoomReservation,
} from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import ReservationPenaltyBadge from '../ReservationPenaltyBadge';
import {
  formatReservationPeriod,
  getReservationStatusClassName,
  getReservationStatusLabel,
  isCancelableReservation,
} from '../reservationUtils';

type MyRoomReservationsProps = {
  reservations: RoomReservation[];
  loading: boolean;
  error: string;
  cancelingReservationId: number | null;
  checkingInReservationId: number | null;
  penaltyStatus: ReservationPenaltyStatus | null;
  onCancel: (reservation: RoomReservation) => void;
  onCheckIn: (reservationId: number) => void;
  onOpenPenaltyHistory: () => void;
  onRefresh: () => void;
};

export default function MyRoomReservations({
  reservations,
  loading,
  error,
  cancelingReservationId,
  checkingInReservationId,
  penaltyStatus,
  onCancel,
  onCheckIn,
  onOpenPenaltyHistory,
  onRefresh,
}: MyRoomReservationsProps) {
  return (
    <div className='mb-5 rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-[14px] font-bold text-slate-900'>
            내 예약 현황
          </div>
          <div className='mt-0.5 text-[12px] font-semibold text-slate-400'>
            {reservations.length > 0 ? `${reservations.length}건` : '예약 없음'}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <ReservationPenaltyBadge
            status={penaltyStatus}
            onClick={onOpenPenaltyHistory}
          />
          <button
            type='button'
            onClick={onRefresh}
            disabled={loading}
            title='내 회의실 예약 새로고침'
            aria-label='내 회의실 예약 새로고침'
            className='flex size-9 items-center justify-center rounded-lg border border-border bg-white text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-sm hover:text-primary active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-500'>
          {error}
        </div>
      ) : loading && reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 현황을 불러오는 중입니다.
        </div>
      ) : reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 현황이 없습니다.
        </div>
      ) : (
        <div className='max-h-[260px] space-y-3 overflow-y-auto pr-1'>
          {reservations.map((reservation) => {
            const isCancelable =
              isCancelableReservation(reservation.status)
              && reservation.checkInState !== 'EXPIRED';
            const isCanceling =
              cancelingReservationId === reservation.reservationId;
            const isReserved = reservation.status === 'RESERVED';
            const isCheckingIn =
              checkingInReservationId === reservation.reservationId;
            const canCheckIn = reservation.checkInState === 'AVAILABLE';
            const checkInLabel =
              reservation.checkInState === 'BEFORE'
                ? '입실 전'
                : reservation.checkInState === 'EXPIRED'
                  ? '입실 만료'
                  : '입실';

            return (
              <div
                key={reservation.reservationId}
                className='grid gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate text-[13px] font-bold text-slate-900'>
                      {reservation.roomName ?? '회의실'}
                    </span>
                    <span className='rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 transition-transform duration-200 hover:scale-105'>
                      정원 {reservation.capacity ?? '-'}인
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
                <div className='flex flex-col items-end gap-2'>
                  <div className='text-[12px] font-semibold text-slate-400'>
                    {reservation.purpose || '목적 미입력'}
                  </div>
                  <div className='flex gap-2'>
                    {isReserved && (
                      <button
                        type='button'
                        onClick={() => onCheckIn(reservation.reservationId)}
                        disabled={!canCheckIn || isCheckingIn || isCanceling}
                        title={checkInLabel}
                        className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 text-[12px] font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        <CheckCircle2 className='size-3.5' />
                        {isCheckingIn ? '처리 중' : checkInLabel}
                      </button>
                    )}
                    {isCancelable && (
                      <button
                        type='button'
                        onClick={() => onCancel(reservation)}
                        disabled={isCanceling || isCheckingIn}
                        className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-[12px] font-bold text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        <Trash2 className='size-3.5' />
                        {isCanceling ? '취소 중' : '취소'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
