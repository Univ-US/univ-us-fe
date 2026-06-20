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
  checkInRoomReservation,
  checkInReadingSeatReservation,
  extendReadingSeatReservation,
  getMyReadingSeatReservations,
  getMyRoomReservations,
  getReservationPenaltyStatus,
  getReadingRoomAvailability,
  getReadingSeatAvailability,
  getReservationDateOptions,
  getRoomAvailability,
  pledgeReservationPenalty,
  reserveReadingSeat,
  reserveRoom,
  type ReadingRoomAvailability,
  type ReadingSeatAvailability,
  type ReadingSeatReservation,
  type ReservationDateOption,
  type ReservationPenaltyStatus,
  type RoomAvailability,
  type RoomReservation,
} from '@/lib/reservationApi';
import { getApiErrorMessage, isApiErrorStatus } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSeatChatNotificationStore } from '@/store/reservation/seatChatNotificationStore';
import RoomCancelModal from './room/RoomCancelModal';
import RoomReservationModal from './room/RoomReservationModal';
import RoomReservationSection from './room/RoomReservationSection';
import ReservationPenaltyHistoryModal from './ReservationPenaltyHistoryModal';
import ReservationPenaltyPledgeModal from './ReservationPenaltyPledgeModal';
import SeatChatDrawer from './seat/SeatChatDrawer';
import SeatCancelModal from './seat/SeatCancelModal';
import SeatReservationModal from './seat/SeatReservationModal';
import SeatReservationSection from './seat/SeatReservationSection';
import {
  useReservationRealtimeStatus,
  type ReadingSeatRealtimeEvent,
  type RoomReservationRealtimeEvent,
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

function isRoomRealtimeEventForDate(
  event: RoomReservationRealtimeEvent,
  date: string,
) {
  return !!event.startTime && event.startTime.slice(0, 10) === date;
}

type ReservationToast = {
  message: string;
  type: 'success' | 'error';
} | null;

const RESERVATION_HISTORY_PAGE_SIZE = 9;

const S = {
  pageContainer: 'min-h-screen bg-slate-50 px-[30px] py-6',
  contentWrapper: 'mx-auto max-w-[1140px]',
  toast: 'fixed right-6 top-6 z-[80] max-w-[360px] rounded-xl border px-4 py-3 text-[13px] font-bold shadow-lg',
  toastSuccess: 'border-primary/20 bg-white text-primary',
  toastError: 'border-red-100 bg-white text-red-500',
  headerGroup: 'mb-6 flex flex-wrap items-end justify-between gap-4',
  title: 'text-[22px] font-extrabold tracking-tight text-slate-900',
  subtitle: 'mt-1.5 text-[13px] text-slate-400',
  statusGroup: 'flex items-center gap-2',
  realtimeBadge: 'flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm',
  realtimeDot: 'size-[7px] rounded-full',
  summaryBadge: 'rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm',
  tabContainer: 'mb-5 flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1',
  tabBtnBase: 'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
  tabBtnActive: 'scale-[1.03] bg-white text-primary shadow-sm',
  tabBtnInactive: 'text-slate-500 hover:bg-white/70 hover:text-slate-700',
  tabIcon: 'size-3.5',
  dateGroup: 'mb-5 flex flex-wrap items-center gap-3',
  dateLabel: 'text-[13px] font-bold text-slate-400',
  dateBtnGroup: 'flex gap-2',
  dateBtnBase: 'flex h-[64px] w-[56px] flex-col items-center justify-center rounded-xl border font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
  dateBtnActive: 'scale-[1.04] border-primary bg-primary text-white shadow-md',
  dateBtnSat: 'border-border bg-white text-blue-500',
  dateBtnSun: 'border-border bg-white text-red-400',
  dateBtnDefault: 'border-border bg-white text-slate-700 hover:border-primary',
  dayOfWeek: 'mb-0.5 text-[11px]',
  dayNumber: 'text-[18px] font-extrabold leading-none',
  todayBadge: 'mt-1 text-[10px] font-bold',
};

export default function CommunityReservation() {
  const currentMemberId = useAuthStore((state) => state.memberId);
  const seatChatUnreadCount = useSeatChatNotificationStore(
    (state) => state.totalUnreadCount,
  );
  const seatChatOpenRequested = useSeatChatNotificationStore(
    (state) => state.openRequested,
  );
  const requestedSeatChatRoomId = useSeatChatNotificationStore(
    (state) => state.requestedRoomId,
  );
  const seatChatOpenRequestId = useSeatChatNotificationStore(
    (state) => state.openRequestId,
  );
  const consumeSeatChatOpenRequest = useSeatChatNotificationStore(
    (state) => state.consumeOpenRequest,
  );
  const refreshSeatChatContext = useSeatChatNotificationStore(
    (state) => state.refreshContext,
  );
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
  const [myReservationsPage, setMyReservationsPage] = useState(0);
  const [myReservationsTotalElements, setMyReservationsTotalElements] =
    useState(0);
  const [myReservationsTotalPages, setMyReservationsTotalPages] = useState(0);
  const [myReservationsLoading, setMyReservationsLoading] = useState(true);
  const [myReservationError, setMyReservationError] = useState('');
  const [myRoomReservations, setMyRoomReservations] = useState<RoomReservation[]>([]);
  const [myRoomReservationsPage, setMyRoomReservationsPage] = useState(0);
  const [myRoomReservationsTotalElements, setMyRoomReservationsTotalElements] =
    useState(0);
  const [myRoomReservationsTotalPages, setMyRoomReservationsTotalPages] =
    useState(0);
  const [myRoomReservationsLoading, setMyRoomReservationsLoading] = useState(true);
  const [myRoomReservationError, setMyRoomReservationError] = useState('');
  const [cancelingReservationId, setCancelingReservationId] = useState<
    number | null
  >(null);
  const [cancelingRoomReservationId, setCancelingRoomReservationId] = useState<
    number | null
  >(null);
  const [checkingInReservationId, setCheckingInReservationId] = useState<number | null>(null);
  const [checkingInRoomReservationId, setCheckingInRoomReservationId] =
    useState<number | null>(null);
  const [extendingReservationId, setExtendingReservationId] = useState<number | null>(null);
  const [roomReservationModalOpen, setRoomReservationModalOpen] = useState(false);
  const [roomReservationPurpose, setRoomReservationPurpose] = useState('');
  const [roomReservationError, setRoomReservationError] = useState('');
  const [seatReservationModalOpen, setSeatReservationModalOpen] = useState(false);
  const [seatReservationError, setSeatReservationError] = useState('');
  const [cancelReservationTarget, setCancelReservationTarget] =
    useState<ReadingSeatReservation | null>(null);
  const [cancelReservationError, setCancelReservationError] = useState('');
  const [seatChatOpen, setSeatChatOpen] = useState(false);
  const [seatChatActivationId, setSeatChatActivationId] = useState(0);
  const [seatChatInitialRoomId, setSeatChatInitialRoomId] =
    useState<number | null>(null);
  const [seatChatTargetSeat, setSeatChatTargetSeat] =
    useState<ReadingSeatAvailability | null>(null);
  const [cancelRoomReservationTarget, setCancelRoomReservationTarget] =
    useState<RoomReservation | null>(null);
  const [cancelRoomReservationError, setCancelRoomReservationError] = useState('');
  const [toast, setToast] = useState<ReservationToast>(null);
  const [penaltyStatus, setPenaltyStatus] =
    useState<ReservationPenaltyStatus | null>(null);
  const [penaltyHistoryOpen, setPenaltyHistoryOpen] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [penaltyError, setPenaltyError] = useState('');

  useEffect(() => {
    if (!seatChatOpenRequested) return;

    setTab('seat');
    setSeatChatTargetSeat(null);
    setSeatChatInitialRoomId(requestedSeatChatRoomId);
    setSeatChatOpen(true);
    setSeatChatActivationId((current) => current + 1);
    consumeSeatChatOpenRequest();
  }, [
    consumeSeatChatOpenRequest,
    requestedSeatChatRoomId,
    seatChatOpenRequestId,
    seatChatOpenRequested,
  ]);

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

  const refreshPenaltyStatus = useCallback(async (openIfBlocked = false) => {
    try {
      const status = await getReservationPenaltyStatus();
      setPenaltyStatus(status);
      if (status.blocked && openIfBlocked) {
        setPenaltyError('');
        setPenaltyModalOpen(true);
      }
      return status;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const openPenaltyModalIfBlocked = useCallback(() => {
    if (!penaltyStatus?.blocked) {
      return false;
    }

    setPenaltyError('');
    setPenaltyModalOpen(true);
    setToast({ type: 'error', message: penaltyStatus.message });
    return true;
  }, [penaltyStatus]);

  const loadMyReservations = useCallback(async (page = 0) => {
    setMyReservationsLoading(true);
    setMyReservationError('');

    try {
      const data = await getMyReadingSeatReservations(
        page,
        RESERVATION_HISTORY_PAGE_SIZE,
      );
      setMyReservations(data.content);
      setMyReservationsPage(data.page);
      setMyReservationsTotalElements(data.totalElements);
      setMyReservationsTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
      setMyReservations([]);
      setMyReservationsPage(0);
      setMyReservationsTotalElements(0);
      setMyReservationsTotalPages(0);
      setMyReservationError('로그인 후 내 예약을 확인할 수 있습니다.');
    } finally {
      setMyReservationsLoading(false);
    }
  }, []);

  const loadMyRoomReservations = useCallback(async (page = 0) => {
    setMyRoomReservationsLoading(true);
    setMyRoomReservationError('');

    try {
      const data = await getMyRoomReservations(
        page,
        RESERVATION_HISTORY_PAGE_SIZE,
      );
      setMyRoomReservations(data.content);
      setMyRoomReservationsPage(data.page);
      setMyRoomReservationsTotalElements(data.totalElements);
      setMyRoomReservationsTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
      setMyRoomReservations([]);
      setMyRoomReservationsPage(0);
      setMyRoomReservationsTotalElements(0);
      setMyRoomReservationsTotalPages(0);
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
    ]);
  }, [
    endTime,
    refreshSelectedSeatAvailability,
    selSeat?.seatId,
    startTime,
  ]);

  const handleRoomRealtimeEvent = useCallback((event: RoomReservationRealtimeEvent) => {
    if (!selectedDay || !isRoomRealtimeEventForDate(event, selectedDay.date)) {
      return;
    }

    void Promise.allSettled([
      refreshRoomAvailability().then(() => {
        setSelSlot((current) =>
          current?.room.roomId === event.roomId ? null : current,
        );
      }),
    ]);
  }, [
    refreshRoomAvailability,
    selectedDay,
  ]);

  const realtimeStatus = useReservationRealtimeStatus({
    onSeatEvent: handleSeatRealtimeEvent,
    onRoomEvent: handleRoomRealtimeEvent,
    onMySeatEvent: () => {
      void loadMyReservations();
    },
    onMyRoomEvent: () => {
      void loadMyRoomReservations();
    },
  });
  const isRealtimeConnected = realtimeStatus === 'connected';

  useEffect(() => {
    void refreshPenaltyStatus(true);
  }, [refreshPenaltyStatus]);

  useEffect(() => {
    void loadMyReservations(0);
  }, [loadMyReservations]);

  useEffect(() => {
    void loadMyRoomReservations(0);
  }, [loadMyRoomReservations]);

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
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toast]);

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
    if (openPenaltyModalIfBlocked()) {
      return;
    }

    setSeatReservationError('');
    setSeatReservationModalOpen(true);
  }

  function handleOpenSeatChat(seat: ReadingSeatAvailability | null) {
    setSeatChatTargetSeat(seat);
    setSeatChatInitialRoomId(null);
    setSeatChatOpen(true);
    setSeatChatActivationId((current) => current + 1);
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
        refreshSeatChatContext(),
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
        const status = await refreshPenaltyStatus(true);
        if (status?.blocked) {
          setSeatReservationModalOpen(false);
          setSeatReservationError('');
          setToast({ type: 'error', message: status.message });
          return;
        }

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
        refreshSeatChatContext(),
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

  async function handleCheckInReservation(reservationId: number) {
    setCheckingInReservationId(reservationId);
    try {
      await checkInReadingSeatReservation(reservationId);
      await Promise.all([
        loadMyReservations(),
        refreshSelectedSeatAvailability().catch(console.error),
        refreshSeatChatContext(),
      ]);
      setToast({ type: 'success', message: '입실 처리되었습니다.' });
    } catch (error) {
      console.error(error);
      const message = getApiErrorMessage(error, '입실 처리에 실패했습니다.');
      setToast({ type: 'error', message });
    } finally {
      setCheckingInReservationId(null);
    }
  }

  async function handleExtendReservation(reservationId: number) {
    setExtendingReservationId(reservationId);
    try {
      const res = await extendReadingSeatReservation(reservationId);
      await Promise.all([
        loadMyReservations(),
        refreshSelectedSeatAvailability().catch(console.error),
      ]);
      setToast({
        type: 'success',
        message: res.message || '예약이 연장되었습니다.',
      });
    } catch (error) {
      console.error(error);
      const message = getApiErrorMessage(error, '연장 처리에 실패했습니다.');
      setToast({ type: 'error', message });
    } finally {
      setExtendingReservationId(null);
    }
  }

  async function handleCheckInRoomReservation(reservationId: number) {
    setCheckingInRoomReservationId(reservationId);
    try {
      await checkInRoomReservation(reservationId);
      await Promise.all([
        loadMyRoomReservations(),
        refreshRoomAvailability().catch(console.error),
      ]);
      setToast({ type: 'success', message: '회의실 입실 처리되었습니다.' });
    } catch (error) {
      console.error(error);
      const message = getApiErrorMessage(
        error,
        '회의실 입실 처리에 실패했습니다.',
      );
      await loadMyRoomReservations().catch(console.error);
      setToast({ type: 'error', message });
    } finally {
      setCheckingInRoomReservationId(null);
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
    if (openPenaltyModalIfBlocked()) {
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
      const message = getApiErrorMessage(
        error,
        '공간 예약 요청에 실패했습니다. 로그인 상태와 공간 상태를 확인해주세요.',
      );
      if (isApiErrorStatus(error, 409)) {
        const status = await refreshPenaltyStatus(true);
        if (status?.blocked) {
          setRoomReservationModalOpen(false);
          setRoomReservationError('');
          setToast({ type: 'error', message: status.message });
          return;
        }
      }

      setRoomReservationError(message);
    } finally {
      setRoomReservationLoading(false);
    }
  }

  async function handleSubmitPenaltyPledge(
    pledgeText: string,
    agreed: boolean,
  ) {
    setPenaltyLoading(true);
    setPenaltyError('');

    try {
      const status = await pledgeReservationPenalty(pledgeText, agreed);
      setPenaltyStatus(status);
      setPenaltyModalOpen(false);
      setToast({
        type: 'success',
        message: '서약이 확인되었습니다. 다시 예약할 수 있습니다.',
      });
    } catch (error) {
      console.error(error);
      setPenaltyError(
        getApiErrorMessage(error, '서약 확인에 실패했습니다. 입력 내용을 확인해주세요.'),
      );
    } finally {
      setPenaltyLoading(false);
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
    <div className={S.pageContainer}>
      {toast && (
        <div
          aria-live="polite"
          className={cn(
            S.toast,
            toast.type === 'success' ? S.toastSuccess : S.toastError,
          )}
        >
          {toast.message}
        </div>
      )}
      <div className={S.contentWrapper}>
        <div className={S.headerGroup}>
          <div>
            <h1 className={S.title}>
              시설 이용
            </h1>
            <p className={S.subtitle}>
              실시간 좌석·공간 현황을 확인하고 바로 예약하세요.
            </p>
          </div>
          <div className={S.statusGroup}>
            <span
              className={S.realtimeBadge}
              style={{
                background: isRealtimeConnected
                  ? 'var(--brand-soft)'
                  : '#F1F5F9',
                color: isRealtimeConnected ? 'var(--brand)' : '#94A3B8',
              }}
            >
              <span
                className={cn(
                  S.realtimeDot,
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
            <span className={S.summaryBadge}>
              빈 좌석 <b className='text-slate-900'>{totalFree}</b> · 예약 가능
              공간 <b className='text-slate-900'>{availableRoomCount}</b>곳
            </span>
          </div>
        </div>

        <div className={S.tabContainer}>
          <button
            onClick={() => setTab('seat')}
            className={cn(
              S.tabBtnBase,
              tab === 'seat'
                ? S.tabBtnActive
                : S.tabBtnInactive,
            )}
          >
            <BookOpen className={S.tabIcon} />
            독서실 좌석
          </button>
          <button
            onClick={() => setTab('room')}
            className={cn(
              S.tabBtnBase,
              tab === 'room'
                ? S.tabBtnActive
                : S.tabBtnInactive,
            )}
          >
            <Monitor className={S.tabIcon} />
            강의실 / 스터디룸
          </button>
        </div>

        <div className={S.dateGroup}>
          <span className={S.dateLabel}>
            {reservationDateRangeLabel}
          </span>
          <div className={S.dateBtnGroup}>
            {reservationDays.map((day, index) => (
              <button
                key={day.key}
                onClick={() => handleDaySelect(day, index)}
                className={cn(
                  S.dateBtnBase,
                  selDay === index
                    ? S.dateBtnActive
                    : day.sat
                      ? S.dateBtnSat
                      : day.sun
                        ? S.dateBtnSun
                        : S.dateBtnDefault,
                )}
              >
                <span className={S.dayOfWeek}>{day.dayOfWeek}</span>
                <span className={S.dayNumber}>
                  {day.day}
                </span>
                {day.today && (
                  <span
                    className={S.todayBadge}
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
            reservationTotalElements={myReservationsTotalElements}
            reservationPage={myReservationsPage}
            reservationTotalPages={myReservationsTotalPages}
            reservationsLoading={myReservationsLoading}
            reservationError={myReservationError}
            cancelingReservationId={cancelingReservationId}
            checkingInReservationId={checkingInReservationId}
            extendingReservationId={extendingReservationId}
            penaltyStatus={penaltyStatus}
            onCancelReservation={handleOpenCancelReservationModal}
            onCheckInReservation={handleCheckInReservation}
            onExtendReservation={handleExtendReservation}
            onOpenPenaltyHistory={() => setPenaltyHistoryOpen(true)}
            onReservationPageChange={loadMyReservations}
            onRefreshReservations={() =>
              loadMyReservations(myReservationsPage)
            }
            rooms={rooms}
            currentRoom={currentRoom}
            selectedRoomId={selRoomId}
            onSelectRoom={handleSelectReadingRoom}
            seats={seats}
            selectedSeat={selSeat}
            onSelectSeat={setSelSeat}
            currentMemberId={currentMemberId}
            onOpenSeatChat={handleOpenSeatChat}
            seatChatUnreadCount={seatChatUnreadCount}
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
            reservationTotalElements={myRoomReservationsTotalElements}
            reservationPage={myRoomReservationsPage}
            reservationTotalPages={myRoomReservationsTotalPages}
            reservationsLoading={myRoomReservationsLoading}
            reservationError={myRoomReservationError}
            cancelingReservationId={cancelingRoomReservationId}
            checkingInReservationId={checkingInRoomReservationId}
            penaltyStatus={penaltyStatus}
            onCancelReservation={handleOpenCancelRoomReservationModal}
            onCheckInReservation={handleCheckInRoomReservation}
            onOpenPenaltyHistory={() => setPenaltyHistoryOpen(true)}
            onReservationPageChange={loadMyRoomReservations}
            onRefreshReservations={() =>
              loadMyRoomReservations(myRoomReservationsPage)
            }
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

        <SeatChatDrawer
          open={seatChatOpen}
          targetSeat={seatChatTargetSeat}
          initialRoomId={seatChatInitialRoomId}
          activationId={seatChatActivationId}
          onClose={() => {
            setSeatChatOpen(false);
            setSeatChatTargetSeat(null);
            setSeatChatInitialRoomId(null);
          }}
        />

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

        {penaltyModalOpen && penaltyStatus?.blocked && (
          <ReservationPenaltyPledgeModal
            status={penaltyStatus}
            loading={penaltyLoading}
            error={penaltyError}
            onClose={() => {
              if (penaltyLoading) return;
              setPenaltyModalOpen(false);
              setPenaltyError('');
            }}
            onSubmit={handleSubmitPenaltyPledge}
          />
        )}

        <ReservationPenaltyHistoryModal
          open={penaltyHistoryOpen}
          onClose={() => setPenaltyHistoryOpen(false)}
        />
      </div>
    </div>
  );
}
