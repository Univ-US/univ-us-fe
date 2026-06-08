import api from '@/lib/api';

export type ReservationDateOption = {
  key: string;
  date: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  today: boolean;
  sat: boolean;
  sun: boolean;
};

export type ReadingRoomAvailability = {
  readingRoomId: number;
  roomName: string;
  floorName: string | null;
  description: string | null;
  isActive: number;
  createdAt: string;
  totalSeatCount: number;
  availableSeatCount: number;
  usingSeatCount: number;
  disabledSeatCount: number;
};

export type ReadingSeatAvailability = {
  seatId: number;
  readingRoomId: number;
  roomName: string;
  seatNumber: string;
  zoneName: string | null;
  isUsable: number;
  seatStatus: 'AVAILABLE' | 'USING' | 'UNUSABLE';
  reservationId: number | null;
  reservedMemberId: number | null;
  startTime: string | null;
  endTime: string | null;
};

export type ReadingSeatReservationRequest = {
  seatId: number;
  startTime: string;
  endTime: string;
};

export type ReadingSeatReservation = {
  reservationId: number;
  memberId: number;
  seatId: number;
  readingRoomId: number | null;
  roomName: string | null;
  seatNumber: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string | null;
};

export async function getReservationDateOptions(days = 5) {
  const res = await api.get<ReservationDateOption[]>(
    '/api/reservations/date-options',
    {
      params: { days },
    },
  );

  return res.data;
}

export async function getReadingRoomAvailability(
  startTime: string,
  endTime: string,
) {
  const res = await api.get<ReadingRoomAvailability[]>(
    '/api/reservations/seats/availability',
    {
      params: { startTime, endTime },
    },
  );

  return res.data;
}

export async function getReadingSeatAvailability(
  readingRoomId: number,
  startTime: string,
  endTime: string,
) {
  const res = await api.get<ReadingSeatAvailability[]>(
    `/api/reservations/seats/availability/${readingRoomId}`,
    {
      params: { startTime, endTime },
    },
  );

  return res.data;
}

export async function reserveReadingSeat(
  request: ReadingSeatReservationRequest,
) {
  const res = await api.post<ReadingSeatReservation>(
    '/api/reservations/seats',
    request,
  );

  return res.data;
}
