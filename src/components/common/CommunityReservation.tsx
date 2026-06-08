'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Monitor,
  Check,
  CalendarCheck,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  cancelReadingSeatReservation,
  getReservationDateOptions,
  getMyReadingSeatReservations,
  getReadingRoomAvailability,
  getReadingSeatAvailability,
  reserveReadingSeat,
  type ReadingRoomAvailability,
  type ReadingSeatAvailability,
  type ReadingSeatReservation,
  type ReservationDateOption,
} from '@/lib/reservationApi';
import { cn } from '@/lib/utils';

const LECTURE_ROOMS = [
  { key: 'g201', label: '그룹스터디룸 201', cap: 6 },
  { key: 'g202', label: '그룹스터디룸 202', cap: 8 },
  { key: 'sem', label: '세미나실 A', cap: 12 },
  { key: 'lec', label: '강의실 301', cap: 40 },
];

const SLOTS = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

const BOOKED: Record<string, string[]> = {
  '그룹스터디룸 201': ['10', '11', '15'],
  '그룹스터디룸 202': ['13', '14'],
  '세미나실 A': ['09', '16', '17'],
  '강의실 301': ['11', '12', '13', '18'],
};

const RESERVATION_DAY_COUNT = 5;
const SLOT_HOURS = 2;
const MAX_SELECTED_SLOT_COUNT = 3;
const DEFAULT_SLOT_INDEX = 3;
const TIME_SLOTS = Array.from({ length: 8 }, (_, index) => {
  const startHour = 8 + index * SLOT_HOURS;
  return {
    startHour,
    endHour: startHour + SLOT_HOURS,
  };
});
type TimeSlot = (typeof TIME_SLOTS)[number];
const ACTIVE_RESERVATION_STATUS = ['RESERVED', 'USING'];
const RESERVATION_STATUS_LABELS: Record<string, string> = {
  RESERVED: '예약됨',
  USING: '이용중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatReservationPeriod(startTime: string, endTime: string) {
  const [startDate, startClock = ''] = startTime.split('T');
  const [endDate, endClock = ''] = endTime.split('T');
  const startDateLabel = startDate.split('-').join('.');
  const endDateLabel =
    endDate && endDate !== startDate ? `${endDate.split('-').join('.')} ` : '';

  return `${startDateLabel} ${startClock.slice(0, 5)} ~ ${endDateLabel}${endClock.slice(0, 5)}`;
}

