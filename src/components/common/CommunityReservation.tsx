'use client';

import { useState } from 'react';
import { BookOpen, Monitor, Check, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── 독서실 데이터 ──────────────────────────────────────
const STUDY_ROOMS = [
  {
    key: 'study1',
    label: '제1독서실',
    total: 40,
    free: 12,
    note: '4층 · 정숙구역',
    danger: false,
  },
  {
    key: 'study2',
    label: '제2독서실',
    total: 32,
    free: 20,
    note: '5층 · 노트북 가능',
    danger: false,
  },
  {
    key: 'lab',
    label: '노트북 열람실',
    total: 24,
    free: 5,
    note: '5층 · 콘센트석',
    danger: true,
  },
];

// 사용 중인 좌석 번호
const TAKEN_SEATS: Record<string, number[]> = {
  study1: [
    2, 5, 7, 11, 14, 17, 21, 24, 26, 29, 3, 19, 33, 35, 38, 40, 1, 6, 9, 15, 20,
    22, 25, 28, 30, 32, 36, 37,
  ],
  study2: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
  lab: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19],
};

// ── 강의실/스터디룸 데이터 ─────────────────────────────
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

// ── 주간 날짜 ─────────────────────────────────────────
const WEEK = [
  { wd: '금', d: 5, today: true },
  { wd: '토', d: 6, sat: true },
  { wd: '일', d: 7, sun: true },
  { wd: '월', d: 8 },
  { wd: '화', d: 9 },
  { wd: '수', d: 10 },
  { wd: '목', d: 11 },
];

// ── 원형 진행바 ────────────────────────────────────────
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
  const pct = free / total;
  const color = danger ? '#E04E3A' : '#0FA896';

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
          strokeDashoffset={c * (1 - pct)}
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

