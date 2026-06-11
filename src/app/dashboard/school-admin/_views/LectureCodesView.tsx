"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getAdminUniversities,
    getAdminDepartments,
    getLectureCodes,
    createLectureCode,
    updateLectureCode,
    deleteLectureCode,
    updateLectureCodeStatus,
    type ApiUniversity,
    type ApiDepartment,
    type ApiLectureCode,
} from "@/lib/adminApi";

const STATUS_OPTIONS = [
    { value: "ACT", label: "사용", className: "bg-emerald-100 text-emerald-700" },
    { value: "HID", label: "숨김", className: "bg-amber-100 text-amber-700" },
    { value: "DEL", label: "삭제", className: "bg-rose-100 text-rose-600" },
];

type EditTarget = { lecCodeId: number } | null;

export default function LectureCodesView() {
    const { role, univId: myUnivId } = useAuthStore();
    const isSua = role === "SUA";

    const [universities, setUniversities] = useState<ApiUniversity[]>([]);
    const [selectedUnivId, setSelectedUnivId] = useState<number | null>(null);
    const [depts, setDepts] = useState<ApiDepartment[]>([]);
    const [deptsLoading, setDeptsLoading] = useState(false);
    const [deptsError, setDeptsError] = useState<string | null>(null);
    const [lectureCodes, setLectureCodes] = useState<ApiLectureCode[]>([]);
    const [tableLoading, setTableLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget>(null);
    const [form, setForm] = useState({ deptId: 0, lecCode: "", lecCodName: "" });
    const [submitting, setSubmitting] = useState(false);

    // ADM: authStore가 localStorage 복원 완료 후 univId가 들어오면 selectedUnivId 동기화
    useEffect(() => {
        if (!isSua && myUnivId != null && selectedUnivId == null) {
            setSelectedUnivId(myUnivId);
        }
    }, [isSua, myUnivId, selectedUnivId]);

    // SUA: 대학 목록 로드
    useEffect(() => {
        if (isSua) {
            getAdminUniversities().then(setUniversities).catch(console.error);
        }
    }, [isSua]);

    // 대학 변경 시 학과 목록 로드
    useEffect(() => {
        if (!selectedUnivId) {
            setDepts([]);
            return;
        }
        setDeptsLoading(true);
        setDeptsError(null);
        getAdminDepartments(selectedUnivId)
            .then(setDepts)
            .catch((err) => {
                console.error(err);
                setDeptsError(`학과 로드 실패 (${err?.response?.status ?? err?.message})`);
            })
            .finally(() => setDeptsLoading(false));
    }, [selectedUnivId]);

    const fetchLectureCodes = (univId = selectedUnivId) => {
        if (!univId) return;
        setTableLoading(true);
        getLectureCodes(univId)
            .then(setLectureCodes)
            .catch(console.error)
            .finally(() => setTableLoading(false));
    };

    // 대학 변경 시 강의코드 목록 로드
    useEffect(() => {
        if (!selectedUnivId) {
            setLectureCodes([]);
            return;
        }
        fetchLectureCodes(selectedUnivId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUnivId]);

    // 모달이 열려 있는 동안 학과 목록이 늦게 도착하면 첫 항목 자동 선택
    useEffect(() => {
        if (showModal && !editTarget && depts.length > 0 && form.deptId === 0) {
            setForm((prev) => ({ ...prev, deptId: depts[0].deptId }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [depts, showModal]);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ deptId: depts[0]?.deptId ?? 0, lecCode: "", lecCodName: "" });
        setShowModal(true);
    };

    const openEdit = (lc: ApiLectureCode) => {
        setEditTarget({ lecCodeId: lc.lecCodeId });
        setForm({ deptId: lc.deptId, lecCode: lc.lecCode, lecCodName: lc.lecCodName });
        setShowModal(true);
    };

    const submit = async () => {
        if (!form.lecCode.trim() || !form.lecCodName.trim() || !form.deptId) return;
        setSubmitting(true);
        try {
            if (editTarget) {
                await updateLectureCode(editTarget.lecCodeId, {
                    deptId: form.deptId,
                    lecCode: form.lecCode,
                    lecCodName: form.lecCodName,
                });
            } else {
                await createLectureCode({
                    deptId: form.deptId,
                    lecCode: form.lecCode,
                    lecCodName: form.lecCodName,
                });
            }
            setShowModal(false);
            fetchLectureCodes();
        } catch {
            alert("저장에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (lecCodeId: number, valStatus: string) => {
        try {
            await updateLectureCodeStatus(lecCodeId, valStatus);
            setLectureCodes((prev) =>
                prev.map((lc) => (lc.lecCodeId === lecCodeId ? { ...lc, valStatus } : lc))
            );
        } catch {
            alert("상태 변경에 실패했습니다.");
        }
    };

    const handleDelete = async (lecCodeId: number) => {
        if (!confirm("강의코드를 삭제하시겠습니까?")) return;
        try {
            await deleteLectureCode(lecCodeId);
            fetchLectureCodes();
        } catch {
            alert("삭제에 실패했습니다.");
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">강의코드 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">학과별 강의코드를 등록·수정·삭제합니다.</p>
                </div>
                {!!selectedUnivId && (
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
                    >
                        + 강의코드 추가
                    </button>
                )}
            </div>

            {isSua && (
                <div className="flex items-center gap-3">
                    <label className="shrink-0 text-sm font-bold text-slate-700">대학 선택</label>
                    <select
                        value={selectedUnivId ?? ""}
                        onChange={(e) => setSelectedUnivId(Number(e.target.value) || null)}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">대학을 선택하세요</option>
                        {universities.map((u) => (
                            <option key={u.univId} value={u.univId}>
                                {u.univName}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                        <tr>
                            <th className="px-5 py-3">학과</th>
                            <th className="px-5 py-3">코드</th>
                            <th className="px-5 py-3">과목명</th>
                            <th className="px-5 py-3">상태</th>
                            <th className="px-5 py-3">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tableLoading ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                    불러오는 중...
                                </td>
                            </tr>
                        ) : !selectedUnivId ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                    대학을 선택하세요.
                                </td>
                            </tr>
                        ) : lectureCodes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                    등록된 강의코드가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            lectureCodes.map((lc) => (
                                <tr key={lc.lecCodeId} className="font-semibold text-slate-700 hover:bg-slate-50">
                                    <td className="px-5 py-4">{lc.deptName}</td>
                                    <td className="px-5 py-4 font-mono font-black text-slate-950">{lc.lecCode}</td>
                                    <td className="px-5 py-4">{lc.lecCodName}</td>
                                    <td className="px-5 py-4">
                                        <select
                                            value={lc.valStatus}
                                            onChange={(e) => handleStatusChange(lc.lecCodeId, e.target.value)}
                                            className={`rounded-full px-2 py-0.5 text-xs font-bold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                                STATUS_OPTIONS.find((s) => s.value === lc.valStatus)?.className ?? "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {STATUS_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEdit(lc)}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lc.lecCodeId)}
                                                className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-black">
                            {editTarget ? "강의코드 수정" : "강의코드 추가"}
                        </h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-sm font-black">
                                    학과 <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={form.deptId}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, deptId: Number(e.target.value) }))
                                    }
                                    disabled={!!editTarget || deptsLoading}
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                    {deptsLoading ? (
                                        <option value={0}>불러오는 중...</option>
                                    ) : deptsError ? (
                                        <option value={0}>{deptsError}</option>
                                    ) : depts.length === 0 ? (
                                        <option value={0}>등록된 학과가 없습니다</option>
                                    ) : (
                                        <>
                                            <option value={0} disabled>학과를 선택하세요</option>
                                            {depts.map((d) => (
                                                <option key={d.deptId} value={d.deptId}>
                                                    {d.deptName}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-black">
                                    코드 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={form.lecCode}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            lecCode: e.target.value.toUpperCase(),
                                        }))
                                    }
                                    placeholder="예) DTST"
                                    maxLength={20}
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-black">
                                    과목명 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={form.lecCodName}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, lecCodName: e.target.value }))
                                    }
                                    placeholder="예) 자료구조"
                                    className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
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
                                disabled={
                                    submitting ||
                                    deptsLoading ||
                                    !form.lecCode.trim() ||
                                    !form.lecCodName.trim() ||
                                    !form.deptId
                                }
                                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {submitting ? "저장 중..." : editTarget ? "수정 완료" : "▶ 등록"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
