"use client";

// 수강신청 — 홈 바로가기로 진입하는 독립 페이지(LMS 사이드바 레이아웃 미사용).
// 개설 강좌 검색 + 장바구니 방식 신청/취소 + 시간표 충돌 검사 + 정원·학점 제한 표시.
// mock-first: lib(lmsStudentEnrollApi)가 mock 반환 — BE 명세 오면 lib만 실연결.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ROLE } from "@/lib/rolecode";
import { isApiErrorStatus } from "@/lib/apiError";
import { useEnrollResultRealtime } from "@/hooks/useEnrollResultRealtime";
import {
  getEnrollSummary,
  getOpenLectures,
  submitEnrollment,
  cancelEnrollment,
} from "@/lib/lmsStudentEnrollApi";
import type { EnrollLectureRow, EnrollResult, EnrollSummary, ScheduleSlot } from "@/types/lmsStudentEnroll";

const ENROLL_RESULT_TIMEOUT_MS = 10000;
const ENROLL_PAGE_SIZE = 10;

const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100";

const slotsOverlap = (a: ScheduleSlot, b: ScheduleSlot) =>
  a.day === b.day && a.start < b.end && b.start < a.end;

const hasConflict = (target: EnrollLectureRow, others: EnrollLectureRow[]) =>
  others.some(
    (o) => o.lecId !== target.lecId && o.scheduleSlots.some((s) => target.scheduleSlots.some((t) => slotsOverlap(s, t))),
  );

const TIMETABLE_DAYS = ["월", "화", "수", "목", "금"] as const;
const TIMETABLE_SLOT_MIN = 30;
const TIMETABLE_COLORS = [
  "bg-primary/10 text-primary",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-primary/10 text-primary",
];

const parseTimeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// 매크로(자동 신청 프로그램) 방지용 — 혼동되는 0/O, 1/I/L은 제외
const CAPTCHA_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CAPTCHA_LENGTH = 6;
const CAPTCHA_COLORS = ["#0f766e", "#7c3aed", "#be123c", "#1d4ed8", "#b45309"];
const generateCaptcha = () =>
  Array.from({ length: CAPTCHA_LENGTH }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join("");

// 신청 완료(실선) + 장바구니(점선)를 한 그리드에 같이 보여줘 충돌 여부를 시각적으로도 확인 가능하게 함
function EnrollTimetable({ enrolled, cart }: { enrolled: EnrollLectureRow[]; cart: EnrollLectureRow[] }) {
  const items = useMemo(
    () => [
      ...enrolled.map((l) => ({ lecture: l, confirmed: true })),
      ...cart.map((l) => ({ lecture: l, confirmed: false })),
    ],
    [enrolled, cart],
  );

  const allSlots = items.flatMap((i) => i.lecture.scheduleSlots);
  const { startHour, endHour } = (() => {
    if (allSlots.length === 0) return { startHour: 9, endHour: 18 };
    let minMin = Infinity;
    let maxMin = -Infinity;
    allSlots.forEach((s) => {
      minMin = Math.min(minMin, parseTimeToMinutes(s.start));
      maxMin = Math.max(maxMin, parseTimeToMinutes(s.end));
    });
    return {
      startHour: Math.min(9, Math.floor(minMin / 60)),
      endHour: Math.max(18, Math.ceil(maxMin / 60)),
    };
  })();
  const totalSlots = ((endHour - startHour) * 60) / TIMETABLE_SLOT_MIN;
  const hourLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">시간표</h2>
      {items.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-slate-400">표시할 강좌가 없습니다.</p>
      ) : (
        <div
          className="mt-4 grid text-[10px]"
          style={{
            gridTemplateColumns: "28px repeat(5, 1fr)",
            gridTemplateRows: `16px repeat(${totalSlots}, 16px)`,
          }}
        >
          <div />
          {TIMETABLE_DAYS.map((d, i) => (
            <div
              key={d}
              className="flex items-center justify-center font-bold text-slate-500"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {d}
            </div>
          ))}

          {hourLabels.map((h) => {
            const rowStart = ((h - startHour) * 60) / TIMETABLE_SLOT_MIN + 2;
            return (
              <Fragment key={h}>
                <div
                  className="border-t border-slate-100 pr-1 text-right text-slate-400 leading-none"
                  style={{ gridColumn: 1, gridRow: rowStart }}
                >
                  {h}
                </div>
                <div className="border-t border-slate-100" style={{ gridColumn: "2 / span 5", gridRow: rowStart }} />
              </Fragment>
            );
          })}

          {items.map(({ lecture, confirmed }, idx) =>
            lecture.scheduleSlots.map((slot, slotIdx) => {
              const dayIdx = TIMETABLE_DAYS.indexOf(slot.day);
              if (dayIdx === -1) return null;
              const start = parseTimeToMinutes(slot.start);
              const end = parseTimeToMinutes(slot.end);
              const rowStart = (start - startHour * 60) / TIMETABLE_SLOT_MIN + 2;
              const span = Math.max(1, (end - start) / TIMETABLE_SLOT_MIN);
              return (
                <div
                  key={`${lecture.lecId}-${slotIdx}`}
                  className={`m-px overflow-hidden rounded px-1 py-0.5 font-semibold leading-tight ${TIMETABLE_COLORS[idx % TIMETABLE_COLORS.length]} ${
                    confirmed ? "" : "border border-dashed border-current opacity-80"
                  }`}
                  style={{ gridColumn: dayIdx + 2, gridRow: `${rowStart} / span ${span}` }}
                  title={`${lecture.courseName} ${slot.start}~${slot.end}${confirmed ? "" : " (장바구니)"}`}
                >
                  <span className="block truncate">{lecture.courseName}</span>
                </div>
              );
            }),
          )}
        </div>
      )}
      <p className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded bg-primary/20" />
          신청 완료
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded border border-dashed border-slate-400" />
          장바구니
        </span>
      </p>
    </div>
  );
}

