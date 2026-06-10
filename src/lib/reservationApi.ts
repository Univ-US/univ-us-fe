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

export type ReservationDateOptionsResponse = {
  serverNow: string;
  dates: ReservationDateOption[];
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

export type RoomReservationSlot = {
  roomId: number;
  reservationId: number | null;
  reservedMemberId: number | null;
  startTime: string;
  endTime: string;
  status: string | null;
  available: boolean;
};

export type RoomAvailability = {
  roomId: number;
  roomName: string;
  roomType: string;
  floorName: string | null;
  location: string | null;
  capacity: number;
  description: string | null;
  isActive: number;
  createdAt: string;
  slots: RoomReservationSlot[];
};

export type RoomReservationRequest = {
  roomId: number;
  startTime: string;
  endTime: string;
  purpose?: string;
};

export type RoomReservation = {
  reservationId: number;
  memberId: number;
  roomId: number;
  roomName: string | null;
  roomType: string | null;
  capacity: number | null;
  purpose: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string | null;
};

export type ReservationMutationResponse = {
  success: boolean;
  message: string;
};

export type ActiveSeatReservation = {
  reservationId: number;
  memberId: number;
  seatId: number;
  readingRoomId: number;
  roomName: string;
  seatNumber: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type SeatChatRoom = {
  roomId: number;
  myReservationId: number;
  targetReservationId: number;
  targetSeatId: number;
  targetReadingRoomId: number;
  targetRoomName: string;
  targetSeatNumber: string;
  status: string;
  createdAt: string;
  lastMessageText: string | null;
  lastMessageAt: string | null;
};

export type SeatChatMessage = {
  messageId: number;
  roomId: number;
  senderReservationId: number;
  messageText: string;
  isRead: number | null;
  createdAt: string;
};

export type SeatChatContext = {
  activeReservation: ActiveSeatReservation | null;
  rooms: SeatChatRoom[];
};

export async function getReservationDateOptions(days = 5) {
  const res = await api.get<ReservationDateOptionsResponse>(
    '/api/reservations/date-options',
    {
      params: { days },
    },
  );

  return res.data;
}

export async function getSeatChatContext() {
  const res = await api.get<SeatChatContext>(
    '/api/reservations/seat-chats',
  );

  return res.data;
}

export async function createOrGetSeatChatRoom(targetReservationId: number) {
  const res = await api.post<SeatChatRoom>(
    '/api/reservations/seat-chats',
    { targetReservationId },
  );

  return res.data;
}

export async function getSeatChatMessages(roomId: number) {
  const res = await api.get<SeatChatMessage[]>(
    `/api/reservations/seat-chats/${roomId}/messages`,
  );

  return res.data;
}

export async function sendSeatChatMessage(
  roomId: number,
  messageText: string,
) {
  const res = await api.post<SeatChatMessage>(
    `/api/reservations/seat-chats/${roomId}/messages`,
    { messageText },
  );

  return res.data;
}

export async function getMyReadingSeatReservations() {
  const res = await api.get<ReadingSeatReservation[]>(
    '/api/reservations/seats/me',
  );

  return res.data;
}

export async function cancelReadingSeatReservation(reservationId: number) {
  const res = await api.delete<ReservationMutationResponse>(
    `/api/reservations/seats/${reservationId}`,
  );

  return res.data;
}

export async function getRoomAvailability(date: string) {
  const res = await api.get<RoomAvailability[]>(
    '/api/reservations/rooms/availability',
    {
      params: { date },
    },
  );

  return res.data;
}

export async function getMyRoomReservations() {
  const res = await api.get<RoomReservation[]>(
    '/api/reservations/rooms/me',
  );

  return res.data;
}

export async function reserveRoom(request: RoomReservationRequest) {
  const res = await api.post<RoomReservation>(
    '/api/reservations/rooms',
    request,
  );

  return res.data;
}

export async function cancelRoomReservation(reservationId: number) {
  const res = await api.delete<ReservationMutationResponse>(
    `/api/reservations/rooms/${reservationId}`,
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
