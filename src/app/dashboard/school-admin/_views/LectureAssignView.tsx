"use client";

// src/app/dashboard/school-admin/_views/LectureAssignView.tsx
// 어드민(학교 관리자) 강의 배정 뷰 — BE 문서 §6 #11 / 디자인 A안 확정본 기준 (khy)
// ─────────────────────────────────────────────────────────────
// '강의 관리'에 등록된 강의(LECTURE_CODE)에 학기·담당 교수를 붙여 배정(LECTURE 생성)한다.
//  · BE: /api/admin/lectures/assigns — 분반은 서버 자동 채번(같은 학기·강의 MAX+1)
//  · 강의 드롭다운 = /api/admin/lectures 중 ACT만(학과 필터) — '강의 관리' 뷰에서 공급
//  · 필수: 학과·강의·담당 교수·학기 / 선택: 학점·총 수업횟수·요일·시간(요일과 시간은 함께 입력)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { Check, Info, Lock, Pencil, Plus, Unlock } from "lucide-react";
import { isAxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import {
    createLectureAssign,
    updateLectureAssign,
    getAdminDepartments,
    getAdminLectures,
    getAdminProfessors,
    getAdminSemesters,
    getLectureAssigns,
    openSemesterEnrollment,
    closeSemesterEnrollment,
    DAY_LABEL,
    LEC_STATUS_LABEL,
    SEM_TERM_LABEL,
    type ApiDepartment,
    type ApiLecture,
    type ApiLectureAssign,
    type ApiProfessor,
    type ApiSemester,
} from "@/lib/adminApi";

const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// JS Date.getDay() 매핑 (일=0)
const DAY_NUM: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };

const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

const STATUS_BADGE_CLASS: Record<string, string> = {
    OPEN: "bg-emerald-100 text-emerald-700",
    PROG: "bg-sky-100 text-sky-700",
    CLSD: "bg-slate-100 text-slate-500",
    CNCL: "bg-rose-100 text-rose-600",
};

const inputClass =
    "mt-2 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400";

const sectionLabel = (section: number) => String(section).padStart(2, "0");

const dayLabelsOf = (a: ApiLectureAssign) =>
    (a.dayCodes ?? "")
        .split(",")
        .filter(Boolean)
        .map((c) => DAY_LABEL[c] ?? c)
        .join("·");

const dayTimeLabel = (a: ApiLectureAssign) => {
    if (!a.dayCodes || !a.startTime || !a.endTime) return "—";
    return `${dayLabelsOf(a)} ${a.startTime}–${a.endTime}`;
};

