import { Check } from 'lucide-react';

import type { ReadingSeatAvailability } from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import { sortSeats } from '../reservationUtils';

type SeatMapProps = {
  seats: ReadingSeatAvailability[];
  selectedSeat: ReadingSeatAvailability | null;
  onSelect: (seat: ReadingSeatAvailability) => void;
  readingRoomId?: number | null;
  roomName?: string;
};

export default function SeatMap({
  seats,
  selectedSeat,
  onSelect,
  readingRoomId,
  roomName,
}: SeatMapProps) {
  const sortedSeats = sortSeats(seats);
  const seatsA = sortedSeats.filter((seat) => seat.zoneName === 'A');
  const seatsB = sortedSeats.filter((seat) => seat.zoneName === 'B');
  const fallbackHalf = Math.ceil(sortedSeats.length / 2);
  const colsA = seatsA.length > 0 ? seatsA : sortedSeats.slice(0, fallbackHalf);
  const colsB = seatsB.length > 0 ? seatsB : sortedSeats.slice(fallbackHalf);
  const isSecondReadingRoom =
    readingRoomId === 2 || (roomName?.includes('제2') ?? false);
  const gridCols = isSecondReadingRoom ? 'grid-cols-8' : 'grid-cols-4';

  const SeatBtn = ({ seat }: { seat: ReadingSeatAvailability }) => {
    const isDisabled = seat.seatStatus !== 'AVAILABLE';
    const isSelected = selectedSeat?.seatId === seat.seatId;

    return (
      <button
        disabled={isDisabled}
        onClick={() => onSelect(seat)}
        className={cn(
          'flex size-[44px] items-center justify-center rounded-lg text-[13px] font-bold transition-all',
          isDisabled
            ? 'cursor-not-allowed bg-slate-200 text-slate-400'
            : isSelected
              ? 'bg-primary text-white shadow-md'
              : 'border border-border bg-white text-slate-600 hover:border-primary hover:text-primary',
        )}
      >
        {isSelected ? <Check className='size-4' /> : seat.seatNumber}
      </button>
    );
  };

  return (
    <div className='mt-4 overflow-hidden rounded-2xl border border-border bg-slate-50 p-6'>
      <div className='mb-4 flex items-center justify-end gap-4 text-[12px] text-slate-500'>
        <span className='flex items-center gap-1.5'>
          <span className='size-3 rounded-sm border border-border bg-white' />
          빈 좌석
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-3 rounded-sm bg-primary' />
          선택
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-3 rounded-sm bg-slate-200' />
          사용중
        </span>
      </div>
      <div className='flex justify-center gap-8'>
        <div>
          <div className='mb-2 text-center text-[11px] font-bold text-slate-400'>
            A 구역
          </div>
          <div className={cn('grid gap-2', gridCols)}>
            {colsA.map((seat) => (
              <SeatBtn key={seat.seatId} seat={seat} />
            ))}
          </div>
        </div>
        <div className='flex flex-col items-center justify-center'>
          <div className='h-full w-px bg-border' />
        </div>
        <div>
          <div className='mb-2 text-center text-[11px] font-bold text-slate-400'>
            B 구역
          </div>
          <div className={cn('grid gap-2', gridCols)}>
            {colsB.map((seat) => (
              <SeatBtn key={seat.seatId} seat={seat} />
            ))}
          </div>
        </div>
      </div>
      <div className='mt-4 text-center'>
        <span className='inline-block rounded-full border border-border bg-white px-6 py-1 text-[11px] font-bold text-slate-400'>
          입 구
        </span>
      </div>
    </div>
  );
}
