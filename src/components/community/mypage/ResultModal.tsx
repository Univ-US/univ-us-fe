import { CheckCircle2, XCircle } from 'lucide-react';

type ResultModalProps = {
  type: 'success' | 'error';
  title: string;
  message: string;
  onConfirm: () => void;
};

export default function ResultModal({ type, title, message, onConfirm }: ResultModalProps) {
  const isSuccess = type === 'success';

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4'>
      <div className='w-full max-w-[360px] rounded-2xl border border-border bg-white p-6 shadow-xl text-center'>
        <div className='flex flex-col items-center justify-center'>
          {isSuccess ? (
            <div className='flex size-14 items-center justify-center rounded-full bg-primary/10 mb-4'>
              <CheckCircle2 className='size-7 text-primary' />
            </div>
          ) : (
            <div className='flex size-14 items-center justify-center rounded-full bg-red-100 mb-4'>
              <XCircle className='size-7 text-red-500' />
            </div>
          )}
          <h3 className='text-[18px] font-extrabold text-slate-900'>
            {title}
          </h3>
          <p className='mt-2 text-[14px] font-medium text-slate-500 leading-relaxed whitespace-pre-wrap'>
            {message}
          </p>
        </div>
        
        <div className='mt-6'>
          <button
            type='button'
            onClick={onConfirm}
            className={`w-full h-11 rounded-xl text-[14px] font-bold text-white shadow-md transition-colors ${
              isSuccess ? 'bg-primary hover:bg-primary/90' : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
