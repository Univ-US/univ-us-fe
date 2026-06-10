import { CalendarCheck } from 'lucide-react';
import type { MouseEvent } from 'react';

import type {
  RoomAvailability,
  RoomReservation,
  RoomReservationSlot,
} from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import { SLOT_HOURS, type SelectedRoomSlot } from '../reservationConstants';
import {
  formatIsoTime,
  formatRoomSlotLabel,
  formatRoomType,
  isRoomSlotSelected,
} from '../reservationUtils';
import MyRoomReservations from './MyRoomReservations';

type RoomReservationSectionProps = {
  reservations: RoomReservation[];
  reservationsLoading: boolean;
  reservationError: string;
  cancelingReservationId: number | null;
  onCancelReservation: (reservation: RoomReservation) => void;
  onRefreshReservations: () => void;
  availabilityError: string;
  availabilityLoading: boolean;
  roomAvailabilities: RoomAvailability[];
  selectedSlot: SelectedRoomSlot | null;
  selectedDateLabel: string;
  selectedRoomSlots: RoomReservationSlot[];
  selectedRoomStartTime: string;
  selectedRoomEndTime: string;
  reservationLoading: boolean;
  onRoomSlotMouseDown: (
    event: MouseEvent<HTMLButtonElement>,
    room: RoomAvailability,
    slotIndex: number,
  ) => void;
  onRoomSlotMouseEnter: (room: RoomAvailability, slotIndex: number) => void;
  onRoomSlotMouseUp: () => void;
  onReserveRoom: () => void;
};

