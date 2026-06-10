import { CalendarCheck, X } from 'lucide-react';

import type { ReadingSeatAvailability } from '@/lib/reservationApi';
import { formatReservationPeriod } from '../reservationUtils';

type SeatReservationModalProps = {
  seat: ReadingSeatAvailability;
  roomName?: string | null;
  startTime: string;
  endTime: string;
  durationHours: number;
  error: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function SeatReservationModal({
  seat,
  roomName,
  startTime,
  endTime,
  durationHours,
  error,
  loading,
  onClose,
  onSubmit,
}: SeatReservationModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4'>
      <div className='w-full max-w-[420px] rounded-2xl border border-border bg-white p-6 shadow-xl'>
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <div className='text-[16px] font-extrabold text-slate-900'>
              좌석 예약 확인
            </div>
            <div className='mt-1 text-[12px] font-semibold text-slate-400'>
              예약할 좌석과 이용 시간을 확인해주세요.
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            title='닫기'
            aria-label='닫기'
            className='flex size-9 items-center justify-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
          >
            <X className='size-4' />
          </button>
        </div>

        <div className='rounded-xl border border-border bg-slate-50 px-4 py-3'>
          <div className='text-[13px] font-bold text-slate-900'>
            {roomName ?? seat.roomName ?? '독서실'} · {seat.seatNumber}번 좌석
          </div>
          <div className='mt-1 text-[12px] font-semibold text-slate-500'>
            {formatReservationPeriod(startTime, endTime)}
          </div>
          <div className='mt-1 text-[12px] font-semibold text-slate-400'>
            총 {durationHours}시간
          </div>
        </div>

        {error && (
          <div className='mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-500'>
            {error}
          </div>
        )}

        <div className='mt-5 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='h-10 rounded-xl border border-border bg-white px-4 text-[13px] font-bold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            닫기
          </button>
          <button
            type='button'
            onClick={onSubmit}
            disabled={loading}
            className='flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <CalendarCheck className='size-4' />
            {loading ? '예약 중' : '예약하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