export default function LectureAssignView() {
    const { univId: myUnivId } = useAuthStore();
    const [showModal, setShowModal] = useState(false); // 배정 폼 모달
    const [editTarget, setEditTarget] = useState<ApiLectureAssign | null>(null); // null = 신규 배정, 값 있으면 수정

    // 배정 목록
    const [assigns, setAssigns] = useState<ApiLectureAssign[]>([]);
    const [tableLoading, setTableLoading] = useState(false);
    const [yearFilter, setYearFilter] = useState<number>(0); // 0 = 전체 년도
    const [termFilter, setTermFilter] = useState<string>(""); // "" = 전체 학기
    const [page, setPage] = useState(1); // 1-based, 10건/페이지
    const [periodProcessing, setPeriodProcessing] = useState(false); // 수강신청 열기/마감 처리 중

    // 드롭다운 소스
    const [departments, setDepartments] = useState<ApiDepartment[]>([]);
    const [lectures, setLectures] = useState<ApiLecture[]>([]); // 강의 관리 카탈로그
    const [professors, setProfessors] = useState<ApiProfessor[]>([]);
    const [semesters, setSemesters] = useState<ApiSemester[]>([]);

    // 폼 상태
    const [deptId, setDeptId] = useState(0);
    const [lecCodeId, setLecCodeId] = useState(0);
    const [professorMemberId, setProfessorMemberId] = useState(0);
    const [formYear, setFormYear] = useState(0); // 배정 년도 (0 = 미선택)
    const [formTerm, setFormTerm] = useState(""); // 배정 학기 ("" = 미선택)
    const [credit, setCredit] = useState(""); // "" = 선택 안 함
    const [capacity, setCapacity] = useState(""); // "" = 무제한
    const [days, setDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchAssigns = useCallback(() => {
        setTableLoading(true);
        getLectureAssigns()
            .then(setAssigns)
            .catch(console.error)
            .finally(() => setTableLoading(false));
    }, []);

    useEffect(() => {
        fetchAssigns();
    }, [fetchAssigns]);

    useEffect(() => {
        if (myUnivId) getAdminDepartments(myUnivId).then(setDepartments).catch(console.error);
        getAdminLectures().then(setLectures).catch(console.error);
        getAdminProfessors().then(setProfessors).catch(console.error);
        getAdminSemesters().then(setSemesters).catch(console.error);
    }, [myUnivId]);

    // 수정 모달에서 기존 강의가 숨김/삭제 상태여도 현재 선택값은 옵션에 유지
    const deptLectures = lectures.filter(
        (l) => l.deptId === deptId && (l.valStatus === "ACT" || l.lecCodeId === lecCodeId)
    );

    // 년도·학기 필터 (AND 조합, 클라이언트 사이드 — PLM-005 관례). 옵션은 SEMESTERS에서 유도
    const yearOptions = [...new Set(semesters.map((s) => s.semYear))].sort((a, b) => b - a);
    const termOptions = TERM_ORDER.filter((t) => semesters.some((s) => s.semTerm === t));
    const filteredAssigns = assigns.filter(
        (a) => (!yearFilter || a.semYear === yearFilter) && (!termFilter || a.semTerm === termFilter)
    );

    // 년도+학기를 모두 특정해야 학기 단위 수강신청 열기/마감 대상 SEM_ID가 정해짐 ("전체" 선택 중엔 비활성)
    const periodSemester = semesters.find((s) => s.semYear === yearFilter && s.semTerm === termFilter);
    const periodLabel = periodSemester ? `${periodSemester.semYear}년 ${SEM_TERM_LABEL[periodSemester.semTerm] ?? periodSemester.semTerm}` : null;

    // 학기별 수강신청 열림 여부 한눈에 보기 — "전체" 필터로는 안 보이던 걸 칩으로 항상 노출 (최신순)
    const semesterOpenStatus = [...semesters]
        .sort(
            (a, b) =>
                b.semYear - a.semYear || TERM_ORDER.indexOf(a.semTerm) - TERM_ORDER.indexOf(b.semTerm)
        )
        .map((s) => ({
            semester: s,
            isOpen: assigns.some((a) => a.semId === s.semId && a.lecValStatus === "OPEN"),
        }));

    const handleOpenPeriod = async () => {
        if (!periodSemester || periodProcessing) return;

        // 다른 학기가 이미 열려있으면 동시에 두 학기를 열 수 없게 차단 (학기당 1개만 오픈)
        const otherOpen = semesterOpenStatus.filter(
            ({ semester, isOpen }) => isOpen && semester.semId !== periodSemester.semId
        );
        if (otherOpen.length > 0) {
            const otherLabels = otherOpen
                .map(
                    ({ semester }) =>
                        `${semester.semYear}년 ${SEM_TERM_LABEL[semester.semTerm] ?? semester.semTerm}`
                )
                .join(", ");
            alert(`이미 '${otherLabels}' 수강신청이 열려있어 '${periodLabel}'은 열 수 없습니다. 먼저 마감해주세요.`);
            return;
        }
        if (!confirm(`'${periodLabel}' 마감된 강좌를 다시 수강신청 가능 상태로 여시겠습니까?`)) return;
        setPeriodProcessing(true);
        try {
            const { updated } = await openSemesterEnrollment(periodSemester.semId);
            alert(`${updated}개 강좌의 수강신청을 열었습니다.`);
            fetchAssigns();
        } catch {
            alert("수강신청 열기에 실패했습니다.");
        } finally {
            setPeriodProcessing(false);
        }
    };

    const handleClosePeriod = async () => {
        if (!periodSemester || periodProcessing) return;
        if (!confirm(`'${periodLabel}' 수강신청을 마감하시겠습니까? 신청중인 강좌가 모두 진행중 상태로 바뀝니다.`)) return;
        setPeriodProcessing(true);
        try {
            const { updated } = await closeSemesterEnrollment(periodSemester.semId);
            alert(`${updated}개 강좌의 수강신청을 마감했습니다.`);
            fetchAssigns();
        } catch {
            alert("수강신청 마감에 실패했습니다.");
        } finally {
            setPeriodProcessing(false);
        }
    };

    const PAGE_SIZE = 10;
    const totalPages = Math.max(1, Math.ceil(filteredAssigns.length / PAGE_SIZE)); // 0건이어도 최소 1페이지
    const pageAssigns = filteredAssigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // 필터 변경 시 1페이지 복귀 + 건수 감소 시 마지막 페이지 보정
    useEffect(() => {
        setPage(1);
    }, [yearFilter, termFilter]);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const toggleDay = (code: string) => {
        setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));
    };

    // 수정 모달 열기 — 해당 배정 강의 정보로 폼 프리필
    const openEdit = (a: ApiLectureAssign) => {
        setEditTarget(a);
        setDeptId(a.deptId);
        setLecCodeId(a.lecCodeId);
        setProfessorMemberId(a.professorMemberId);
        setFormYear(a.semYear);
        setFormTerm(a.semTerm);
        setCredit(a.lecCredit != null ? String(a.lecCredit) : "");
        setCapacity(a.lecCapacity != null ? String(a.lecCapacity) : "");
        setDays(a.dayCodes ? a.dayCodes.split(",") : []);
        setStartTime(a.startTime ?? "");
        setEndTime(a.endTime ?? "");
        setShowModal(true);
    };

    const resetForm = () => {
        setEditTarget(null);
        setDeptId(0);
        setLecCodeId(0);
        setProfessorMemberId(0);
        setFormYear(0);
        setFormTerm("");
        setCredit("");
        setCapacity("");
        setDays([]);
        setStartTime("");
        setEndTime("");
    };

    // 배정 년도·학기 2단 선택 → SEM_ID 결정 (해당 년도에 존재하는 학기만 노출)
    const formTermOptions = TERM_ORDER.filter((t) => semesters.some((s) => s.semYear === formYear && s.semTerm === t));
    const selectedSemester = semesters.find((s) => s.semYear === formYear && s.semTerm === formTerm);
    const semId = selectedSemester?.semId ?? 0;

    // 총 수업횟수 자동 계산: 학기 기간(SEM_STR_DATE~SEM_END_DATE) 중 선택 요일의 등장 횟수 (⚠️공휴일 미반영 단순 카운트)
    const totalClasses = (() => {
        if (!selectedSemester?.semStrDate || !selectedSemester.semEndDate || days.length === 0) return null;
        const dayNums = days.map((c) => DAY_NUM[c]);
        let count = 0;
        const cursor = new Date(`${selectedSemester.semStrDate}T00:00:00`);
        const end = new Date(`${selectedSemester.semEndDate}T00:00:00`);
        while (cursor <= end) {
            if (dayNums.includes(cursor.getDay())) count++;
            cursor.setDate(cursor.getDate() + 1);
        }
        return count;
    })();

    const fmtDate = (iso: string) => iso.slice(5).replace("-", "."); // "2026-03-02" → "03.02"

    // 요일·시간은 함께 입력해야 LECTURE_TIME 행 구성 가능(모두 비우면 미지정)
    const timeTouched = days.length > 0 || !!startTime || !!endTime;
    const timeComplete = days.length > 0 && !!startTime && !!endTime;
    const timeIncomplete = timeTouched && !timeComplete;
    const timeOrderInvalid = timeComplete && startTime >= endTime;
    const capacityInvalid = capacity !== "" && Number(capacity) <= 0;

    // 수정 모드 dirty 가드: 프리필 원본 대비 변경이 없으면 '수정 완료' 비활성 (요일은 순서 무관 비교)
    const canonicalDays = (codes: string[]) => DAY_CODES.filter((c) => codes.includes(c)).join(",");
    const isDirty = !editTarget
        ? true // 신규 배정은 dirty 개념 없음
        : deptId !== editTarget.deptId ||
          lecCodeId !== editTarget.lecCodeId ||
          professorMemberId !== editTarget.professorMemberId ||
          formYear !== editTarget.semYear ||
          formTerm !== editTarget.semTerm ||
          credit !== (editTarget.lecCredit != null ? String(editTarget.lecCredit) : "") ||
          capacity !== (editTarget.lecCapacity != null ? String(editTarget.lecCapacity) : "") ||
          canonicalDays(days) !== canonicalDays((editTarget.dayCodes ?? "").split(",").filter(Boolean)) ||
          startTime !== (editTarget.startTime ?? "") ||
          endTime !== (editTarget.endTime ?? "");

    const canSubmit =
        !!deptId &&
        !!lecCodeId &&
        !!professorMemberId &&
        !!semId &&
        !timeIncomplete &&
        !timeOrderInvalid &&
        !capacityInvalid &&
        isDirty &&
        !submitting;

    const submit = async () => {
        if (!canSubmit) return;
        // ⭐ 교수 시간표 충돌 사전 검사: 같은 학기·같은 교수의 기존 강의와 요일·시간대가 겹치면 차단
        //    (서버에서도 동일 검사로 최종 차단 — 409. 폐강 CNCL 강의는 제외)
        if (timeComplete) {
            const conflict = assigns.find(
                (a) =>
                    a.lecId !== editTarget?.lecId && // 수정 시 자기 자신은 제외
                    a.professorMemberId === professorMemberId &&
                    a.semYear === formYear &&
                    a.semTerm === formTerm &&
                    a.lecValStatus !== "CNCL" &&
                    !!a.dayCodes &&
                    !!a.startTime &&
                    !!a.endTime &&
                    a.dayCodes.split(",").some((d) => days.includes(d)) &&
                    startTime < a.endTime &&
                    endTime > a.startTime
            );
            if (conflict) {
                alert(
                    `교수의 다른 강의와 시간이 겹쳐 배정할 수 없습니다.\n겹치는 강의: '${conflict.lecCodName}' ${sectionLabel(conflict.lecSection)}반 (${dayTimeLabel(conflict)})`
                );
                return;
            }
        }
        setSubmitting(true);
        try {
            const payload = {
                lecCodeId,
                semId,
                professorMemberId,
                lecCredit: credit ? Number(credit) : null,
                lecCapacity: capacity ? Number(capacity) : null,
                lecTotClasses: totalClasses, // 학기 기간 × 선택 요일 자동 계산값 (요일 미선택 시 null)
                times: timeComplete
                    ? days.map((dayCode) => ({ dayCode, startTime, endTime }))
                    : [],
            };
            const saved = editTarget
                ? await updateLectureAssign(editTarget.lecId, payload)
                : await createLectureAssign(payload);
            alert(
                editTarget
                    ? `'${saved.lecCodName}' ${sectionLabel(saved.lecSection)}반 배정이 수정되었습니다.`
                    : `'${saved.lecCodName}' ${sectionLabel(saved.lecSection)}반이 배정되었습니다.`
            );
            resetForm();
            setShowModal(false);
            fetchAssigns();
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409) {
                alert("해당 시간대에 교수의 다른 강의가 있어 배정할 수 없습니다.");
            } else {
                alert("배정에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">강의 배정</h1>
                    <p className="mt-1 text-sm text-slate-500">배정된 강의를 확인하고 새 강의를 배정합니다.</p>
                </div>
                {/* 년도·학기 필터 + 강의 배정 (기본 둘 다 '전체') */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(Number(e.target.value))}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value={0}>전체 년도</option>
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>
                                {y}년
                            </option>
                        ))}
                    </select>
                    <select
                        value={termFilter}
                        onChange={(e) => setTermFilter(e.target.value)}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">전체 학기</option>
                        {termOptions.map((t) => (
                            <option key={t} value={t}>
                                {SEM_TERM_LABEL[t] ?? t}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => void handleOpenPeriod()}
                        disabled={!periodSemester || periodProcessing}
                        title={periodSemester ? `${periodLabel} 수강신청 열기` : "년도·학기를 모두 선택하세요"}
                        className="flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                        <Unlock className="size-4" /> 수강신청 열기
                    </button>
                    <button
                        onClick={() => void handleClosePeriod()}
                        disabled={!periodSemester || periodProcessing}
                        title={periodSemester ? `${periodLabel} 수강신청 마감` : "년도·학기를 모두 선택하세요"}
                        className="flex items-center gap-2 rounded-lg border border-rose-600 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                        <Lock className="size-4" /> 수강신청 마감
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
                    >
                        <Plus className="size-4" /> 강의 배정
                    </button>
                </div>
            </div>

            {/* 학기별 수강신청 열림 여부 — 클릭하면 해당 학기로 필터 이동 */}
            {semesterOpenStatus.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
                    <span className="mr-1 shrink-0 text-xs font-extrabold text-slate-400">수강신청 상태</span>
                    {semesterOpenStatus.map(({ semester, isOpen }) => (
                        <button
                            key={semester.semId}
                            type="button"
                            onClick={() => {
                                setYearFilter(semester.semYear);
                                setTermFilter(semester.semTerm);
                            }}
                            title="이 학기로 필터 이동"
                            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                                isOpen
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                        >
                            {semester.semYear}년 {SEM_TERM_LABEL[semester.semTerm] ?? semester.semTerm} ·{" "}
                            {isOpen ? "열림" : "닫힘"}
                        </button>
                    ))}
                </div>
            )}

            <>
                    {/* 배정 강의 목록 */}
                    <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">강의명</th>
                                    <th className="px-5 py-3">학과</th>
                                    <th className="px-5 py-3">담당 교수</th>
                                    <th className="px-5 py-3">년도</th>
                                    <th className="px-5 py-3">학기</th>
                                    <th className="px-5 py-3">학점</th>
                                    <th className="px-5 py-3">정원</th>
                                    <th className="px-5 py-3">요일·시간</th>
                                    <th className="px-5 py-3">상태</th>
                                    <th className="px-5 py-3">수정</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                                            불러오는 중...
                                        </td>
                                    </tr>
                                ) : filteredAssigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                                            {assigns.length === 0
                                                ? "배정된 강의가 없습니다."
                                                : "선택한 년도·학기에 배정된 강의가 없습니다."}
                                        </td>
                                    </tr>
                                ) : (
                                    pageAssigns.map((a) => (
                                        <tr key={a.lecId} className="font-semibold text-slate-700 hover:bg-slate-50">
                                            <td className="px-5 py-3.5">
                                                <p>{a.lecCodName}</p>
                                                <p className="mt-0.5 font-mono text-xs font-bold text-slate-400">
                                                    {sectionLabel(a.lecSection)}반
                                                </p>
                                            </td>
                                            <td className="px-5 py-3.5">{a.deptName}</td>
                                            <td className="px-5 py-3.5">{a.professorName}</td>
                                            <td className="px-5 py-3.5">{a.semYear}</td>
                                            <td className="px-5 py-3.5">{SEM_TERM_LABEL[a.semTerm] ?? a.semTerm}</td>
                                            <td className="px-5 py-3.5">{a.lecCredit != null ? `${a.lecCredit}학점` : "—"}</td>
                                            <td className="px-5 py-3.5">{a.lecCapacity != null ? `${a.lecCapacity}명` : "무제한"}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                {a.dayCodes && a.startTime && a.endTime ? (
                                                    <>
                                                        <p>{dayLabelsOf(a)}</p>
                                                        <p className="mt-0.5 font-mono text-xs font-bold text-slate-400">
                                                            {a.startTime}–{a.endTime}
                                                        </p>
                                                    </>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[a.lecValStatus] ?? "bg-slate-100 text-slate-500"}`}
                                                >
                                                    {LEC_STATUS_LABEL[a.lecValStatus] ?? a.lecValStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <button
                                                    onClick={() => openEdit(a)}
                                                    disabled={a.lecValStatus !== "OPEN"}
                                                    title={
                                                        a.lecValStatus === "OPEN"
                                                            ? "수정"
                                                            : "수강신청중 상태만 수정할 수 있습니다"
                                                    }
                                                    className={`rounded p-1 ${
                                                        a.lecValStatus === "OPEN"
                                                            ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                            : "cursor-not-allowed text-slate-200"
                                                    }`}
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* 페이지네이션 — 0건이어도 1페이지는 항상 표시, 가운데 정렬 */}
                        <div className="flex items-center justify-center border-t border-slate-100 px-5 py-3">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={page === 1}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                                >
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setPage(n)}
                                        className={`h-8 w-8 rounded-lg text-xs font-bold ${
                                            n === page
                                                ? "bg-emerald-700 text-white"
                                                : "text-slate-500 hover:bg-slate-50"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page === totalPages}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </div>
                </>

            {/* 강의 배정 모달 */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl lg:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-black">{editTarget ? "강의 배정 수정" : "강의 배정"}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {editTarget
                                ? `'${editTarget.lecCodName}' ${sectionLabel(editTarget.lecSection)}반의 배정 정보를 수정합니다.`
                                : "강의에 학기·담당 교수·운영 정보를 지정해 배정합니다."}
                        </p>

                    {/* 기본 정보 */}
                    <div className="mt-6 flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                        <h2 className="text-sm font-black">기본 정보</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">배정할 강의를 식별하는 핵심 정보입니다.</p>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-black">
                                학과 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={deptId}
                                onChange={(e) => {
                                    // 순차 선택 체인: 상위 변경 시 하위(강의→교수→학점) 연쇄 리셋
                                    setDeptId(Number(e.target.value));
                                    setLecCodeId(0);
                                    setProfessorMemberId(0);
                                    setCredit("");
                                }}
                                className={inputClass}
                            >
                                <option value={0}>학과 선택</option>
                                {departments.map((d) => (
                                    <option key={d.deptId} value={d.deptId}>
                                        {d.deptName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-black">
                                강의 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={lecCodeId}
                                onChange={(e) => {
                                    setLecCodeId(Number(e.target.value));
                                    setProfessorMemberId(0);
                                    setCredit("");
                                }}
                                disabled={!deptId}
                                className={inputClass}
                            >
                                <option value={0}>{!deptId ? "학과를 먼저 선택하세요" : "강의 선택"}</option>
                                {deptLectures.map((l) => (
                                    <option key={l.lecCodeId} value={l.lecCodeId}>
                                        {l.lecCode} · {l.lecCodName}
                                    </option>
                                ))}
                            </select>
                            {deptId !== 0 && deptLectures.length === 0 ? (
                                <p className="mt-1 text-xs text-rose-500">
                                    이 학과에 등록된 강의가 없습니다 — &lsquo;강의 관리&rsquo; 메뉴에서 먼저 등록하세요.
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">
                                    &lsquo;강의 관리&rsquo;에 등록된 강의(사용 상태)에서 선택합니다.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-black">
                                담당 교수 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={professorMemberId}
                                onChange={(e) => {
                                    setProfessorMemberId(Number(e.target.value));
                                    setCredit("");
                                }}
                                disabled={!lecCodeId}
                                className={inputClass}
                            >
                                <option value={0}>{!lecCodeId ? "강의를 먼저 선택하세요" : "교수 선택"}</option>
                                {professors.map((p) => (
                                    <option key={p.memberId} value={p.memberId}>
                                        {p.memberName} 교수{p.deptName ? ` (${p.deptName})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-black">학점</label>
                            <select
                                value={credit}
                                onChange={(e) => setCredit(e.target.value)}
                                disabled={!professorMemberId}
                                className={inputClass}
                            >
                                <option value="">{!professorMemberId ? "교수를 먼저 선택하세요" : "선택 안 함"}</option>
                                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                        {n}학점
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-400">1–9학점 (선택)</p>
                        </div>
                        <div>
                            <label className="text-sm font-black">정원</label>
                            <input
                                type="number"
                                min={1}
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                placeholder="미입력 시 무제한"
                                className={inputClass}
                            />
                            {capacityInvalid ? (
                                <p className="mt-1 text-xs text-rose-500">정원은 1 이상이어야 합니다.</p>
                            ) : (
                                <p className="mt-1 text-xs text-slate-400">수강신청 정원 (선택, 미입력 시 무제한)</p>
                            )}
                        </div>
                    </div>

                    {/* 운영 정보 */}
                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            <h2 className="text-sm font-black">운영 정보</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">배정 학기와 수업 운영 방식을 설정합니다.</p>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-black">
                                    년도·학기 <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={formYear}
                                        onChange={(e) => {
                                            setFormYear(Number(e.target.value));
                                            setFormTerm(""); // 년도 변경 시 학기 재선택
                                        }}
                                        className={inputClass}
                                    >
                                        <option value={0}>년도 선택</option>
                                        {yearOptions.map((y) => (
                                            <option key={y} value={y}>
                                                {y}년
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={formTerm}
                                        onChange={(e) => setFormTerm(e.target.value)}
                                        disabled={!formYear}
                                        className={inputClass}
                                    >
                                        <option value="">{formYear ? "학기 선택" : "년도 먼저 선택"}</option>
                                        {formTermOptions.map((t) => (
                                            <option key={t} value={t}>
                                                {SEM_TERM_LABEL[t] ?? t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-black">총 수업횟수</label>
                                <div className="mt-2 flex h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-700">
                                    {totalClasses != null ? `${totalClasses}회` : "—"}
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                    {totalClasses != null && selectedSemester
                                        ? `${fmtDate(selectedSemester.semStrDate)}~${fmtDate(selectedSemester.semEndDate)} 기간의 ${DAY_CODES.filter(
                                              (c) => days.includes(c)
                                          )
                                              .map((c) => DAY_LABEL[c])
                                              .join("·")}요일 기준 자동 계산`
                                        : "학기와 요일을 선택하면 자동 계산됩니다."}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <label className="text-sm font-black">요일</label>
                            <div className="mt-2 flex gap-2">
                                {DAY_CODES.map((code) => (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => toggleDay(code)}
                                        className={`h-9 w-9 rounded-lg border text-sm font-bold transition-colors ${
                                            days.includes(code)
                                                ? "border-emerald-700 bg-emerald-700 text-white"
                                                : "border-border bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        {DAY_LABEL[code]}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">선택 입력 · 여러 요일에 같은 시간이 적용됩니다.</p>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-black">시작 시간</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-black">종료 시간</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        {(timeIncomplete || timeOrderInvalid) && (
                            <p className="mt-2 text-xs text-rose-500">
                                {timeOrderInvalid
                                    ? "종료 시간은 시작 시간보다 늦어야 합니다."
                                    : "요일과 시작·종료 시간은 함께 입력해야 합니다. (수업 시간 미지정 시 모두 비워두세요)"}
                            </p>
                        )}

                        {/* 반 자동 부여 안내 */}
                        <div className="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                            <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                            <p>
                                <b className="font-black text-slate-700">반은 배정 시 자동 부여됩니다.</b> 같은
                                학기·강의를 다시 배정하면 새 반이 추가되며(첫 배정은 01반), 이후 +1씩 증가합니다.
                            </p>
                        </div>
                    </div>

                    {/* 푸터 */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Info className="size-3.5 shrink-0 text-slate-400" />
                            배정된 강의는 <b className="font-black text-slate-700">&lsquo;수강신청중&rsquo;</b> 상태로
                            개설됩니다.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowModal(false);
                                }}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={submit}
                                disabled={!canSubmit}
                                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                <Check className="size-4" />
                                {submitting
                                    ? editTarget
                                        ? "수정 중..."
                                        : "배정 중..."
                                    : editTarget
                                      ? "수정 완료"
                                      : "강의 배정"}
                            </button>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}