export default function RoomReservationSection({
  reservations,
  reservationsLoading,
  reservationError,
  cancelingReservationId,
  onCancelReservation,
  onRefreshReservations,
  availabilityError,
  availabilityLoading,
  roomAvailabilities,
  selectedSlot,
  selectedDateLabel,
  selectedRoomSlots,
  selectedRoomStartTime,
  selectedRoomEndTime,
  reservationLoading,
  onRoomSlotMouseDown,
  onRoomSlotMouseEnter,
  onRoomSlotMouseUp,
  onReserveRoom,
}: RoomReservationSectionProps) {
  return (
    <div>
      <MyRoomReservations
        reservations={reservations}
        loading={reservationsLoading}
        error={reservationError}
        cancelingReservationId={cancelingReservationId}
        onCancel={onCancelReservation}
        onRefresh={onRefreshReservations}
      />

      {availabilityError ? (
        <div className='rounded-2xl border border-red-100 bg-red-50 px-4 py-8 text-center text-[13px] font-semibold text-red-500'>
          {availabilityError}
        </div>
      ) : availabilityLoading && roomAvailabilities.length === 0 ? (
        <div className='rounded-2xl border border-border bg-white px-4 py-8 text-center text-[13px] font-semibold text-slate-400 shadow-sm'>
          공간 예약 현황을 불러오는 중입니다.
        </div>
      ) : roomAvailabilities.length === 0 ? (
        <div className='rounded-2xl border border-border bg-white px-4 py-8 text-center text-[13px] font-semibold text-slate-400 shadow-sm'>
          예약 가능한 공간이 없습니다.
        </div>
      ) : (
        <div className='overflow-x-auto rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:shadow-md'>
          <div className='min-w-[920px]'>
            <div className='flex border-b border-border'>
              <div className='w-[220px] shrink-0 border-r border-border px-4 py-3 text-[12px] font-bold text-slate-400'>
                공간 / 시간
              </div>
              {roomAvailabilities[0]?.slots.map((slot) => (
                <div
                  key={`${slot.startTime}-${slot.endTime}`}
                  className='flex-1 border-r border-border py-3 text-center text-[12px] font-semibold text-slate-500 last:border-0'
                >
                  {formatRoomSlotLabel(slot)}
                </div>
              ))}
            </div>

            {roomAvailabilities.map((room) => (
              <div
                key={room.roomId}
                className='group/room flex border-b border-border transition-colors duration-200 last:border-0 hover:bg-slate-50/70'
              >
                <div className='w-[220px] shrink-0 border-r border-border px-4 py-4'>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition-transform duration-200 group-hover/room:scale-105'>
                      {formatRoomType(room.roomType)}
                    </span>
                    <span className='text-[13px] font-bold text-slate-800'>
                      {room.roomName}
                    </span>
                  </div>
                  <div className='mt-1 text-[11px] font-semibold text-slate-400'>
                    정원 {room.capacity}인
                    {[room.floorName, room.location]
                      .filter(Boolean)
                      .map((text) => ` · ${text}`)
                      .join('')}
                  </div>
                </div>
                {room.slots.map((slot, slotIndex) => {
                  const isSelected = isRoomSlotSelected(
                    selectedSlot,
                    room.roomId,
                    slotIndex,
                  );

                  return (
                    <button
                      key={`${room.roomId}-${slot.startTime}`}
                      disabled={!slot.available}
                      onMouseDown={(event) =>
                        onRoomSlotMouseDown(event, room, slotIndex)
                      }
                      onMouseEnter={() =>
                        onRoomSlotMouseEnter(room, slotIndex)
                      }
                      onMouseUp={onRoomSlotMouseUp}
                      className={cn(
                        'flex-1 border-r border-border py-4 text-center text-[12px] font-semibold transition-all duration-200 last:border-0 active:scale-95',
                        !slot.available
                          ? 'cursor-not-allowed text-slate-400'
                          : isSelected
                            ? 'scale-[1.02] bg-primary text-white shadow-inner'
                            : 'hover:-translate-y-0.5 hover:bg-primary/5 hover:text-primary hover:shadow-sm',
                      )}
                      style={
                        !slot.available
                          ? {
                              background:
                                'repeating-linear-gradient(45deg, #E2E8E7, #E2E8E7 4px, #EDF1F0 4px, #EDF1F0 10px)',
                            }
                          : {}
                      }
                    >
                      {isSelected ? '선택' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='mt-3 flex items-center gap-4 text-[12px] text-slate-500'>
        <span className='flex items-center gap-1.5'>
          <span className='size-3 rounded-sm border border-border bg-white' />
          예약 가능
        </span>
        <span className='flex items-center gap-1.5'>
          <span
            className='size-3 rounded-sm'
            style={{
              background:
                'repeating-linear-gradient(45deg, #E2E8E7, #E2E8E7 4px, #EDF1F0 4px, #EDF1F0 10px)',
            }}
          />
          예약 마감
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-3 rounded-sm bg-primary' />
          선택
        </span>
      </div>

      {selectedSlot && (
        <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md'>
          <div>
            <div className='text-[11px] font-semibold text-primary'>
              선택한 시간
            </div>
            <div className='mt-0.5 text-[14px] font-bold text-slate-900'>
              {selectedSlot.room.roomName} · {selectedDateLabel}{' '}
              {formatIsoTime(selectedRoomStartTime)} ~{' '}
              {formatIsoTime(selectedRoomEndTime)} · 정원{' '}
              {selectedSlot.room.capacity}인
            </div>
            <div className='mt-1 text-[12px] font-semibold text-slate-500'>
              총 {selectedRoomSlots.length * SLOT_HOURS}시간
            </div>
          </div>
          <button
            disabled={reservationLoading}
            onClick={onReserveRoom}
            className='flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
            style={{ background: '#0FA896' }}
            onMouseEnter={(event) =>
              (event.currentTarget.style.background = 'var(--brand-hover)')
            }
            onMouseLeave={(event) =>
              (event.currentTarget.style.background = '#0FA896')
            }
          >
            <CalendarCheck className='size-4' />
            {reservationLoading ? '예약 중' : '공간 예약하기'}
          </button>
        </div>
      )}
    </div>
  );
}