export default function HomeEnrollPage() {
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const role = useAuthStore((s) => s.role);
  const univName = useAuthStore((s) => s.univName);

  const allowed = role === ROLE.STU || role === ROLE.ALU;

  const [lectures, setLectures] = useState<EnrollLectureRow[]>([]);
  const [summary, setSummary] = useState<EnrollSummary | null>(null);
  const [cartIds, setCartIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultDelayed, setResultDelayed] = useState(false);
  const pendingRequestIdRef = useRef<string | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyword, setKeyword] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isLoggedIn) {
      router.replace("/home/login");
    }
  }, [isInitialized, isLoggedIn, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [lecs, sum] = await Promise.all([getOpenLectures(), getEnrollSummary()]);
      setLectures(lecs);
      setSummary(sum);
      setCartIds(new Set());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && allowed) void load();
  }, [isLoggedIn, allowed, load]);

  const clearResultTimeout = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearResultTimeout, [clearResultTimeout]);

  const handleEnrollResult = useCallback(
    (result: EnrollResult) => {
      if (result.requestId !== pendingRequestIdRef.current) return; // 다른 요청(타임아웃 후 재시도 등)의 응답은 무시
      pendingRequestIdRef.current = null;
      clearResultTimeout();
      setLectures((prev) =>
        prev.map((l) =>
          result.success.includes(l.lecId)
            ? { ...l, alreadyEnrolled: true, enrolledCount: l.enrolledCount + 1 }
            : l,
        ),
      );
      setCartIds(new Set());
      setSubmitting(false);
      setResultDelayed(false);
      if (result.failed.length > 0) {
        alert(`일부 강좌는 신청에 실패했습니다.\n${result.failed.map((f) => f.reason).join("\n")}`);
      }
    },
    [clearResultTimeout],
  );

  useEnrollResultRealtime(handleEnrollResult);

  const isEnrollPeriod = summary != null && summary.semesterLabel != null;

  const enrolled = useMemo(() => lectures.filter((l) => l.alreadyEnrolled), [lectures]);
  const cart = useMemo(() => lectures.filter((l) => cartIds.has(l.lecId)), [lectures, cartIds]);
  const enrolledOrCart = useMemo(() => [...enrolled, ...cart], [enrolled, cart]);

  const enrolledCredit = enrolled.reduce((sum, l) => sum + l.lecCredit, 0);
  const cartCredit = cart.reduce((sum, l) => sum + l.lecCredit, 0);
  const totalCredit = enrolledCredit + cartCredit;
  const overLimit = summary != null && totalCredit > summary.maxCredit;

  const departments = useMemo(() => [...new Set(lectures.map((l) => l.department))], [lectures]);

  const visible = useMemo(
    () =>
      lectures.filter((l) => {
        if (deptFilter !== "all" && l.department !== deptFilter) return false;
        const q = keyword.trim();
        if (!q) return true;
        return l.courseName.includes(q) || l.courseCode.toUpperCase().includes(q.toUpperCase()) || l.professor.includes(q);
      }),
    [lectures, deptFilter, keyword],
  );

  useEffect(() => {
    setPage(1);
  }, [keyword, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / ENROLL_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedVisible = useMemo(
    () => visible.slice((currentPage - 1) * ENROLL_PAGE_SIZE, currentPage * ENROLL_PAGE_SIZE),
    [visible, currentPage],
  );

  const addToCart = (lecture: EnrollLectureRow) => {
    setCartIds((prev) => new Set(prev).add(lecture.lecId));
  };

  const removeFromCart = (lecId: number) => {
    setCartIds((prev) => {
      const next = new Set(prev);
      next.delete(lecId);
      return next;
    });
  };

  const openCaptcha = () => {
    if (cart.length === 0 || overLimit) return;
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
    setCaptchaOpen(true);
  };

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  };

  const confirmCaptcha = () => {
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      setCaptchaCode(generateCaptcha());
      setCaptchaInput("");
      return;
    }
    setCaptchaOpen(false);
    void handleSubmit();
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || overLimit) return;
    setSubmitting(true);
    setResultDelayed(false);
    try {
      // 202 Accepted만 즉시 응답으로 오고, 실제 성공/실패는 STOMP로 비동기 푸시됨(handleEnrollResult)
      const { requestId } = await submitEnrollment(cart.map((l) => l.lecId));
      pendingRequestIdRef.current = requestId;
      clearResultTimeout();
      resultTimeoutRef.current = setTimeout(() => setResultDelayed(true), ENROLL_RESULT_TIMEOUT_MS);
    } catch (err) {
      setSubmitting(false);
      if (isApiErrorStatus(err, 503)) {
        alert("수강신청이 몰리고 있습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("신청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  };

  const handleCancel = async (lecture: EnrollLectureRow) => {
    if (!confirm(`'${lecture.courseName}' 신청을 취소할까요?`)) return;
    try {
      await cancelEnrollment(lecture.lecId);
      setLectures((prev) =>
        prev.map((l) =>
          l.lecId === lecture.lecId
            ? { ...l, alreadyEnrolled: false, enrolledCount: Math.max(0, l.enrolledCount - 1) }
            : l,
        ),
      );
    } catch {
      alert("취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  if (!isInitialized || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-5">
          <Link href="/home" className="text-slate-400 transition-colors hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-sm font-extrabold text-slate-900">{univName ?? "Univ·us"} 수강신청</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-6">
        {!allowed ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">수강신청은 학생만 이용할 수 있습니다.</p>
            <Link
              href="/home"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              홈으로
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-500">
              {summary?.semesterLabel
                ? `${summary.semesterLabel} · 신청 가능 학점 ${summary.maxCredit}학점`
                : "개설 강좌를 검색하고 신청하세요."}
            </p>

            {error ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">강좌 목록을 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  다시 시도
                </button>
              </div>
            ) : !loading && !isEnrollPeriod ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-base font-semibold text-slate-700">수강신청 기간이 아닙니다.</p>
                <p className="mt-1 text-sm text-slate-400">학교 측에서 수강신청을 연 뒤 다시 시도해 주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* 좌측: 개설 강좌 검색/목록 */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="과목명, 학수번호, 교수명 검색"
                      disabled={loading}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      disabled={loading}
                      className={`${selectClass} w-36`}
                    >
                      <option value="all">전체 학과</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                        <th className="px-5 py-2.5 font-medium">과목명</th>
                        <th className="w-28 px-2 py-2.5 font-medium">교수</th>
                        <th className="w-16 px-2 py-2.5 font-medium">학점</th>
                        <th className="w-40 px-2 py-2.5 font-medium">강의 시간</th>
                        <th className="w-20 px-2 py-2.5 font-medium">정원</th>
                        <th className="w-20 px-2 py-2.5 font-medium">신청</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                            불러오는 중...
                          </td>
                        </tr>
                      ) : visible.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                            검색 조건에 맞는 강좌가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedVisible.map((lecture) => {
                          const full = lecture.enrolledCount >= lecture.capacity;
                          const inCart = cartIds.has(lecture.lecId);
                          const conflict = !lecture.alreadyEnrolled && !inCart && hasConflict(lecture, enrolledOrCart);
                          const disabled = lecture.alreadyEnrolled || inCart || full || conflict;
                          return (
                            <tr key={lecture.lecId} className="border-b border-slate-50 last:border-0">
                              <td className="px-5 py-3">
                                <p className="truncate font-semibold text-slate-800" title={lecture.courseName}>
                                  {lecture.courseName}
                                </p>
                                <p className="truncate text-xs text-slate-400">{lecture.courseCode} · {lecture.lecSection}반</p>
                              </td>
                              <td className="px-2 py-3 text-slate-600">{lecture.professor}</td>
                              <td className="px-2 py-3 text-slate-600">{lecture.lecCredit}</td>
                              <td className="px-2 py-3 text-xs text-slate-500">{lecture.schedule}</td>
                              <td className="px-2 py-3 text-slate-600">
                                <span className={full ? "font-semibold text-rose-600" : ""}>
                                  {lecture.enrolledCount}/{lecture.capacity}
                                </span>
                              </td>
                              <td className="px-2 py-3">
                                {lecture.alreadyEnrolled ? (
                                  <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                    신청됨
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(lecture)}
                                    disabled={disabled}
                                    title={full ? "정원 초과" : conflict ? "시간표 충돌" : inCart ? "이미 담음" : "장바구니에 담기"}
                                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                  >
                                    {inCart ? "담음" : full ? "마감" : conflict ? "충돌" : "담기"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {!loading && visible.length > 0 && (
                    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="h-7 w-7 rounded-lg text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        ‹
                      </button>
                      <span className="px-2 text-xs text-slate-500">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="h-7 w-7 rounded-lg text-sm text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </section>

                {/* 우측: 시간표 + 신청 현황(장바구니 + 신청 완료) */}
                <section className="flex flex-col gap-5">
                  <EnrollTimetable enrolled={enrolled} cart={cart} />

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-800">장바구니</h2>
                    {cart.length === 0 ? (
                      <p className="mt-4 py-6 text-center text-sm text-slate-400">담은 강좌가 없습니다.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {cart.map((l) => (
                          <li key={l.lecId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{l.courseName}</p>
                              <p className="truncate text-xs text-slate-400">{l.lecCredit}학점 · {l.schedule}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(l.lecId)}
                              className="shrink-0 text-xs font-semibold text-rose-600 hover:underline"
                            >
                              빼기
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>장바구니 학점</span>
                        <span>{cartCredit}학점</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between font-semibold text-slate-800">
                        <span>총 신청 학점</span>
                        <span className={overLimit ? "text-rose-600" : ""}>
                          {totalCredit} / {summary?.maxCredit ?? "-"}학점
                        </span>
                      </div>
                      {overLimit && (
                        <p className="mt-1 text-xs text-rose-600">신청 가능 학점을 초과했습니다. 장바구니에서 강좌를 빼주세요.</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={openCaptcha}
                      disabled={cart.length === 0 || overLimit || submitting}
                      className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {submitting ? "접수 처리 중..." : `${cart.length}개 강좌 신청하기`}
                    </button>
                    {resultDelayed && (
                      <p className="mt-2 text-xs text-amber-600">
                        처리가 지연되고 있습니다.{" "}
                        <button type="button" onClick={() => void handleSubmit()} className="font-semibold underline">
                          다시 시도
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-800">신청 완료 ({enrolled.length})</h2>
                    {enrolled.length === 0 ? (
                      <p className="mt-4 py-6 text-center text-sm text-slate-400">신청한 강좌가 없습니다.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {enrolled.map((l) => (
                          <li key={l.lecId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{l.courseName}</p>
                              <p className="truncate text-xs text-slate-400">{l.lecCredit}학점 · {l.schedule}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleCancel(l)}
                              className="shrink-0 text-xs font-semibold text-rose-600 hover:underline"
                            >
                              취소
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>

      {/* 매크로 방지 — 신청 직전 자동입력 방지문자 확인 */}
      {captchaOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setCaptchaOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800">자동입력 방지문자</h3>
            <p className="mt-1 text-sm text-slate-500">신청 전 아래 문자를 그대로 입력해 주세요.</p>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-4">
              <p className="select-none font-mono text-2xl font-black tracking-[0.3em]">
                {captchaCode.split("").map((ch, i) => (
                  <span
                    key={i}
                    className="inline-block"
                    style={{
                      color: CAPTCHA_COLORS[(i * 7 + captchaCode.length) % CAPTCHA_COLORS.length],
                      transform: `rotate(${((i * 37) % 17) - 8}deg)`,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </p>
              <button
                type="button"
                onClick={refreshCaptcha}
                title="새로고침"
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                ↻
              </button>
            </div>

            <input
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmCaptcha()}
              placeholder="문자를 입력하세요"
              autoFocus
              className="mt-3 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {captchaError && (
              <p className="mt-1.5 text-xs text-rose-600">입력한 문자가 일치하지 않습니다. 새로 표시된 문자로 다시 시도해 주세요.</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCaptchaOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmCaptcha}
                disabled={captchaInput.trim().length !== CAPTCHA_LENGTH}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
