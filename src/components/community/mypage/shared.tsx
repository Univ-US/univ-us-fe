import React from 'react';

export function formatPrice(price: number) {
  return price === 0 ? '나눔' : price.toLocaleString('ko-KR') + '원';
}

export function BoardBadge({ board }: { board: string }) {
  const styles: Record<string, string> = {
    자유: 'bg-primary/10 text-primary',
    익명: 'bg-slate-100 text-slate-500',
    공지: 'bg-blue-50 text-blue-600',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[board] ?? 'bg-slate-100 text-slate-500'}`}
    >
      {board}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    SALE: '판매중',
    RESERVED: '예약중',
    DONE: '거래완료',
    판매중: '판매중',
    예약중: '예약중',
    거래완료: '거래완료',
  };
  const displayStatus = labelMap[status] || status;

  const styles: Record<string, string> = {
    판매중: 'bg-emerald-100 text-emerald-700',
    예약중: 'bg-amber-100 text-amber-700',
    거래완료: 'bg-slate-100 text-slate-500',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[displayStatus] ?? styles['거래완료']}`}
    >
      {displayStatus}
    </span>
  );
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('전') || dateStr.includes('어제')) return dateStr;
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function SectionTitle({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className='mb-5'>
      <h2 className='text-[16px] font-extrabold tracking-tight text-slate-900'>
        {children}
      </h2>
      {sub && <p className='mt-1 text-[13px] text-slate-400'>{sub}</p>}
    </div>
  );
}
