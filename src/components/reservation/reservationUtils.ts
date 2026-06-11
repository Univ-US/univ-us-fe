import type {
  ReadingSeatAvailability,
  ReservationDateOption,
  RoomAvailability,
  RoomReservationSlot,
} from '@/lib/reservationApi';
import {
  ACTIVE_RESERVATION_STATUS,
  DEFAULT_SLOT_INDEX,
  RESERVATION_STATUS_LABELS,
  TIME_SLOTS,
  type SelectedRoomSlot,
  type TimeSlot,
} from './reservationConstants';

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatIsoTime(dateTime: string) {
  return dateTime.split('T')[1]?.slice(0, 5) ?? '';
}

export function formatRoomType(roomType: string) {
  if (roomType === 'MEETING_ROOM') {
    return '회의실';
  }

  if (roomType === 'STUDY_ROOM') {
    return '스터디룸';
  }

  if (roomType === 'CLASSROOM') {
    return '강의실';
  }

  return roomType;
}

export function formatRoomSlotLabel(slot: RoomReservationSlot) {
  return `${formatIsoTime(slot.startTime)}-${formatIsoTime(slot.endTime)}`;
}

export function normalizeSlotRange(startIndex: number, endIndex: number) {
  return {
    startIndex: Math.min(startIndex, endIndex),
    endIndex: Math.max(startIndex, endIndex),
  };
}

export function canSelectRoomSlotRange(
  room: RoomAvailability,
  startIndex: number,
  endIndex: number,
) {
  const range = normalizeSlotRange(startIndex, endIndex);

  return room.slots
    .slice(range.startIndex, range.endIndex + 1)
    .every((slot) => slot.available);
}

export function getSelectedRoomSlots(selection: SelectedRoomSlot | null) {
  if (!selection) {
    return [];
  }

  return selection.room.slots.slice(
    selection.startIndex,
    selection.endIndex + 1,
  );
}

export function isRoomSlotSelected(
  selection: SelectedRoomSlot | null,
  roomId: number,
  slotIndex: number,
) {
  return Boolean(
    selection
      && selection.room.roomId === roomId
      && slotIndex >= selection.startIndex
      && slotIndex <= selection.endIndex,
  );
}

export function formatReservationPeriod(startTime: string, endTime: string) {
  const [startDate, startClock = ''] = startTime.split('T');
  const [endDate, endClock = ''] = endTime.split('T');
  const startDateLabel = startDate.split('-').join('.');
  const endDateLabel =
    endDate && endDate !== startDate ? `${endDate.split('-').join('.')} ` : '';

  return `${startDateLabel} ${startClock.slice(0, 5)} ~ ${endDateLabel}${endClock.slice(0, 5)}`;
}

export function getReservationStatusLabel(status: string) {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

export function getReservationStatusClassName(status: string) {
  if (status === 'CANCELLED') {
    return 'bg-slate-100 text-slate-400';
  }

  if (status === 'COMPLETED') {
    return 'bg-slate-100 text-slate-500';
  }

  if (status === 'USING') {
    return 'bg-primary/10 text-primary';
  }

  return 'bg-blue-50 text-blue-500';
}

export function isCancelableReservation(status: string) {
  return ACTIVE_RESERVATION_STATUS.includes(status);
}

export function formatReservationDateRangeLabel(days: ReservationDateOption[]) {
  if (days.length === 0) {
    return '';
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  if (firstDay.year === lastDay.year && firstDay.month === lastDay.month) {
    return `${firstDay.year} · ${firstDay.month}월`;
  }

  return `${firstDay.year} · ${firstDay.month}월 - ${lastDay.month}월`;
}

export function toReservationDateTime(day: ReservationDateOption, hour: number) {
  if (hour >= 24) {
    const [y, m, d] = day.date.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const nextDateStr = nextDate.toISOString().slice(0, 10);
    return `${nextDateStr}T00:00:00`;
  }

  return `${day.date}T${String(hour).padStart(2, '0')}:00:00`;
}

export function isTimeSlotClosed(
  day: ReservationDateOption | null,
  slot: TimeSlot,
  serverNow: string,
) {
  if (!day || !serverNow) {
    return true;
  }

  return toReservationDateTime(day, slot.endHour) <= serverNow;
}

export function findFirstOpenSlotIndex(
  day: ReservationDateOption | null,
  serverNow: string,
) {
  const slotIndex = TIME_SLOTS.findIndex(
    (slot) => !isTimeSlotClosed(day, slot, serverNow),
  );

  return slotIndex >= 0 ? slotIndex : DEFAULT_SLOT_INDEX;
}

export function isContinuousSlotSelection(slotIndexes: number[]) {
  return slotIndexes.every(
    (slotIndex, index) => index === 0 || slotIndex === slotIndexes[index - 1] + 1,
  );
}

export function sortSeats(seats: ReadingSeatAvailability[]) {
  return [...seats].sort((a, b) => {
    const aNumber = Number(a.seatNumber);
    const bNumber = Number(b.seatNumber);

    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
      return a.seatNumber.localeCompare(b.seatNumber);
    }

    return aNumber - bNumber;
  });
}
