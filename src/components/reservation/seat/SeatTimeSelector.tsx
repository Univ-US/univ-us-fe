import type { ReservationDateOption } from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import { TIME_SLOTS } from '../reservationConstants';
import { formatHour, isTimeSlotClosed } from '../reservationUtils';

type SeatTimeSelectorProps = {
  selectedDay: ReservationDateOption | null;
  serverNow: string;
  selectedSlotIndexes: number[];
  selectedStartHour: number;
  selectedEndHour: number;
  selectedDurationHours: number;
  onTimeSlotClick: (slotIndex: number) => void;
};

export default function SeatTimeSelector({
  selectedDay,
  serverNow,
  selectedSlotIndexes,
  selectedStartHour,
  selectedEndHour,
  selectedDurationHours,
  onTimeSlotClick,
}: SeatTimeSelectorProps) {
  return (
    <div className='mb-5 flex flex-wrap items-start gap-3'>
      <span className='pt-3 text-[13px] font-bold text-slate-400'>
        이용 시간
      </span>
      <div className='flex flex-col gap-2'>
        <div className='flex flex-wrap gap-2'>
          {TIME_SLOTS.map((slot, index) => {
            const isSelected = selectedSlotIndexes.includes(index);
            const isStartSlot = index === selectedSlotIndexes[0];
            const isClosed = isTimeSlotClosed(selectedDay, slot, serverNow);

            return (
              <button
                key={slot.startHour}
                disabled={isClosed}
                onClick={() => onTimeSlotClick(index)}
                className={cn(
                  'h-[44px] min-w-[104px] rounded-xl border px-3 text-[12px] font-bold transition-all',
                  isClosed
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                    : isSelected
                      ? isStartSlot
                        ? 'border-primary bg-primary text-white shadow-md'
                        : 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-slate-600 hover:border-primary hover:text-primary',
                )}
              >
                {formatHour(slot.startHour)} - {formatHour(slot.endHour)}
              </button>
            );
          })}
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[12px] font-bold'>
          <span className='rounded-full bg-primary/10 px-3 py-1 text-primary'>
            선택 시간 {formatHour(selectedStartHour)} ~{' '}
            {formatHour(selectedEndHour)}
          </span>
          <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-500'>
            총 {selectedDurationHours}시간
          </span>
        </div>
      </div>
    </div>
  );
}
