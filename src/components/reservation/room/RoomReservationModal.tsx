import { CalendarCheck, X } from 'lucide-react';

import type { SelectedRoomSlot } from '../reservationConstants';
import { formatReservationPeriod } from '../reservationUtils';

type RoomReservationModalProps = {
  selectedSlot: SelectedRoomSlot;
  startTime: string;
  endTime: string;
  durationHours: number;
  purpose: string;
  error: string;
  loading: boolean;
  onPurposeChange: (purpose: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function RoomReservationModal({
  selectedSlot,
  startTime,
  endTime,
  durationHours,
  purpose,
  error,
  loading,
  onPurposeChange,
  onClose,
  onSubmit,
}: RoomReservationModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4'>
      <div className='w-full max-w-[460px] rounded-2xl border border-border bg-white p-6 shadow-xl'>
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <div className='text-[16px] font-extrabold text-slate-900'>
              공간 예약 확인
            </div>
            <div className='mt-1 text-[12px] font-semibold text-slate-400'>
              예약 정보를 확인하고 목적을 입력해주세요.
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
            {selectedSlot.room.roomName}
          </div>
          <div className='mt-1 text-[12px] font-semibold text-slate-500'>
            {formatReservationPeriod(startTime, endTime)}
          </div>
          <div className='mt-1 text-[12px] font-semibold text-slate-400'>
            정원 {selectedSlot.room.capacity}인 · 총 {durationHours}시간
          </div>
        </div>

        <label className='mt-5 block'>
          <span className='text-[12px] font-bold text-slate-600'>
            예약 목적
          </span>
          <textarea
            value={purpose}
            onChange={(event) => onPurposeChange(event.target.value)}
            maxLength={500}
            disabled={loading}
            placeholder='예: 팀 프로젝트 회의'
            className='mt-2 h-[104px] w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50'
          />
        </label>
        <div className='mt-1 text-right text-[11px] font-semibold text-slate-400'>
          {purpose.length}/500
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
