import { Sparkles } from 'lucide-react';

type ReactivateModalProps = {
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function ReactivateModal({
  loading,
  onClose,
  onSubmit,
}: ReactivateModalProps) {
  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-slate-50 px-4'>
      <div className='w-full max-w-[400px] rounded-2xl border border-border bg-white p-6 shadow-2xl'>
        <div className='flex flex-col items-center justify-center text-center'>
          <div className='flex size-16 items-center justify-center rounded-full bg-primary/5 mb-4'>
            <Sparkles className='size-8 text-primary' />
          </div>
          
          <h2 className='text-[20px] font-extrabold text-slate-900'>
            다시 돌아오셨군요! 👋
          </h2>
          <p className='mt-3 text-[14px] font-medium leading-relaxed text-slate-500'>
            현재 회원님의 커뮤니티 계정은 <strong className='text-slate-700'>비활성화 상태</strong>입니다.<br/>
            다시 활성화하시면 이전에 작성하신 글과 댓글을 포함한 모든 커뮤니티 기능을 그대로 이용하실 수 있습니다.
          </p>
        </div>

        <div className='mt-6 flex flex-col gap-2'>
          <button
            type='button'
            onClick={onSubmit}
            disabled={loading}
            className='flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-white shadow-md transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {loading ? '처리 중...' : '커뮤니티 다시 활성화하기'}
          </button>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='flex h-12 w-full items-center justify-center rounded-xl bg-slate-100 text-[15px] font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50'
          >
            메인 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
