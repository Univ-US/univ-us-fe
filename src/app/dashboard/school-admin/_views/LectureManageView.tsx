"use client";

// src/app/dashboard/school-admin/_views/LectureManageView.tsx
// 강의 관리 — 기존 '강의코드 관리'(팀원 LectureCodesView)의 개선 대체 화면 (khy)
// ─────────────────────────────────────────────────────────────
// 같은 LECTURE_CODE 테이블을 다루되 신규 경로 /api/admin/lectures 사용.
//  · 개선 ①: 삭제 = 소프트 삭제(VAL_STATUS='DEL') + 배정된 강의 존재 시 서버가 409로 차단
//             (기존 화면의 하드 DELETE는 배정 강의를 PLM 화면에서 증발시킴)
//  · 개선 ②: 강의별 '배정 강의 수' 컬럼 표시 — 삭제 가능 여부를 목록에서 바로 인지
// 기존 '강의코드 관리' 메뉴·기능은 그대로 둠(팀원이 직접 정리 예정).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { isAxiosError } from "axios";
import {
    createAdminLecture,
    getAdminDepartments,
    getAdminLectures,
    getLectureAssigns,
    updateAdminLecture,
    updateAdminLectureStatus,
    SEM_TERM_LABEL,
    type ApiDepartment,
    type ApiLecture,
    type ApiLectureAssign,
} from "@/lib/adminApi";

const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];

// 호버 툴팁 표기: "2026년 1학기 1반"
const assignLabel = (a: ApiLectureAssign) =>
    `${a.semYear}년 ${SEM_TERM_LABEL[a.semTerm] ?? a.semTerm} ${a.lecSection}반`;

// 입력 한도 — DB LECTURE_CODE.LEC_CODE VARCHAR2(20) / LEC_COD_NAME VARCHAR2(200)
const CODE_MAX = 20;
const NAME_MAX = 200;

const PAGE_SIZE = 10; // 목록 페이지네이션 (전체 조회 후 클라이언트 슬라이스 — PLM-003/005 관례)

// '삭제'도 실제 DELETE가 아닌 상태값 변경(VAL_STATUS='DEL') — 선택 시 배정 존재 가드를 경유
const STATUS_OPTIONS = [
    { value: "ACT", label: "사용", className: "bg-emerald-100 text-emerald-700" },
    { value: "HID", label: "숨김", className: "bg-amber-100 text-amber-700" },
    { value: "DEL", label: "삭제", className: "bg-rose-100 text-rose-600" },
];