// ── 독서실 좌석 배치도 ─────────────────────────────────
function SeatMap({
  roomKey,
  total,
  selectedSeat,
  onSelect,
}: {
  roomKey: string;
  total: number;
  selectedSeat: number | null;
  onSelect: (n: number) => void;
}) {
  const taken = TAKEN_SEATS[roomKey] ?? [];
  const half = Math.ceil(total / 2);
  const colsA = Array.from({ length: half }, (_, i) => i + 1);
  const colsB = Array.from({ length: total - half }, (_, i) => half + i + 1);

  const SeatBtn = ({ n }: { n: number }) => {
    const isTaken = taken.includes(n);
    const isSelected = selectedSeat === n;
    return (
      <button
        disabled={isTaken}
        onClick={() => onSelect(n)}
        className={cn(
          'flex size-[44px] items-center justify-center rounded-lg text-[13px] font-bold transition-all',
          isTaken
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : isSelected
              ? 'bg-primary text-white shadow-md'
              : 'bg-white border border-border text-slate-600 hover:border-primary hover:text-primary',
        )}
      >
        {isSelected ? <Check className='size-4' /> : n}
      </button>
    );
  };

  return (
    <div className='mt-4 overflow-hidden rounded-2xl border border-border bg-slate-50 p-6'>
      {/* 범례 */}
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

      {/* 배치도 */}
      <div className='flex gap-8 justify-center'>
        {/* A 구역 */}
        <div>
          <div className='mb-2 text-center text-[11px] font-bold text-slate-400'>
            A 구역
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {colsA.map((n) => (
              <SeatBtn key={n} n={n} />
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className='flex flex-col items-center justify-center gap-1'>
          <div className='h-full w-px bg-border' />
        </div>

        {/* B 구역 */}
        <div>
          <div className='mb-2 text-center text-[11px] font-bold text-slate-400'>
            B 구역
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {colsB.map((n) => (
              <SeatBtn key={n} n={n} />
            ))}
          </div>
        </div>
      </div>

      {/* 입구 */}
      <div className='mt-4 text-center'>
        <span className='inline-block rounded-full border border-border bg-white px-6 py-1 text-[11px] font-bold text-slate-400'>
          입 구
        </span>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function CommunityReservation() {
  const [tab, setTab] = useState<'seat' | 'room'>('seat');
  const [selDay, setSelDay] = useState(0);
  const [selRoom, setSelRoom] = useState('study2');
  const [selSeat, setSelSeat] = useState<number | null>(null);
  const [selSlot, setSelSlot] = useState<{ room: string; slot: string } | null>(
    null,
  );

  const totalFree = STUDY_ROOMS.reduce((a, r) => a + r.free, 0);
  const currentRoom = STUDY_ROOMS.find((r) => r.key === selRoom)!;

  return (
    <div className='min-h-screen bg-slate-50 px-[30px] py-6'>
      <div className='mx-auto max-w-[1140px]'>
        {/* 페이지 헤더 */}
        <div className='mb-6 flex items-end justify-between flex-wrap gap-4'>
          <div>
            <h1 className='text-[26px] font-extrabold tracking-tight text-slate-900'>
              시설 이용
            </h1>
            <p className='mt-1.5 text-[13.5px] text-slate-400'>
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
            <span className='rounded-full border border-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-600'>
              빈 좌석 <b className='text-slate-900'>{totalFree}</b> · 예약 가능
              공간 <b className='text-slate-900'>4</b>곳
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

        {/* 주간 날짜 선택 */}
        <div className='mb-5 flex items-center gap-3 flex-wrap'>
          <span className='text-[13px] font-bold text-slate-400'>
            2026 · 6월
          </span>
          <div className='flex gap-2'>
            {WEEK.map((day, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelDay(i);
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
                <span className='text-[11px] mb-0.5'>{day.wd}</span>
                <span className='text-[18px] font-extrabold leading-none'>
                  {day.d}
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

        {/* ── 독서실 좌석 탭 ── */}
        {tab === 'seat' && (
          <div>
            {/* 독서실 카드 목록 */}
            <div className='mb-5 grid grid-cols-3 gap-4'>
              {STUDY_ROOMS.map((room) => (
                <button
                  key={room.key}
                  onClick={() => {
                    setSelRoom(room.key);
                    setSelSeat(null);
                  }}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-5 text-left transition-all',
                    selRoom === room.key
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-white hover:border-primary shadow-sm',
                  )}
                >
                  <Ring
                    free={room.free}
                    total={room.total}
                    danger={room.danger}
                  />
                  <div>
                    <div className='text-[15px] font-bold text-slate-900'>
                      {room.label}
                    </div>
                    <div className='mt-0.5 text-[12px] text-slate-400'>
                      {room.note}
                    </div>
                    <div
                      className={cn(
                        'mt-1.5 text-[12px] font-semibold',
                        room.danger ? 'text-red-500' : 'text-primary',
                      )}
                    >
                      {room.danger ? '마감 임박' : '여유 있음'} · 전체{' '}
                      {room.total}석
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 좌석 배치도 */}
            <div className='overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm'>
              <div className='mb-1 text-[15px] font-bold text-slate-900'>
                {currentRoom.label} 좌석 배치도
              </div>
              <SeatMap
                roomKey={selRoom}
                total={currentRoom.total}
                selectedSeat={selSeat}
                onSelect={setSelSeat}
              />
            </div>

            {/* 예약 바 */}
            {selSeat && (
              <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm'>
                <div>
                  <div className='text-[11px] font-semibold text-primary'>
                    선택한 좌석
                  </div>
                  <div className='mt-0.5 text-[15px] font-bold text-slate-900'>
                    {currentRoom.label} · {selSeat}번 · 오늘 14:00 ~ 16:00
                  </div>
                </div>
                <button
                  className='flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold text-white transition-colors shadow-md'
                  style={{ background: '#0FA896' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--brand-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--brand)')
                  }
                >
                  <CalendarCheck className='size-4' />
                  좌석 예약하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 강의실/스터디룸 탭 ── */}
        {tab === 'room' && (
          <div>
            <div className='overflow-hidden rounded-2xl border border-border bg-white shadow-sm'>
              {/* 타임라인 헤더 */}
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

              {/* 강의실 행 */}
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

            {/* 범례 */}
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

            {/* 예약 바 */}
            {selSlot && (
              <div className='mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 shadow-sm'>
                <div>
                  <div className='text-[11px] font-semibold text-primary'>
                    선택한 시간
                  </div>
                  <div className='mt-0.5 text-[15px] font-bold text-slate-900'>
                    {selSlot.room} · 오늘 {selSlot.slot}:00 ~{' '}
                    {String(Number(selSlot.slot) + 1).padStart(2, '0')}:00 ·
                    정원{' '}
                    {LECTURE_ROOMS.find((r) => r.label === selSlot.room)?.cap}인
                  </div>
                </div>
                <button
                  className='flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold text-white transition-colors shadow-md'
                  style={{ background: '#0FA896' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--brand-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--brand)')
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
