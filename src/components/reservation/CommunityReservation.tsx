'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import { BookOpen, Monitor } from 'lucide-react';

import {
  cancelRoomReservation,
  cancelReadingSeatReservation,
  getMyReadingSeatReservations,
  getMyRoomReservations,
  getReadingRoomAvailability,
  getReadingSeatAvailability,
  getReservationDateOptions,
  getRoomAvailability,
  reserveReadingSeat,
  reserveRoom,
  type ReadingRoomAvailability,
  type ReadingSeatAvailability,
  type ReadingSeatReservation,
  type ReservationDateOption,
  type RoomAvailability,
  type RoomReservation,
} from '@/lib/reservationApi';
import { getApiErrorMessage, isApiErrorStatus } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import RoomCancelModal from './room/RoomCancelModal';
import RoomReservationModal from './room/RoomReservationModal';
import RoomReservationSection from './room/RoomReservationSection';
import SeatCancelModal from './seat/SeatCancelModal';
import SeatReservationModal from './seat/SeatReservationModal';
import SeatReservationSection from './seat/SeatReservationSection';
import {
  useReservationRealtimeStatus,
  type ReadingSeatRealtimeEvent,
} from './useReservationRealtimeStatus';
import {
  DEFAULT_SLOT_INDEX,
  MAX_SELECTED_SLOT_COUNT,
  RESERVATION_DAY_COUNT,
  SLOT_HOURS,
  TIME_SLOTS,
  type SelectedRoomSlot,
} from './reservationConstants';
import {
  canSelectRoomSlotRange,
  findFirstOpenSlotIndex,
  formatHour,
  formatReservationDateRangeLabel,
  getSelectedRoomSlots,
  isContinuousSlotSelection,
  isTimeSlotClosed,
  normalizeSlotRange,
  toReservationDateTime,
} from './reservationUtils';

function isOverlappingRealtimeEvent(
  event: ReadingSeatRealtimeEvent,
  startTime: string,
  endTime: string,
) {
  return !!event.startTime
    && !!event.endTime
    && !!startTime
    && !!endTime
    && event.startTime < endTime
    && event.endTime > startTime;
}