export default function LectureManageView() {
    const { univId: myUnivId } = useAuthStore();

    const [lectures, setLectures] = useState<ApiLecture[]>([]);
    const [assigns, setAssigns] = useState<ApiLectureAssign[]>([]); // 배정 내역 — 건수 호버 툴팁용
    const [tableLoading, setTableLoading] = useState(false);
    const [page, setPage] = useState(1); // 1-based
    const [deptFilter, setDeptFilter] = useState(0); // 0 = 전체 학과
    const [search, setSearch] = useState(""); // 코드 또는 강의명

    const [depts, setDepts] = useState<ApiDepartment[]>([]);
    const [assignTarget, setAssignTarget] = useState<ApiLecture | null>(null); // 배정 내역 모달 대상
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<ApiLecture | null>(null);
    const [form, setForm] = useState({ deptId: 0, lecCode: "", lecCodName: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchLectures = useCallback(() => {
        setTableLoading(true);
        getAdminLectures()
            .then(setLectures)
            .catch(console.error)
            .finally(() => setTableLoading(false));
    }, []);

    useEffect(() => {
        fetchLectures();
    }, [fetchLectures]);

    useEffect(() => {
        if (myUnivId) getAdminDepartments(myUnivId).then(setDepts).catch(console.error);
        getLectureAssigns().then(setAssigns).catch(console.error);
    }, [myUnivId]);

    // 강의코드별 배정 내역 묶음 (연도↓·학기순·분반↑ 정렬)
    const assignsByCode = useMemo(() => {
        const map = new Map<number, ApiLectureAssign[]>();
        for (const a of assigns) {
            const list = map.get(a.lecCodeId) ?? [];
            list.push(a);
            map.set(a.lecCodeId, list);
        }
        for (const list of map.values()) {
            list.sort(
                (x, y) =>
                    y.semYear - x.semYear ||
                    TERM_ORDER.indexOf(x.semTerm) - TERM_ORDER.indexOf(y.semTerm) ||
                    x.lecSection - y.lecSection
            );
        }
        return map;
    }, [assigns]);

    // 학과 필터 + 검색(코드 또는 강의명, 대소문자 무시) — 전체 로드 후 클라이언트 필터
    const query = search.trim();
    const filtered = lectures.filter((l) => {
        if (deptFilter && l.deptId !== deptFilter) return false;
        if (!query) return true;
        return (
            l.lecCode.includes(query.toUpperCase()) ||
            l.lecCodName.toLowerCase().includes(query.toLowerCase())
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); // 0건이어도 최소 1페이지
    const pageLectures = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // 필터·검색 변경 시 1페이지로 복귀
    useEffect(() => {
        setPage(1);
    }, [deptFilter, query]);

    // 삭제 등으로 건수가 줄어 현재 페이지가 사라지면 마지막 페이지로 보정
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ deptId: depts[0]?.deptId ?? 0, lecCode: "", lecCodName: "" });
        setShowModal(true);
    };

    const openEdit = (lecture: ApiLecture) => {
        setEditTarget(lecture);
        setForm({ deptId: lecture.deptId, lecCode: lecture.lecCode, lecCodName: lecture.lecCodName });
        setShowModal(true);
    };

    const submit = async () => {
        if (!form.lecCode.trim() || !form.lecCodName.trim() || !form.deptId) return;
        const code = form.lecCode.trim();
        // 같은 학과 내 코드 중복 사전 차단 (DB UNIQUE(DEPT_ID, LEC_CODE) — 삭제(DEL) 상태도 행이 남아 있어 포함)
        const dup = lectures.find(
            (l) => l.deptId === form.deptId && l.lecCode === code && l.lecCodeId !== editTarget?.lecCodeId
        );
        if (dup) {
            alert(
                dup.valStatus === "DEL"
                    ? `같은 학과에 '${code}' 코드가 삭제 상태로 이미 존재합니다 ('${dup.lecCodName}'). 목록에서 해당 강의를 '사용'으로 복구해 사용하세요.`
                    : `같은 학과에 '${code}' 코드가 이미 존재합니다 ('${dup.lecCodName}').`
            );
            return;
        }
        setSubmitting(true);
        try {
            if (editTarget) {
                await updateAdminLecture(editTarget.lecCodeId, {
                    deptId: form.deptId,
                    lecCode: code,
                    lecCodName: form.lecCodName.trim(),
                });
            } else {
                await createAdminLecture({
                    deptId: form.deptId,
                    lecCode: code,
                    lecCodName: form.lecCodName.trim(),
                });
            }
            setShowModal(false);
            fetchLectures();
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409) {
                alert("같은 학과에 이미 존재하는 강의 코드입니다.");
            } else {
                alert("저장에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (lecture: ApiLecture, valStatus: string) => {
        if (valStatus === lecture.valStatus) return;
        if (valStatus === "DEL" && lecture.assignCount > 0) {
            alert(`배정된 강의가 ${lecture.assignCount}건 있어 삭제할 수 없습니다.`);
            return;
        }
        const label = STATUS_OPTIONS.find((o) => o.value === valStatus)?.label ?? valStatus;
        if (!confirm(`'${lecture.lecCodName}' 강의의 상태를 '${label}'(으)로 변경할까요?`)) return;
        try {
            await updateAdminLectureStatus(lecture.lecCodeId, valStatus);
            fetchLectures();
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 409) {
                alert("배정된 강의가 있어 삭제할 수 없습니다.");
            } else {
                alert("상태 변경에 실패했습니다.");
            }
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">강의 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학과별 강의(강의코드)를 등록·수정합니다. 삭제는 배정된 강의가 없을 때만 가능합니다.
                    </p>
                </div>
                {/* 학과 필터 + 검색 + 강의 추가 */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(Number(e.target.value))}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value={0}>전체 학과</option>
                        {depts.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                                {d.deptName}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="코드 또는 강의명 검색"
                            className="h-10 w-64 rounded-lg border border-border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
                    >
                        <Plus className="size-4" /> 강의 추가
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                        <tr>
                            <th className="px-5 py-3">번호</th>
                            <th className="px-5 py-3">학과</th>
                            <th className="px-5 py-3">코드</th>
                            <th className="px-5 py-3">강의명</th>
                            <th className="px-5 py-3">배정 강의</th>
                            <th className="px-5 py-3">상태</th>
                            <th className="px-5 py-3">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tableLoading ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                                    불러오는 중...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                                    {lectures.length === 0
                                        ? "등록된 강의가 없습니다."
                                        : "검색·필터 조건에 맞는 강의가 없습니다."}
                                </td>
                            </tr>
                        ) : (
                            pageLectures.map((l, i) => (
                                <tr key={l.lecCodeId} className="font-semibold text-slate-700 hover:bg-slate-50">
                                    <td className="px-5 py-4 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td className="px-5 py-4">{l.deptName}</td>
                                    <td className="px-5 py-4 font-mono font-black text-slate-950">{l.lecCode}</td>
                                    <td className="px-5 py-4">{l.lecCodName}</td>
                                    <td className="px-5 py-4">
                                        {l.assignCount > 0 ? (
                                            <button
                                                onClick={() => setAssignTarget(l)}
                                                title="배정 내역 보기"
                                                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                {l.assignCount}건
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-300">없음</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <select
                                            value={l.valStatus}
                                            onChange={(e) => handleStatusChange(l, e.target.value)}
                                            className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                                STATUS_OPTIONS.find((o) => o.value === l.valStatus)?.className ??
                                                "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {STATUS_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => openEdit(l)}
                                            title="수정"
                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

            {/* 배정 내역 모달 — 'N건' 클릭 시 학기·분반 리스트 */}
            {assignTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-black">배정 내역</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            <span className="font-mono font-black text-slate-950">{assignTarget.lecCode}</span> ·{" "}
                            {assignTarget.lecCodName} — 총 {assignTarget.assignCount}건
                        </p>
                        <ul className="mt-5 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                            {(assignsByCode.get(assignTarget.lecCodeId) ?? []).length === 0 ? (
                                <li className="px-4 py-2.5 text-sm text-slate-400">배정 내역을 불러오는 중...</li>
                            ) : (
                                (assignsByCode.get(assignTarget.lecCodeId) ?? []).map((a) => (
                                    <li key={a.lecId} className="px-4 py-2.5 text-sm font-semibold text-slate-700">
                                        {assignLabel(a)}
                                    </li>
                                ))
                            )}
                        </ul>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setAssignTarget(null)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-slate-50"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-black">{editTarget ? "강의 수정" : "강의 추가"}</h2>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-sm font-black">
                                    학과 <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={form.deptId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, deptId: Number(e.target.value) }))}
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value={0}>학과 선택</option>
                                    {depts.map((d) => (
                                        <option key={d.deptId} value={d.deptId}>
                                            {d.deptName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-black">
                                    강의 코드 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={form.lecCode}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            // 영문만 허용 — 소문자는 대문자로 자동 변환, 그 외 문자는 입력 자체를 차단
                                            lecCode: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, CODE_MAX),
                                        }))
                                    }
                                    placeholder="예) DTST"
                                    maxLength={CODE_MAX}
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className={`mt-1 text-xs ${form.lecCode.length >= CODE_MAX ? "text-rose-500" : "text-slate-400"}`}>
                                    영문만 입력 가능 (소문자는 대문자로 자동 변환) · 최대 {CODE_MAX}자 ({form.lecCode.length}/{CODE_MAX})
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-black">
                                    강의명 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={form.lecCodName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, lecCodName: e.target.value }))}
                                    placeholder="예) 자료구조"
                                    maxLength={NAME_MAX}
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className={`mt-1 text-xs ${form.lecCodName.length >= NAME_MAX ? "text-rose-500" : "text-slate-400"}`}>
                                    최대 {NAME_MAX}자 ({form.lecCodName.length}/{NAME_MAX})
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={submit}
                                disabled={submitting || !form.lecCode.trim() || !form.lecCodName.trim() || !form.deptId}
                                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {submitting ? "저장 중..." : editTarget ? "수정 완료" : "등록"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
