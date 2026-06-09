import type { RoomAvailability } from '@/lib/reservationApi';

export const RESERVATION_DAY_COUNT = 5;
export const SLOT_HOURS = 2;
export const MAX_SELECTED_SLOT_COUNT = 3;
export const DEFAULT_SLOT_INDEX = 3;

export const TIME_SLOTS = Array.from({ length: 8 }, (_, index) => {
  const startHour = 8 + index * SLOT_HOURS;

  return {
    startHour,
    endHour: startHour + SLOT_HOURS,
  };
});

export type TimeSlot = (typeof TIME_SLOTS)[number];

export type SelectedRoomSlot = {
  room: RoomAvailability;
  startIndex: number;
  endIndex: number;
  anchorIndex: number;
};

export const ACTIVE_RESERVATION_STATUS = ['RESERVED', 'USING'];

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  RESERVED: '예약됨',
  USING: '이용중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};