export default function CommunityReservation() {
  const currentMemberId = useAuthStore((state) => state.memberId);
  const [tab, setTab] = useState<'seat' | 'room'>('seat');
  const [selDay, setSelDay] = useState(0);
  const [reservationDays, setReservationDays] = useState<ReservationDateOption[]>([]);
  const [serverNow, setServerNow] = useState('');
  const [selectedSlotIndexes, setSelectedSlotIndexes] = useState<number[]>([
    DEFAULT_SLOT_INDEX,
  ]);
  const [rooms, setRooms] = useState<ReadingRoomAvailability[]>([]);
  const [seats, setSeats] = useState<ReadingSeatAvailability[]>([]);
  const [selRoomId, setSelRoomId] = useState<number | null>(null);
  const [selSeat, setSelSeat] = useState<ReadingSeatAvailability | null>(null);
  const [selSlot, setSelSlot] = useState<SelectedRoomSlot | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const [roomAvailabilities, setRoomAvailabilities] = useState<RoomAvailability[]>([]);
  const [roomAvailabilityLoading, setRoomAvailabilityLoading] = useState(false);
  const [roomAvailabilityError, setRoomAvailabilityError] = useState('');
  const [roomReservationLoading, setRoomReservationLoading] = useState(false);
  const [roomDragAnchor, setRoomDragAnchor] = useState<{
    roomId: number;
    slotIndex: number;
  } | null>(null);
  const [myReservations, setMyReservations] = useState<ReadingSeatReservation[]>([]);
  const [myReservationsLoading, setMyReservationsLoading] = useState(true);
  const [myReservationError, setMyReservationError] = useState('');
  const [myRoomReservations, setMyRoomReservations] = useState<RoomReservation[]>([]);
  const [myRoomReservationsLoading, setMyRoomReservationsLoading] = useState(true);
  const [myRoomReservationError, setMyRoomReservationError] = useState('');
  const [cancelingReservationId, setCancelingReservationId] = useState<
    number | null
  >(null);
  const [cancelingRoomReservationId, setCancelingRoomReservationId] = useState<
    number | null
  >(null);
  const [roomReservationModalOpen, setRoomReservationModalOpen] = useState(false);
  const [roomReservationPurpose, setRoomReservationPurpose] = useState('');
  const [roomReservationError, setRoomReservationError] = useState('');
  const [seatReservationModalOpen, setSeatReservationModalOpen] = useState(false);
  const [seatReservationError, setSeatReservationError] = useState('');
  const [cancelReservationTarget, setCancelReservationTarget] =
    useState<ReadingSeatReservation | null>(null);
  const [cancelReservationError, setCancelReservationError] = useState('');
  const [cancelRoomReservationTarget, setCancelRoomReservationTarget] =
    useState<RoomReservation | null>(null);
  const [cancelRoomReservationError, setCancelRoomReservationError] = useState('');

  const selectedDay = reservationDays[selDay] ?? null;
  const reservationDateRangeLabel = useMemo(
    () => formatReservationDateRangeLabel(reservationDays),
    [reservationDays],
  );
  const selectedSlots = useMemo(
    () => selectedSlotIndexes.map((slotIndex) => TIME_SLOTS[slotIndex]),
    [selectedSlotIndexes],
  );
  const selectedStartHour = selectedSlots[0].startHour;
  const selectedEndHour = selectedSlots[selectedSlots.length - 1].endHour;
  const selectedDurationHours = selectedSlotIndexes.length * SLOT_HOURS;
  const startTime = useMemo(
    () =>
      selectedDay
        ? toReservationDateTime(selectedDay, selectedStartHour)
        : '',
    [selectedDay, selectedStartHour],
  );
  const endTime = useMemo(
    () =>
      selectedDay
        ? toReservationDateTime(selectedDay, selectedEndHour)
        : '',
    [selectedDay, selectedEndHour],
  );
  const totalFree = rooms.reduce(
    (total, room) => total + room.availableSeatCount,
    0,
  );
  const availableRoomCount = roomAvailabilities.filter((room) =>
    room.slots.some((slot) => slot.available)
  ).length;
  const currentRoom = rooms.find((room) => room.readingRoomId === selRoomId);
  const selectedDateLabel = selectedDay?.today
    ? '오늘'
    : selectedDay
      ? `${selectedDay.month}월 ${selectedDay.day}일`
      : '';
  const selectedTimeLabel = `${selectedDateLabel} ${formatHour(selectedStartHour)} ~ ${formatHour(selectedEndHour)}`;
  const selectedRoomSlots = useMemo(() => getSelectedRoomSlots(selSlot), [selSlot]);
  const selectedRoomStartTime = selectedRoomSlots[0]?.startTime ?? '';
  const selectedRoomEndTime =
    selectedRoomSlots[selectedRoomSlots.length - 1]?.endTime ?? '';

  const loadMyReservations = useCallback(async () => {
    setMyReservationsLoading(true);
    setMyReservationError('');

    try {
      const data = await getMyReadingSeatReservations();
      setMyReservations(data);
    } catch (error) {
      console.error(error);
      setMyReservations([]);
      setMyReservationError('로그인 후 내 예약을 확인할 수 있습니다.');
    } finally {
      setMyReservationsLoading(false);
    }
  }, []);

  const loadMyRoomReservations = useCallback(async () => {
    setMyRoomReservationsLoading(true);
    setMyRoomReservationError('');

    try {
      const data = await getMyRoomReservations();
      setMyRoomReservations(data);
    } catch (error) {
      console.error(error);
      setMyRoomReservations([]);
      setMyRoomReservationError('로그인 후 내 예약 현황을 확인할 수 있습니다.');
    } finally {
      setMyRoomReservationsLoading(false);
    }
  }, []);

  const refreshSelectedSeatAvailability = useCallback(async () => {
    if (!startTime || !endTime) {
      return;
    }

    const roomData = await getReadingRoomAvailability(startTime, endTime);
    const nextRoomId =
      selRoomId && roomData.some((room) => room.readingRoomId === selRoomId)
        ? selRoomId
        : roomData[0]?.readingRoomId ?? null;

    setRooms(roomData);
    setSelRoomId(nextRoomId);

    if (!nextRoomId) {
      setSeats([]);
      return;
    }

    const seatData = await getReadingSeatAvailability(
      nextRoomId,
      startTime,
      endTime,
    );
    setSeats(seatData);
  }, [endTime, selRoomId, startTime]);

  const refreshRoomAvailability = useCallback(async () => {
    if (!selectedDay) {
      return;
    }

    const data = await getRoomAvailability(selectedDay.date);
    setRoomAvailabilities(data);
  }, [selectedDay]);

  const handleSeatRealtimeEvent = useCallback((event: ReadingSeatRealtimeEvent) => {
    if (!isOverlappingRealtimeEvent(event, startTime, endTime)) {
      return;
    }

    void Promise.allSettled([
      refreshSelectedSeatAvailability().then(() => {
        if (selSeat?.seatId === event.seatId) {
          setSelSeat(null);
        }
      }),
      event.memberId === currentMemberId
        ? loadMyReservations()
        : Promise.resolve(),
    ]);
  }, [
    currentMemberId,
    endTime,
    loadMyReservations,
    refreshSelectedSeatAvailability,
    selSeat?.seatId,
    startTime,
  ]);

  const realtimeStatus = useReservationRealtimeStatus({
    onSeatEvent: handleSeatRealtimeEvent,
  });
  const isRealtimeConnected = realtimeStatus === 'connected';

  useEffect(() => {
    let mounted = true;

    async function loadInitialMyReservations() {
      try {
        const data = await getMyReadingSeatReservations();
        if (!mounted) return;

        setMyReservations(data);
        setMyReservationError('');
      } catch (error) {
        console.error(error);
        if (mounted) {
          setMyReservations([]);
          setMyReservationError('로그인 후 내 예약을 확인할 수 있습니다.');
        }
      } finally {
        if (mounted) {
          setMyReservationsLoading(false);
        }
      }
    }

    loadInitialMyReservations();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadInitialMyRoomReservations() {
      try {
        const data = await getMyRoomReservations();
        if (!mounted) return;

        setMyRoomReservations(data);
        setMyRoomReservationError('');
      } catch (error) {
        console.error(error);
        if (mounted) {
          setMyRoomReservations([]);
          setMyRoomReservationError('로그인 후 내 예약 현황을 확인할 수 있습니다.');
        }
      } finally {
        if (mounted) {
          setMyRoomReservationsLoading(false);
        }
      }
    }

    loadInitialMyRoomReservations();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDay) {
      return;
    }

    let mounted = true;

    async function loadRooms() {
      setRoomAvailabilityLoading(true);
      setRoomAvailabilityError('');

      try {
        const data = await getRoomAvailability(selectedDay.date);
        if (!mounted) return;

        setRoomAvailabilities(data);
        setSelSlot(null);
      } catch (error) {
        console.error(error);
        if (mounted) {
          setRoomAvailabilityError('공간 예약 현황을 불러오지 못했습니다.');
          setRoomAvailabilities([]);
        }
      } finally {
        if (mounted) {
          setRoomAvailabilityLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      mounted = false;
    };
  }, [selectedDay]);

  useEffect(() => {
    if (!roomDragAnchor) {
      return;
    }

    function handleMouseUp() {
      setRoomDragAnchor(null);
    }

    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [roomDragAnchor]);

  useEffect(() => {
    let mounted = true;

    async function loadReservationDays() {
      try {
        const data = await getReservationDateOptions(RESERVATION_DAY_COUNT);
        if (!mounted) return;

        setServerNow(data.serverNow);
        setReservationDays(data.dates);
        setSelDay(0);
        setSelectedSlotIndexes([
          findFirstOpenSlotIndex(data.dates[0] ?? null, data.serverNow),
        ]);
      } catch (error) {
        console.error(error);
        if (mounted) {
          setSeatError('예약 날짜를 불러오지 못했습니다.');
        }
      }
    }

    loadReservationDays();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!startTime || !endTime) {
      return;
    }

    let mounted = true;

    async function loadRooms() {
      setSeatLoading(true);
      setSeatError('');

      try {
        const data = await getReadingRoomAvailability(startTime, endTime);
        if (!mounted) return;

        setRooms(data);
        if (data.length === 0) {
          setSeats([]);
          setSelSeat(null);
        }
        setSelRoomId((current) => {
          if (current && data.some((room) => room.readingRoomId === current)) {
            return current;
          }

          return data[0]?.readingRoomId ?? null;
        });
      } catch (error) {
        console.error(error);
        if (mounted) {
          setSeatError('좌석 현황을 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) {
          setSeatLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      mounted = false;
    };
  }, [startTime, endTime]);

  useEffect(() => {
    if (!selRoomId || !startTime || !endTime) {
      return;
    }

    const readingRoomId = selRoomId;
    let mounted = true;

    async function loadSeats() {
      setSeatLoading(true);
      setSeatError('');

      try {
        const data = await getReadingSeatAvailability(
          readingRoomId,
          startTime,
          endTime,
        );
        if (mounted) {
          setSeats(data);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setSeatError('좌석 배치도를 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) {
          setSeatLoading(false);
        }
      }
    }

    loadSeats();

    return () => {
      mounted = false;
    };
  }, [selRoomId, startTime, endTime]);

  function handleDaySelect(day: ReservationDateOption, dayIndex: number) {
    setSelDay(dayIndex);
    if (selectedSlotIndexes.some((slotIndex) =>
      isTimeSlotClosed(day, TIME_SLOTS[slotIndex], serverNow)
    )) {
      setSelectedSlotIndexes([
        findFirstOpenSlotIndex(day, serverNow),
      ]);
    }
    setSelSeat(null);
    setSelSlot(null);
  }

  function handleSelectReadingRoom(roomId: number) {
    setSelRoomId(roomId);
    setSelSeat(null);
  }

  function handleTimeSlotClick(slotIndex: number) {
    if (isTimeSlotClosed(selectedDay, TIME_SLOTS[slotIndex], serverNow)) {
      return;
    }

    setSelectedSlotIndexes((current) => {
      const isSelected = current.includes(slotIndex);

      if (isSelected) {
        if (current.length === 1) {
          return current;
        }

        const next = current.filter((currentSlotIndex) => currentSlotIndex !== slotIndex);
        return isContinuousSlotSelection(next) ? next : [slotIndex];
      }

      const next = [...current, slotIndex].sort((a, b) => a - b);
      if (next.some((currentSlotIndex) =>
        isTimeSlotClosed(selectedDay, TIME_SLOTS[currentSlotIndex], serverNow)
      )) {
        return [slotIndex];
      }

      if (!isContinuousSlotSelection(next)) {
        return [slotIndex];
      }

      if (next.length <= MAX_SELECTED_SLOT_COUNT) {
        return next;
      }

      const isAfterCurrentRange = slotIndex > current[current.length - 1];
      return isAfterCurrentRange
        ? next.slice(next.length - MAX_SELECTED_SLOT_COUNT)
        : next.slice(0, MAX_SELECTED_SLOT_COUNT);
    });
    setSelSeat(null);
  }

  function handleOpenSeatReservationModal() {
    if (!selSeat) {
      return;
    }

    setSeatReservationError('');
    setSeatReservationModalOpen(true);
  }

  async function handleReserveSeat() {
    if (!selSeat) return;

    setReservationLoading(true);
    setSeatReservationError('');

    try {
      await reserveReadingSeat({
        seatId: selSeat.seatId,
        startTime,
        endTime,
      });
      setSelSeat(null);

      await Promise.all([
        refreshSelectedSeatAvailability().catch(console.error),
        loadMyReservations(),
      ]);

      setSeatReservationModalOpen(false);
      setSeatReservationError('');
    } catch (error) {
      console.error(error);
      const message = getApiErrorMessage(
        error,
        '예약 요청에 실패했습니다. 로그인 상태와 좌석 상태를 확인해주세요.',
      );

      if (isApiErrorStatus(error, 409)) {
        await Promise.allSettled([
          refreshSelectedSeatAvailability(),
          loadMyReservations(),
        ]);
      }

      setSeatReservationError(message);
    } finally {
      setReservationLoading(false);
    }
  }

  function handleOpenCancelReservationModal(reservationId: number) {
    const reservation = myReservations.find(
      (item) => item.reservationId === reservationId,
    );

    if (!reservation) {
      return;
    }

    setCancelReservationTarget(reservation);
    setCancelReservationError('');
  }

  async function handleCancelReservation() {
    if (!cancelReservationTarget) return;

    setCancelingReservationId(cancelReservationTarget.reservationId);
    setCancelReservationError('');

    try {
      await cancelReadingSeatReservation(cancelReservationTarget.reservationId);
      await Promise.all([
        loadMyReservations(),
        refreshSelectedSeatAvailability().catch(console.error),
      ]);
      setCancelReservationTarget(null);
      setCancelReservationError('');
    } catch (error) {
      console.error(error);
      const message = getApiErrorMessage(
        error,
        '예약 취소에 실패했습니다. 예약 상태를 확인해주세요.',
      );

      await Promise.allSettled([
        loadMyReservations(),
        refreshSelectedSeatAvailability(),
      ]);

      setCancelReservationError(message);
    } finally {
      setCancelingReservationId(null);
    }
  }

  function updateRoomSlotSelection(
    room: RoomAvailability,
    anchorIndex: number,
    targetIndex: number,
  ) {
    if (!canSelectRoomSlotRange(room, anchorIndex, targetIndex)) {
      return;
    }

    const range = normalizeSlotRange(anchorIndex, targetIndex);
    setSelSlot({
      room,
      startIndex: range.startIndex,
      endIndex: range.endIndex,
      anchorIndex,
    });
  }

  function handleRoomSlotMouseDown(
    event: MouseEvent<HTMLButtonElement>,
    room: RoomAvailability,
    slotIndex: number,
  ) {
    event.preventDefault();

    const slot = room.slots[slotIndex];
    if (!slot?.available) {
      return;
    }

    const anchorIndex =
      selSlot?.room.roomId === room.roomId
        ? selSlot.anchorIndex
        : slotIndex;

    if (!canSelectRoomSlotRange(room, anchorIndex, slotIndex)) {
      setRoomDragAnchor({ roomId: room.roomId, slotIndex });
      updateRoomSlotSelection(room, slotIndex, slotIndex);
      return;
    }

    setRoomDragAnchor({ roomId: room.roomId, slotIndex: anchorIndex });
    updateRoomSlotSelection(room, anchorIndex, slotIndex);
  }

  function handleRoomSlotMouseEnter(room: RoomAvailability, slotIndex: number) {
    if (!roomDragAnchor || roomDragAnchor.roomId !== room.roomId) {
      return;
    }

    updateRoomSlotSelection(room, roomDragAnchor.slotIndex, slotIndex);
  }

  function handleOpenRoomReservationModal() {
    if (!selSlot || !selectedRoomStartTime || !selectedRoomEndTime) {
      return;
    }

    setRoomReservationPurpose('');
    setRoomReservationError('');
    setRoomReservationModalOpen(true);
  }

  async function handleReserveRoom() {
    if (!selSlot || !selectedRoomStartTime || !selectedRoomEndTime) return;

    setRoomReservationLoading(true);
    setRoomReservationError('');

    try {
      await reserveRoom({
        roomId: selSlot.room.roomId,
        startTime: selectedRoomStartTime,
        endTime: selectedRoomEndTime,
        purpose: roomReservationPurpose.trim() || undefined,
      });

      setSelSlot(null);
      setRoomReservationModalOpen(false);
      setRoomReservationPurpose('');
      await Promise.all([
        refreshRoomAvailability(),
        loadMyRoomReservations(),
      ]);
    } catch (error) {
      console.error(error);
      setRoomReservationError(
        '공간 예약 요청에 실패했습니다. 로그인 상태와 공간 상태를 확인해주세요.',
      );
    } finally {
      setRoomReservationLoading(false);
    }
  }

  function handleOpenCancelRoomReservationModal(reservation: RoomReservation) {
    setCancelRoomReservationTarget(reservation);
    setCancelRoomReservationError('');
  }

  async function handleCancelRoomReservation() {
    if (!cancelRoomReservationTarget) return;

    setCancelingRoomReservationId(cancelRoomReservationTarget.reservationId);
    setCancelRoomReservationError('');

    try {
      await cancelRoomReservation(cancelRoomReservationTarget.reservationId);
      await Promise.all([
        loadMyRoomReservations(),
        refreshRoomAvailability(),
      ]);
      setCancelRoomReservationTarget(null);
    } catch (error) {
      console.error(error);
      setCancelRoomReservationError(
        '공간 예약 취소에 실패했습니다. 예약 상태를 확인해주세요.',
      );
    } finally {
      setCancelingRoomReservationId(null);
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 px-[30px] py-6'>
      <div className='mx-auto max-w-[1140px]'>
        <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h1 className='text-[22px] font-extrabold tracking-tight text-slate-900'>
              시설 이용
            </h1>
            <p className='mt-1.5 text-[13px] text-slate-400'>
              실시간 좌석·공간 현황을 확인하고 바로 예약하세요.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span
              className='flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold'
              style={{
                background: isRealtimeConnected
                  ? 'var(--brand-soft)'
                  : '#F1F5F9',
                color: isRealtimeConnected ? 'var(--brand)' : '#94A3B8',
              }}
            >
              <span
                className={cn(
                  'size-[7px] rounded-full',
                  isRealtimeConnected && 'animate-pulse',
                )}
                style={{
                  background: isRealtimeConnected ? 'var(--brand)' : '#CBD5E1',
                  boxShadow: isRealtimeConnected
                    ? '0 0 0 3px rgba(15,168,150,.18)'
                    : 'none',
                }}
              />
              {isRealtimeConnected ? '실시간' : '네트워크 연결안됨'}
            </span>
            <span className='rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600'>
              빈 좌석 <b className='text-slate-900'>{totalFree}</b> · 예약 가능
              공간 <b className='text-slate-900'>{availableRoomCount}</b>곳
            </span>
          </div>
        </div>

        <div className='mb-5 flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1'>
          <button
            onClick={() => setTab('seat')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
              tab === 'seat'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <BookOpen className='size-3.5' />
            독서실 좌석
          </button>
          <button
            onClick={() => setTab('room')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
              tab === 'room'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Monitor className='size-3.5' />
            강의실 / 스터디룸
          </button>
        </div>

        <div className='mb-5 flex flex-wrap items-center gap-3'>
          <span className='text-[13px] font-bold text-slate-400'>
            {reservationDateRangeLabel}
          </span>
          <div className='flex gap-2'>
            {reservationDays.map((day, index) => (
              <button
                key={day.key}
                onClick={() => handleDaySelect(day, index)}
                className={cn(
                  'flex h-[64px] w-[56px] flex-col items-center justify-center rounded-xl border font-semibold transition-all',
                  selDay === index
                    ? 'border-primary bg-primary text-white shadow-md'
                    : day.sat
                      ? 'border-border bg-white text-blue-500'
                      : day.sun
                        ? 'border-border bg-white text-red-400'
                        : 'border-border bg-white text-slate-700 hover:border-primary',
                )}
              >
                <span className='mb-0.5 text-[11px]'>{day.dayOfWeek}</span>
                <span className='text-[18px] font-extrabold leading-none'>
                  {day.day}
                </span>
                {day.today && (
                  <span
                    className='mt-1 text-[10px] font-bold'
                    style={{
                      color:
                        selDay === index ? 'rgba(255,255,255,0.8)' : 'var(--brand)',
                    }}
                  >
                    오늘
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'seat' && (
          <SeatReservationSection
            selectedDay={selectedDay}
            serverNow={serverNow}
            selectedSlotIndexes={selectedSlotIndexes}
            selectedStartHour={selectedStartHour}
            selectedEndHour={selectedEndHour}
            selectedDurationHours={selectedDurationHours}
            onTimeSlotClick={handleTimeSlotClick}
            reservations={myReservations}
            reservationsLoading={myReservationsLoading}
            reservationError={myReservationError}
            cancelingReservationId={cancelingReservationId}
            onCancelReservation={handleOpenCancelReservationModal}
            onRefreshReservations={loadMyReservations}
            rooms={rooms}
            currentRoom={currentRoom}
            selectedRoomId={selRoomId}
            onSelectRoom={handleSelectReadingRoom}
            seats={seats}
            selectedSeat={selSeat}
            onSelectSeat={setSelSeat}
            seatError={seatError}
            seatLoading={seatLoading}
            reservationLoading={reservationLoading}
            selectedTimeLabel={selectedTimeLabel}
            onReserveSeat={handleOpenSeatReservationModal}
          />
        )}

        {tab === 'room' && (
          <RoomReservationSection
            reservations={myRoomReservations}
            reservationsLoading={myRoomReservationsLoading}
            reservationError={myRoomReservationError}
            cancelingReservationId={cancelingRoomReservationId}
            onCancelReservation={handleOpenCancelRoomReservationModal}
            onRefreshReservations={loadMyRoomReservations}
            availabilityError={roomAvailabilityError}
            availabilityLoading={roomAvailabilityLoading}
            roomAvailabilities={roomAvailabilities}
            selectedSlot={selSlot}
            selectedDateLabel={selectedDateLabel}
            selectedRoomSlots={selectedRoomSlots}
            selectedRoomStartTime={selectedRoomStartTime}
            selectedRoomEndTime={selectedRoomEndTime}
            reservationLoading={roomReservationLoading}
            onRoomSlotMouseDown={handleRoomSlotMouseDown}
            onRoomSlotMouseEnter={handleRoomSlotMouseEnter}
            onRoomSlotMouseUp={() => setRoomDragAnchor(null)}
            onReserveRoom={handleOpenRoomReservationModal}
          />
        )}

        {seatReservationModalOpen && selSeat && (
          <SeatReservationModal
            seat={selSeat}
            roomName={currentRoom?.roomName}
            startTime={startTime}
            endTime={endTime}
            durationHours={selectedDurationHours}
            error={seatReservationError}
            loading={reservationLoading}
            onClose={() => {
              if (reservationLoading) return;
              setSeatReservationModalOpen(false);
              setSeatReservationError('');
            }}
            onSubmit={handleReserveSeat}
          />
        )}

        {cancelReservationTarget && (
          <SeatCancelModal
            reservation={cancelReservationTarget}
            error={cancelReservationError}
            loading={
              cancelingReservationId
                === cancelReservationTarget.reservationId
            }
            onClose={() => {
              if (cancelingReservationId) return;
              setCancelReservationTarget(null);
              setCancelReservationError('');
            }}
            onSubmit={handleCancelReservation}
          />
        )}

        {roomReservationModalOpen && selSlot && (
          <RoomReservationModal
            selectedSlot={selSlot}
            startTime={selectedRoomStartTime}
            endTime={selectedRoomEndTime}
            durationHours={selectedRoomSlots.length * SLOT_HOURS}
            purpose={roomReservationPurpose}
            error={roomReservationError}
            loading={roomReservationLoading}
            onPurposeChange={setRoomReservationPurpose}
            onClose={() => {
              if (roomReservationLoading) return;
              setRoomReservationModalOpen(false);
              setRoomReservationError('');
            }}
            onSubmit={handleReserveRoom}
          />
        )}

        {cancelRoomReservationTarget && (
          <RoomCancelModal
            reservation={cancelRoomReservationTarget}
            error={cancelRoomReservationError}
            loading={
              cancelingRoomReservationId
                === cancelRoomReservationTarget.reservationId
            }
            onClose={() => {
              if (cancelingRoomReservationId) return;
              setCancelRoomReservationTarget(null);
              setCancelRoomReservationError('');
            }}
            onSubmit={handleCancelRoomReservation}
          />
        )}
      </div>
    </div>
  );
}
