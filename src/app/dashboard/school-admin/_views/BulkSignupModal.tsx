"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { bulkCreateMembers, ROLE_LABEL, type BulkSignupResponse } from "@/lib/adminApi";
import { downloadBulkSignupTemplate, parseBulkSignupExcel, type BulkSignupRow } from "@/lib/bulkSignupExcel";

type Step = "upload" | "preview";

export default function BulkSignupModal({
    univId,
    onClose,
    onCompleted,
}: {
    univId: number;
    onClose: () => void;
    onCompleted: (result: BulkSignupResponse) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>("upload");
    const [fileName, setFileName] = useState("");
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rows, setRows] = useState<BulkSignupRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const validRows = rows.filter((r) => r.errors.length === 0);
    const invalidRows = rows.filter((r) => r.errors.length > 0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setParseError(null);
        setParsing(true);
        try {
            const parsed = await parseBulkSignupExcel(file, univId);
            if (parsed.length === 0) {
                setParseError("파일에서 읽을 수 있는 데이터가 없습니다.");
                return;
            }
            setRows(parsed);
            setStep("preview");
        } catch {
            setParseError("파일을 읽는 중 오류가 발생했습니다. 양식을 다시 확인해주세요.");
        } finally {
            setParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (validRows.length === 0) return;
        setSubmitting(true);
        try {
            const res = await bulkCreateMembers(
                validRows.map((r) => ({
                    loginId: r.loginId,
                    password: r.password,
                    memberName: r.memberName,
                    phoneNumber: r.phoneNumber,
                    gender: r.gender,
                    birth: r.birth,
                    role: r.role,
                    deptId: r.deptId,
                })),
            );
            onCompleted(res);
            onClose();
        } catch {
            alert("일괄 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setStep("upload");
        setRows([]);
        setFileName("");
        setParseError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black">일괄 회원가입</h2>
                        <p className="mt-1 text-xs text-slate-500">엑셀(.xlsx) 양식으로 여러 회원을 한 번에 등록합니다.</p>
                    </div>
                    <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
                </div>

                <div className="mt-5 flex-1 overflow-y-auto">
                    {step === "upload" && (
                        <div className="space-y-4">
                            <button
                                onClick={downloadBulkSignupTemplate}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold hover:bg-slate-50"
                            >
                                <Download className="size-4" /> 엑셀 양식 다운로드
                            </button>

                            <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/50 px-4 py-8 text-center hover:bg-primary/10">
                                <Upload className="size-6 text-primary" />
                                <span className="text-sm font-bold text-primary">
                                    {parsing ? "파일을 읽는 중..." : "작성한 엑셀 파일을 선택하세요"}
                                </span>
                                <span className="text-xs text-slate-500">.xlsx 파일만 지원</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx"
                                    className="hidden"
                                    disabled={parsing}
                                    onChange={handleFileChange}
                                />
                            </label>

                            {parseError && <p className="text-sm font-medium text-rose-500">{parseError}</p>}

                            <p className="text-xs text-slate-500">초기 비밀번호는 생년월일 마지막 6자리(YYMMDD)로 자동 설정됩니다.</p>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                                <span className="font-bold text-slate-700">{fileName}</span>
                                <span className="text-slate-400">·</span>
                                <span>총 {rows.length}행</span>
                                <span className="font-bold text-primary">정상 {validRows.length}행</span>
                                {invalidRows.length > 0 && (
                                    <span className="font-bold text-rose-500">오류 {invalidRows.length}행</span>
                                )}
                            </div>

                            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 font-bold text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">이름</th>
                                            <th className="px-3 py-2">로그인ID</th>
                                            <th className="px-3 py-2">구분</th>
                                            <th className="px-3 py-2">학과</th>
                                            <th className="px-3 py-2">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map((r) => (
                                            <tr key={r.rowNumber} className={r.errors.length > 0 ? "bg-rose-50" : ""}>
                                                <td className="px-3 py-2 text-slate-400">{r.rowNumber}</td>
                                                <td className="px-3 py-2 font-semibold">{r.memberName || "—"}</td>
                                                <td className="px-3 py-2">{r.loginId || "—"}</td>
                                                <td className="px-3 py-2">{ROLE_LABEL[r.role] ?? r.role ?? "—"}</td>
                                                <td className="px-3 py-2">{r.deptName || "—"}</td>
                                                <td className="px-3 py-2">
                                                    {r.errors.length === 0 ? (
                                                        <span className="font-bold text-primary">정상</span>
                                                    ) : (
                                                        <span className="text-rose-500">{r.errors.join(" / ")}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {invalidRows.length > 0 && (
                                <p className="text-xs text-slate-500">오류가 있는 행은 등록되지 않습니다. 파일을 수정해 다시 업로드해주세요.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    {step === "preview" && (
                        <button onClick={reset} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">
                            다시 업로드
                        </button>
                    )}
                    <button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">
                        취소
                    </button>
                    {step === "preview" && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || validRows.length === 0}
                            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-sm shadow-primary/10 hover:bg-primary/90 disabled:opacity-50"
                        >
                            {submitting ? "등록 중..." : `${validRows.length}명 등록하기`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
