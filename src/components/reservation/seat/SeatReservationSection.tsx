import { CalendarCheck, MessageCircle } from 'lucide-react';

import type {
  ReadingRoomAvailability,
  ReadingSeatAvailability,
  ReadingSeatReservation,
  ReservationDateOption,
  ReservationPenaltyStatus,
} from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import AvailabilityRing from './AvailabilityRing';
import MyReadingSeatReservations from './MyReadingSeatReservations';
import SeatMap from './SeatMap';
import SeatTimeSelector from './SeatTimeSelector';

type SeatReservationSectionProps = {
  selectedDay: ReservationDateOption | null;
  serverNow: string;
  selectedSlotIndexes: number[];
  selectedStartHour: number;
  selectedEndHour: number;
  selectedDurationHours: number;
  onTimeSlotClick: (slotIndex: number) => void;
  reservations: ReadingSeatReservation[];
  reservationsLoading: boolean;
  reservationError: string;
  cancelingReservationId: number | null;
  checkingInReservationId?: number | null;
  extendingReservationId?: number | null;
  penaltyStatus: ReservationPenaltyStatus | null;
  onCancelReservation: (reservationId: number) => void;
  onCheckInReservation?: (reservationId: number) => void;
  onExtendReservation?: (reservationId: number) => void;
  onRefreshReservations: () => void;
  rooms: ReadingRoomAvailability[];
  currentRoom: ReadingRoomAvailability | undefined;
  selectedRoomId: number | null;
  onSelectRoom: (roomId: number) => void;
  seats: ReadingSeatAvailability[];
  selectedSeat: ReadingSeatAvailability | null;
  onSelectSeat: (seat: ReadingSeatAvailability) => void;
  currentMemberId?: number | null;
  onOpenSeatChat: (seat: ReadingSeatAvailability | null) => void;
  seatChatUnreadCount: number;
  seatError: string;
  seatLoading: boolean;
  reservationLoading: boolean;
  selectedTimeLabel: string;
  onReserveSeat: () => void;
};

export default function SeatReservationSection({
  selectedDay,
  serverNow,
  selectedSlotIndexes,
  selectedStartHour,
  selectedEndHour,
  selectedDurationHours,
  onTimeSlotClick,
  reservations,
  reservationsLoading,
  reservationError,
  cancelingReservationId,
  checkingInReservationId = null,
  extendingReservationId = null,
  penaltyStatus,
  onCancelReservation,
  onCheckInReservation,
  onExtendReservation,
  onRefreshReservations,
  rooms,
  currentRoom,
  selectedRoomId,
  onSelectRoom,
  seats,
  selectedSeat,
  onSelectSeat,
  currentMemberId,
  onOpenSeatChat,
  seatChatUnreadCount,
  seatError,
  seatLoading,
  reservationLoading,
  selectedTimeLabel,
  onReserveSeat,
}: SeatReservationSectionProps) {
  return (
    <div>
      <SeatTimeSelector
        selectedDay={selectedDay}
        serverNow={serverNow}
        selectedSlotIndexes={selectedSlotIndexes}
        selectedStartHour={selectedStartHour}
        selectedEndHour={selectedEndHour}
        selectedDurationHours={selectedDurationHours}
        onTimeSlotClick={onTimeSlotClick}
      />

      <MyReadingSeatReservations
        reservations={reservations}
        loading={reservationsLoading}
        error={reservationError}
        cancelingReservationId={cancelingReservationId}
        checkingInReservationId={checkingInReservationId}
        extendingReservationId={extendingReservationId}
        penaltyStatus={penaltyStatus}
        onCancel={onCancelReservation}
        onCheckIn={onCheckInReservation}
        onExtend={onExtendReservation}
        onRefresh={onRefreshReservations}
      />

      <div className='mb-5 grid grid-cols-3 gap-4'>
        {rooms.map((room) => (
          <button
            key={room.readingRoomId}
            onClick={() => onSelectRoom(room.readingRoomId)}
            className={cn(
              'flex items-center gap-4 rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:translate-y-0',
              selectedRoomId === room.readingRoomId
                ? 'scale-[1.02] border-primary bg-primary/5 shadow-md'
                : 'border-border bg-white hover:border-primary',
            )}
          >
            <AvailabilityRing
              free={room.availableSeatCount}
              total={room.totalSeatCount}
              danger={room.availableSeatCount <= 5}
            />
            <div>
              <div className='text-[14px] font-bold text-slate-900'>
                {room.roomName}
              </div>
              <div className='mt-0.5 text-[12px] text-slate-400'>
                {[room.floorName, room.description].filter(Boolean).join(' · ')}
              </div>
              <div
                className={cn(
                  'mt-1.5 text-[12px] font-semibold',
                  room.availableSeatCount <= 5
                    ? 'text-red-500'
                    : 'text-primary',
                )}
              >
                빈좌석 {room.availableSeatCount}석 / 전체 {room.totalSeatCount}석
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className='overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
          <div className='text-[14px] font-bold text-slate-900'>
            {currentRoom?.roomName ?? '독서실'} 좌석 배치도
          </div>
          <button
            type='button'
            onClick={() => onOpenSeatChat(null)}
            className='relative flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:shadow-sm active:translate-y-0'
          >
            <MessageCircle className='size-3.5' />
            좌석 채팅
            {seatChatUnreadCount > 0 && (
              <span className='flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold leading-5 text-white'>
                {seatChatUnreadCount > 99
                  ? '99+'
                  : seatChatUnreadCount}
              </span>
            )}
          </button>
        </div>
        {seatError ? (
          <div className='mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-8 text-center text-[13px] font-semibold text-red-500'>
            {seatError}
          </div>
        ) : seatLoading && seats.length === 0 ? (
          <div className='mt-4 rounded-xl border border-border bg-slate-50 px-4 py-8 text-center text-[13px] font-semibold text-slate-400'>
            좌석 현황을 불러오는 중입니다.
          </div>
        ) : seats.length === 0 ? (
          <div className='mt-4 rounded-xl border border-border bg-slate-50 px-4 py-8 text-center text-[13px] font-semibold text-slate-400'>
            등록된 좌석이 없습니다.
          </div>
        ) : (
          <SeatMap
            seats={seats}
            selectedSeat={selectedSeat}
            onSelect={onSelectSeat}
            onOpenChat={onOpenSeatChat}
            currentMemberId={currentMemberId}
            readingRoomId={currentRoom?.readingRoomId}
            roomName={currentRoom?.roomName}
          />
        )}
      </div>

      {selectedSeat && (
        <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md'>
          <div>
            <div className='text-[11px] font-semibold text-primary'>
              선택한 좌석
            </div>
            <div className='mt-0.5 text-[14px] font-bold text-slate-900'>
              {currentRoom?.roomName} · {selectedSeat.seatNumber}번 ·{' '}
              {selectedTimeLabel}
            </div>
            <div className='mt-1 text-[12px] font-semibold text-slate-500'>
              총 {selectedDurationHours}시간
            </div>
          </div>
          <button
            disabled={reservationLoading}
            onClick={onReserveSeat}
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
            {reservationLoading ? '예약 중' : '좌석 예약하기'}
          </button>
        </div>
      )}
    </div>
  );
}
