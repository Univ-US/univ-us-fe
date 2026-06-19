import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ReservationPenaltyStatus } from '@/lib/reservationApi';

type ReservationPenaltyPledgeModalProps = {
  status: ReservationPenaltyStatus;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (pledgeText: string, agreed: boolean) => void;
};

export default function ReservationPenaltyPledgeModal({
  status,
  loading,
  error,
  onClose,
  onSubmit,
}: ReservationPenaltyPledgeModalProps) {
  const [pledgeText, setPledgeText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const canSubmit = pledgeText.trim() === status.pledgePhrase && agreed;

  useEffect(() => {
    setPledgeText('');
    setAgreed(false);
  }, [status.pledgePhrase]);

  return (
    <div className='fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4'>
      <div className='w-full max-w-[520px] rounded-2xl border border-border bg-white p-6 shadow-xl'>
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500'>
              <ShieldAlert className='size-5' />
            </div>
            <div>
              <div className='text-[17px] font-extrabold text-slate-900'>
                예약 이용 서약 확인
              </div>
              <div className='mt-1 text-[12px] font-semibold text-slate-500'>
                노쇼 패널티 {status.activePenaltyCount}회 누적으로 예약 이용이 제한되었습니다.
              </div>
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

        <div className='rounded-xl border border-amber-100 bg-amber-50 px-4 py-3'>
          <div className='text-[12px] font-bold text-amber-700'>
            서약 문구
          </div>
          <p className='mt-2 text-[13px] font-semibold leading-6 text-slate-700'>
            {status.pledgePhrase}
          </p>
        </div>

        <label className='mt-5 block'>
          <span className='text-[12px] font-bold text-slate-600'>
            위 문구를 그대로 입력
          </span>
          <textarea
            value={pledgeText}
            onChange={(event) => setPledgeText(event.target.value)}
            disabled={loading}
            placeholder='서약 문구를 정확히 입력해주세요.'
            className='mt-2 h-[104px] w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-[13px] font-semibold leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50'
          />
        </label>

        <label className='mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3'>
          <input
            type='checkbox'
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={loading}
            className='mt-0.5 size-4 accent-primary'
          />
          <span className='text-[12px] font-semibold leading-5 text-slate-600'>
            위 내용을 확인했으며, 향후 예약 이용 정책을 준수하겠습니다.
          </span>
        </label>

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
            나중에
          </button>
          <button
            type='button'
            onClick={() => onSubmit(pledgeText, agreed)}
            disabled={loading || !canSubmit}
            className='h-10 rounded-xl bg-primary px-4 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? '확인 중' : '서약하고 이용하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
