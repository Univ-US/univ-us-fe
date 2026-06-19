import { ChevronRight, ShieldAlert } from 'lucide-react';

import type { ReservationPenaltyStatus } from '@/lib/reservationApi';
import { cn } from '@/lib/utils';

type ReservationPenaltyBadgeProps = {
  status: ReservationPenaltyStatus | null;
  onClick: () => void;
};

export default function ReservationPenaltyBadge({
  status,
  onClick,
}: ReservationPenaltyBadgeProps) {
  if (!status) {
    return null;
  }

  const hasPenalty = status.activePenaltyCount > 0;

  return (
    <button
      type='button'
      onClick={onClick}
      title={status.message}
      aria-label={`노쇼 패널티 ${status.activePenaltyCount}/${status.blockThreshold}회`}
      className={cn(
        'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[12px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm',
        status.blocked
          ? 'border-red-200 bg-red-50 text-red-600'
          : hasPenalty
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-100 bg-emerald-50 text-emerald-700',
      )}
    >
      <ShieldAlert className='size-3.5' />
      <span>노쇼 패널티</span>
      <strong>
        {status.activePenaltyCount}/{status.blockThreshold}회
      </strong>
      <ChevronRight className='size-3.5 opacity-60' />
    </button>
  );
}
