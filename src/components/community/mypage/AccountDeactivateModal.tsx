import { TriangleAlert, X } from 'lucide-react';

type AccountDeactivateModalProps = {
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function AccountDeactivateModal({
  loading,
  onClose,
  onSubmit,
}: AccountDeactivateModalProps) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4'>
      <div className='w-full max-w-[420px] rounded-2xl border border-border bg-white p-6 shadow-xl'>
        <div className='mb-5 flex items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[16px] font-extrabold text-slate-900'>
              <TriangleAlert className='size-5 text-red-500' />
              계정 비활성화
            </div>
            <div className='mt-1 text-[12px] font-semibold text-slate-400'>
              정말 계정을 비활성화하시겠습니까?
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

        <div className='rounded-xl border border-red-100 bg-red-50 px-4 py-3'>
          <div className='text-[13px] font-bold text-red-600'>
            ⚠️ 주의사항
          </div>
          <ul className='mt-2 list-inside list-disc space-y-1 text-[12px] font-medium leading-relaxed text-red-500/80'>
            <li>진행 중이거나 예정된 도서관/회의실 예약 내역이 <strong>모두 즉시 취소</strong>됩니다.</li>
            <li>취소된 예약 내역은 추후 복구되지 않습니다.</li>
            <li>다음에 로그인할 때 언제든 다시 활성화할 수 있습니다.</li>
          </ul>
        </div>

        <div className='mt-6 flex justify-end gap-2'>
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
            className='flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <TriangleAlert className='size-4' />
            {loading ? '처리 중' : '비활성화'}
          </button>
        </div>
      </div>
    </div>
  );
}