function getReservationStatusLabel(status: string) {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

function getReservationStatusClassName(status: string) {
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

function isCancelableReservation(status: string) {
  return ACTIVE_RESERVATION_STATUS.includes(status);
}

function formatReservationDateRangeLabel(days: ReservationDateOption[]) {
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

function toReservationDateTime(day: ReservationDateOption, hour: number) {
  return `${day.date}T${String(hour).padStart(2, '0')}:00:00`;
}

function isTimeSlotClosed(
  day: ReservationDateOption | null,
  slot: TimeSlot,
  serverNow: string,
) {
  if (!day || !serverNow) {
    return true;
  }

  return toReservationDateTime(day, slot.endHour) <= serverNow;
}

function findFirstOpenSlotIndex(
  day: ReservationDateOption | null,
  serverNow: string,
) {
  const slotIndex = TIME_SLOTS.findIndex(
    (slot) => !isTimeSlotClosed(day, slot, serverNow),
  );

  return slotIndex >= 0 ? slotIndex : DEFAULT_SLOT_INDEX;
}

function isContinuousSlotSelection(slotIndexes: number[]) {
  return slotIndexes.every(
    (slotIndex, index) => index === 0 || slotIndex === slotIndexes[index - 1] + 1,
  );
}

function sortSeats(seats: ReadingSeatAvailability[]) {
  return [...seats].sort((a, b) => {
    const aNumber = Number(a.seatNumber);
    const bNumber = Number(b.seatNumber);

    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
      return a.seatNumber.localeCompare(b.seatNumber);
    }

    return aNumber - bNumber;
  });
}

function Ring({
  free,
  total,
  danger,
}: {
  free: number;
  total: number;
  danger: boolean;
}) {
  const size = 52,
    stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = danger ? '#E04E3A' : '#0FA896';
  const ratio = total > 0 ? free / total : 0;

  return (
    <div className='relative shrink-0' style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke='#EDF1F0'
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset .5s' }}
        />
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center leading-none'>
        <span
          className='text-[15px] font-extrabold'
          style={{ color: danger ? '#E04E3A' : '#141A19' }}
        >
          {free}
        </span>
        <span className='text-[9px] text-slate-400 mt-0.5'>석</span>
      </div>
    </div>
  );
}

function SeatMap({
  seats,
  selectedSeat,
  onSelect,
  readingRoomId,
  roomName,
}: {
  seats: ReadingSeatAvailability[];
  selectedSeat: ReadingSeatAvailability | null;
  onSelect: (seat: ReadingSeatAvailability) => void;
  readingRoomId?: number | null;
  roomName?: string;
}) {
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
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : isSelected
              ? 'bg-primary text-white shadow-md'
              : 'bg-white border border-border text-slate-600 hover:border-primary hover:text-primary',
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
          <span className='size-3 rounded-sm bg-white border border-border' />빈
          좌석
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
      <div className='flex gap-8 justify-center'>
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

function MyReadingSeatReservations({
  reservations,
  loading,
  error,
  cancelingReservationId,
  onCancel,
  onRefresh,
}: {
  reservations: ReadingSeatReservation[];
  loading: boolean;
  error: string;
  cancelingReservationId: number | null;
  onCancel: (reservationId: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className='mb-5 rounded-2xl border border-border bg-white p-5 shadow-sm'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <div className='text-[14px] font-bold text-slate-900'>
            내 좌석 예약
          </div>
          <div className='mt-0.5 text-[12px] font-semibold text-slate-400'>
            {reservations.length > 0 ? `${reservations.length}건` : '예약 없음'}
          </div>
        </div>
        <button
          type='button'
          onClick={onRefresh}
          disabled={loading}
          title='내 예약 새로고침'
          aria-label='내 예약 새로고침'
          className='flex size-9 items-center justify-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-500'>
          {error}
        </div>
      ) : loading && reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 내역을 불러오는 중입니다.
        </div>
      ) : reservations.length === 0 ? (
        <div className='rounded-xl border border-border bg-slate-50 px-4 py-5 text-center text-[13px] font-semibold text-slate-400'>
          예약 내역이 없습니다.
        </div>
      ) : (
        <div className='max-h-[260px] space-y-3 overflow-y-auto pr-1'>
          {reservations.map((reservation) => {
            const isCancelable = isCancelableReservation(reservation.status);
            const isCanceling =
              cancelingReservationId === reservation.reservationId;

            return (
              <div
                key={reservation.reservationId}
                className='grid gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate text-[13px] font-bold text-slate-900'>
                      {reservation.roomName ?? '독서실'}
                    </span>
                    <span className='rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500'>
                      {reservation.seatNumber
                        ? `${reservation.seatNumber}번`
                        : `좌석 ${reservation.seatId}`}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        getReservationStatusClassName(reservation.status),
                      )}
                    >
                      {getReservationStatusLabel(reservation.status)}
                    </span>
                  </div>
                  <div className='mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-500'>
                    <Clock className='size-3.5 shrink-0' />
                    <span className='truncate'>
                      {formatReservationPeriod(
                        reservation.startTime,
                        reservation.endTime,
                      )}
                    </span>
                  </div>
                </div>

                {isCancelable && (
                  <button
                    type='button'
                    onClick={() => onCancel(reservation.reservationId)}
                    disabled={isCanceling}
                    className='flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <Trash2 className='size-3.5' />
                    {isCanceling ? '취소 중' : '취소'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CommunityReservation() {
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
  const [selSlot, setSelSlot] = useState<{ room: string; slot: string } | null>(
    null,
  );
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const [myReservations, setMyReservations] = useState<ReadingSeatReservation[]>([]);
  const [myReservationsLoading, setMyReservationsLoading] = useState(true);
  const [myReservationError, setMyReservationError] = useState('');
  const [cancelingReservationId, setCancelingReservationId] = useState<
    number | null
  >(null);

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
  const currentRoom = rooms.find((room) => room.readingRoomId === selRoomId);
  const selectedDateLabel = selectedDay?.today
    ? '오늘'
    : selectedDay
      ? `${selectedDay.month}월 ${selectedDay.day}일`
      : '';
  const selectedTimeLabel = `${selectedDateLabel} ${formatHour(selectedStartHour)} ~ ${formatHour(selectedEndHour)}`;

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

  async function handleReserveSeat() {
    if (!selSeat) return;

    setReservationLoading(true);

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

      window.alert('좌석 예약이 완료되었습니다.');
    } catch (error) {
      console.error(error);
      window.alert('예약 요청에 실패했습니다. 로그인 상태와 좌석 상태를 확인해주세요.');
    } finally {
      setReservationLoading(false);
    }
  }

  async function handleCancelReservation(reservationId: number) {
    if (!window.confirm('예약을 취소할까요?')) {
      return;
    }

    setCancelingReservationId(reservationId);

    try {
      const result = await cancelReadingSeatReservation(reservationId);
      await Promise.all([
        loadMyReservations(),
        refreshSelectedSeatAvailability().catch(console.error),
      ]);
      window.alert(result.message || '예약이 취소되었습니다.');
    } catch (error) {
      console.error(error);
      window.alert('예약 취소에 실패했습니다. 예약 상태를 확인해주세요.');
    } finally {
      setCancelingReservationId(null);
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 px-[30px] py-6'>
      <div className='mx-auto max-w-[1140px]'>
        {/* 페이지 헤더 */}
        <div className='mb-6 flex items-end justify-between flex-wrap gap-4'>
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
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <span
                className='size-[7px] rounded-full animate-pulse'
                style={{
                  background: 'var(--brand)',
                  boxShadow: '0 0 0 3px rgba(15,168,150,.18)',
                }}
              />
              실시간
            </span>
            <span className='rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600'>
              빈 좌석 <b className='text-slate-900'>{totalFree}</b> · 예약 가능
              공간 <b className='text-slate-900'>{rooms.length}</b>곳
            </span>
          </div>
        </div>

        {/* 탭 */}
        <div className='mb-5 flex items-center gap-1 w-fit rounded-xl bg-slate-100 p-1'>
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

        {/* 주간 날짜 */}
        <div className='mb-5 flex items-center gap-3 flex-wrap'>
          <span className='text-[13px] font-bold text-slate-400'>
            {reservationDateRangeLabel}
          </span>
          <div className='flex gap-2'>
            {reservationDays.map((day, i) => (
              <button
                key={day.key}
                onClick={() => {
                  setSelDay(i);
                  if (selectedSlotIndexes.some((slotIndex) =>
                    isTimeSlotClosed(day, TIME_SLOTS[slotIndex], serverNow)
                  )) {
                    setSelectedSlotIndexes([
                      findFirstOpenSlotIndex(day, serverNow),
                    ]);
                  }
                  setSelSeat(null);
                  setSelSlot(null);
                }}
                className={cn(
                  'flex flex-col items-center justify-center w-[56px] h-[64px] rounded-xl border font-semibold transition-all',
                  selDay === i
                    ? 'border-primary bg-primary text-white shadow-md'
                    : day.sat
                      ? 'border-border bg-white text-blue-500'
                      : day.sun
                        ? 'border-border bg-white text-red-400'
                        : 'border-border bg-white text-slate-700 hover:border-primary',
                )}
              >
                <span className='text-[11px] mb-0.5'>{day.dayOfWeek}</span>
                <span className='text-[18px] font-extrabold leading-none'>
                  {day.day}
                </span>
                {day.today && (
                  <span
                    className='mt-1 text-[10px] font-bold'
                    style={{
                      color:
                        selDay === i ? 'rgba(255,255,255,0.8)' : 'var(--brand)',
                    }}
                  >
                    오늘
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 독서실 좌석 탭 */}
        {tab === 'seat' && (
          <div className='mb-5 flex items-start gap-3 flex-wrap'>
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
                    onClick={() => handleTimeSlotClick(index)}
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
        )}

        {tab === 'seat' && (
          <div>
            <MyReadingSeatReservations
              reservations={myReservations}
              loading={myReservationsLoading}
              error={myReservationError}
              cancelingReservationId={cancelingReservationId}
              onCancel={handleCancelReservation}
              onRefresh={loadMyReservations}
            />

            <div className='mb-5 grid grid-cols-3 gap-4'>
              {rooms.map((room) => (
                <button
                  key={room.readingRoomId}
                  onClick={() => {
                    setSelRoomId(room.readingRoomId);
                    setSelSeat(null);
                  }}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-5 text-left transition-all',
                    selRoomId === room.readingRoomId
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-white hover:border-primary shadow-sm',
                  )}
                >
                  <Ring
                    free={room.availableSeatCount}
                    total={room.totalSeatCount}
                    danger={room.availableSeatCount <= 5}
                  />
                  <div>
                    <div className='text-[14px] font-bold text-slate-900'>
                      {room.roomName}
                    </div>
                    <div className='mt-0.5 text-[12px] text-slate-400'>
                      {[room.floorName, room.description]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    <div
                      className={cn(
                        'mt-1.5 text-[12px] font-semibold',
                        room.availableSeatCount <= 5
                          ? 'text-red-500'
                          : 'text-primary',
                      )}
                    >
                      {room.availableSeatCount <= 5 ? '마감 임박' : '여유 있음'} ·
                      전체 {room.totalSeatCount}석
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className='overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm'>
              <div className='mb-1 text-[14px] font-bold text-slate-900'>
                {currentRoom?.roomName ?? '독서실'} 좌석 배치도
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
                  selectedSeat={selSeat}
                  onSelect={setSelSeat}
                  readingRoomId={currentRoom?.readingRoomId}
                  roomName={currentRoom?.roomName}
                />
              )}
            </div>
            {selSeat && (
              <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm'>
                <div>
                  <div className='text-[11px] font-semibold text-primary'>
                    선택한 좌석
                  </div>
                  <div className='mt-0.5 text-[14px] font-bold text-slate-900'>
                    {currentRoom?.roomName} · {selSeat.seatNumber}번 ·{' '}
                    {selectedTimeLabel}
                  </div>
                  <div className='mt-1 text-[12px] font-semibold text-slate-500'>
                    총 {selectedDurationHours}시간
                  </div>
                </div>
                <button
                  disabled={reservationLoading}
                  onClick={handleReserveSeat}
                  className='flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold text-white transition-colors shadow-md'
                  style={{ background: '#0FA896' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--brand-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#0FA896')
                  }
                >
                  <CalendarCheck className='size-4' />
                  {reservationLoading ? '예약 중' : '좌석 예약하기'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 강의실/스터디룸 탭 */}
        {tab === 'room' && (
          <div>
            <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
              <div className='flex border-b border-border'>
                <div className='w-[180px] shrink-0 border-r border-border px-4 py-3 text-[12px] font-bold text-slate-400'>
                  공간 / 시간
                </div>
                {SLOTS.map((s) => (
                  <div
                    key={s}
                    className='flex-1 border-r border-border py-3 text-center text-[12px] font-semibold text-slate-500 last:border-0'
                  >
                    {s}시
                  </div>
                ))}
              </div>
              {LECTURE_ROOMS.map((room) => {
                const booked = BOOKED[room.label] ?? [];
                return (
                  <div
                    key={room.key}
                    className='flex border-b border-border last:border-0'
                  >
                    <div className='w-[180px] shrink-0 border-r border-border px-4 py-4'>
                      <div className='text-[13px] font-bold text-slate-800'>
                        {room.label}
                      </div>
                      <div className='mt-0.5 text-[11px] text-slate-400'>
                        정원 {room.cap}인
                      </div>
                    </div>
                    {SLOTS.map((slot) => {
                      const isBooked = booked.includes(slot);
                      const isSelected =
                        selSlot?.room === room.label && selSlot?.slot === slot;
                      return (
                        <button
                          key={slot}
                          disabled={isBooked}
                          onClick={() =>
                            setSelSlot(
                              isSelected ? null : { room: room.label, slot },
                            )
                          }
                          className={cn(
                            'flex-1 border-r border-border py-4 text-center text-[12px] font-semibold transition-all last:border-0',
                            isBooked
                              ? 'cursor-not-allowed'
                              : isSelected
                                ? 'bg-primary text-white'
                                : 'hover:bg-primary/5 hover:text-primary',
                          )}
                          style={
                            isBooked
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
                );
              })}
            </div>
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
            {selSlot && (
              <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm'>
                <div>
                  <div className='text-[11px] font-semibold text-primary'>
                    선택한 시간
                  </div>
                  <div className='mt-0.5 text-[14px] font-bold text-slate-900'>
                    {selSlot.room} · 오늘 {selSlot.slot}:00 ~{' '}
                    {String(Number(selSlot.slot) + 1).padStart(2, '0')}:00 ·
                    정원{' '}
                    {LECTURE_ROOMS.find((r) => r.label === selSlot.room)?.cap}인
                  </div>
                </div>
                <button
                  className='flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold text-white transition-colors shadow-md'
                  style={{ background: '#0FA896' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--brand-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#0FA896')
                  }
                >
                  <CalendarCheck className='size-4' />
                  공간 예약하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
