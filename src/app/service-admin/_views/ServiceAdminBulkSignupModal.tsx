"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Download,
    LoaderCircle,
    Search,
    Upload,
    UsersRound,
    X,
} from "lucide-react";
import {
    createServiceAdminBulkSignup,
    getServiceAdminSchools,
    precheckServiceAdminBulkSignup,
    type ServiceAdminBulkSignupMemberInput,
    type ServiceAdminBulkSignupPrecheck,
    type ServiceAdminSchool,
} from "@/lib/serviceAdminApi";
import {
    downloadBulkSignupTemplate,
    parseBulkSignupExcel,
    type BulkSignupRow,
} from "@/lib/bulkSignupExcel";

type Step = "upload" | "preview";

function getErrorMessage(error: unknown, fallback: string) {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
    ) {
        return error.response.data.message;
    }
    return fallback;
}

function getResponseStatus(error: unknown) {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "status" in error.response &&
        typeof error.response.status === "number"
    ) {
        return error.response.status;
    }
    return null;
}

function toRequestMembers(rows: BulkSignupRow[]): ServiceAdminBulkSignupMemberInput[] {
    return rows.map((row) => ({
        loginId: row.loginId,
        password: row.password,
        memberName: row.memberName,
        phoneNumber: row.phoneNumber,
        gender: row.gender,
        birth: row.birth,
        role: row.role as "STU" | "PROF",
        deptId: row.deptId,
    }));
}

export default function ServiceAdminBulkSignupModal({
    onClose,
    onCompleted,
}: {
    onClose: () => void;
    onCompleted: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>("upload");
    const [schoolKeyword, setSchoolKeyword] = useState("");
    const [schoolOptions, setSchoolOptions] = useState<ServiceAdminSchool[]>([]);
    const [schoolLoading, setSchoolLoading] = useState(true);
    const [schoolError, setSchoolError] = useState("");
    const [isSchoolListOpen, setIsSchoolListOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<ServiceAdminSchool | null>(null);
    const [fileName, setFileName] = useState("");
    const [parsing, setParsing] = useState(false);
    const [rows, setRows] = useState<BulkSignupRow[]>([]);
    const [precheck, setPrecheck] = useState<ServiceAdminBulkSignupPrecheck | null>(null);
    const [requestError, setRequestError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            void (async () => {
                setSchoolLoading(true);
                setSchoolError("");
                try {
                    const response = await getServiceAdminSchools({
                        page: 0,
                        keyword: schoolKeyword.trim() || undefined,
                        subscriptionStatus: "ACTIVE",
                        sort: "NAME_ASC",
                    });
                    if (active) setSchoolOptions(response.content);
                } catch (error) {
                    console.error("Failed to load active subscription schools.", error);
                    if (active) setSchoolError("활성 구독 학교 목록을 불러오지 못했습니다.");
                } finally {
                    if (active) setSchoolLoading(false);
                }
            })();
        }, 200);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [schoolKeyword]);

    const serverErrorsByRow = useMemo(() => {
        const errorsByRow = new Map<number, string[]>();
        precheck?.errors.forEach((error) => {
            const messages = errorsByRow.get(error.rowNumber) ?? [];
            messages.push(error.message);
            errorsByRow.set(error.rowNumber, messages);
        });
        return errorsByRow;
    }, [precheck]);

    const rowErrors = (row: BulkSignupRow) => [
        ...row.errors,
        ...(serverErrorsByRow.get(row.rowNumber) ?? []),
    ];
    const hasRowErrors = rows.some((row) => rowErrors(row).length > 0);
    const canRegister = Boolean(precheck?.canRegister) && !hasRowErrors;

    const resetFile = () => {
        setStep("upload");
        setFileName("");
        setRows([]);
        setPrecheck(null);
        setRequestError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const selectSchool = (school: ServiceAdminSchool) => {
        setSelectedSchool(school);
        setSchoolKeyword(school.univName);
        setIsSchoolListOpen(false);
        resetFile();
    };

    const loadPrecheck = async (parsedRows: BulkSignupRow[], school: ServiceAdminSchool) => {
        setRequestError("");
        try {
            setPrecheck(
                await precheckServiceAdminBulkSignup({
                    univId: school.univId,
                    members: toRequestMembers(parsedRows),
                }),
            );
        } catch (error) {
            setPrecheck(null);
            setRequestError(getErrorMessage(error, "등록 가능 여부를 확인하지 못했습니다."));
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedSchool) return;

        setParsing(true);
        setFileName(file.name);
        setRows([]);
        setPrecheck(null);
        setRequestError("");
        try {
            const parsedRows = await parseBulkSignupExcel(file, selectedSchool.univId);
            if (parsedRows.length === 0) {
                setRequestError("파일에서 읽을 수 있는 데이터가 없습니다.");
                return;
            }
            setRows(parsedRows);
            setStep("preview");
            await loadPrecheck(parsedRows, selectedSchool);
        } catch (error) {
            console.error("Failed to parse bulk signup file.", error);
            setRequestError("엑셀 파일을 읽지 못했습니다. 양식을 다시 확인해 주세요.");
        } finally {
            setParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!selectedSchool || !canRegister) return;

        setSubmitting(true);
        setRequestError("");
        try {
            const result = await createServiceAdminBulkSignup({
                univId: selectedSchool.univId,
                members: toRequestMembers(rows),
            });
            window.alert(`${result.createdCount}명의 이용자를 등록했습니다.`);
            onCompleted();
            onClose();
        } catch (error) {
            if (getResponseStatus(error) === 409) {
                await loadPrecheck(rows, selectedSchool);
            } else {
                setRequestError(getErrorMessage(error, "일괄 회원가입 처리에 실패했습니다."));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="service-admin-bulk-signup-title"
                className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl bg-white p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="service-admin-bulk-signup-title" className="text-lg font-black text-slate-900">
                            일괄 회원가입
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            활성 구독 학교를 선택한 뒤 엑셀 파일로 이용자를 등록합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="닫기"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                    <section>
                        <label className="mb-2 block text-sm font-black text-slate-700">대상 학교</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={schoolKeyword}
                                onFocus={() => setIsSchoolListOpen(true)}
                                onChange={(event) => {
                                    setSchoolKeyword(event.target.value);
                                    setSelectedSchool(null);
                                    resetFile();
                                    setIsSchoolListOpen(true);
                                }}
                                placeholder="활성 구독 학교 검색"
                                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold outline-none transition focus:border-primary"
                            />
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                            {isSchoolListOpen && (
                                <div className="absolute z-10 mt-2 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    {schoolLoading && (
                                        <p className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-slate-500">
                                            <LoaderCircle className="size-4 animate-spin" /> 학교를 불러오는 중입니다.
                                        </p>
                                    )}
                                    {!schoolLoading && schoolError && (
                                        <p className="px-3 py-3 text-sm font-semibold text-rose-600">{schoolError}</p>
                                    )}
                                    {!schoolLoading && !schoolError && schoolOptions.length === 0 && (
                                        <p className="px-3 py-3 text-sm font-semibold text-slate-500">
                                            선택 가능한 활성 구독 학교가 없습니다.
                                        </p>
                                    )}
                                    {!schoolLoading && schoolOptions.map((school) => (
                                        <button
                                            key={school.univId}
                                            type="button"
                                            onClick={() => selectSchool(school)}
                                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-primary/10"
                                        >
                                            <span className="font-bold text-slate-800">{school.univName}</span>
                                            <span className="shrink-0 text-xs font-semibold text-slate-500">
                                                {school.planName ?? "플랜 확인 중"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={selectedSchool ? "" : "pointer-events-none opacity-50"}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-700">엑셀 파일</p>
                            <button
                                type="button"
                                onClick={downloadBulkSignupTemplate}
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary"
                            >
                                <Download className="size-4" /> 양식 다운로드
                            </button>
                        </div>
                        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/40 px-4 text-center hover:bg-primary/10">
                            {parsing ? <LoaderCircle className="size-6 animate-spin text-primary" /> : <Upload className="size-6 text-primary" />}
                            <span className="text-sm font-bold text-primary">
                                {parsing ? "파일을 확인하는 중입니다." : "엑셀 파일을 선택해 주세요."}
                            </span>
                            <span className="text-xs text-slate-500">.xlsx 파일만 업로드할 수 있습니다.</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                disabled={!selectedSchool || parsing}
                                onChange={handleFileChange}
                            />
                        </label>
                    </section>

                    {step === "preview" && precheck && (
                        <section className="space-y-3">
                            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold text-slate-500">적용 플랜</p>
                                    <p className="mt-1 font-black text-slate-800">{precheck.planName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500">이용자 수</p>
                                    <p className="mt-1 font-black text-slate-800">
                                        {precheck.currentMemberCount.toLocaleString()} / {precheck.maxMemberCount.toLocaleString()}명
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500">등록 예정</p>
                                    <p className="mt-1 font-black text-slate-800">
                                        {precheck.requestedMemberCount.toLocaleString()}명
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500">잔여 등록 가능</p>
                                    <p className="mt-1 font-black text-slate-800">
                                        {precheck.remainingMemberCount.toLocaleString()}명
                                    </p>
                                </div>
                            </div>

                            <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
                                canRegister
                                    ? "border-primary/20 bg-primary/5 text-primary"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}>
                                {canRegister ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                                <span>
                                    {canRegister
                                        ? "등록 가능한 상태입니다. 등록 시 서버에서 한 번 더 검증합니다."
                                        : precheck.reason ?? "엑셀 데이터를 다시 확인해 주세요."}
                                </span>
                            </div>
                        </section>
                    )}

                    {step === "preview" && (
                        <section>
                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                <span className="font-bold text-slate-700">{fileName}</span>
                                <span className="text-slate-500">총 {rows.length}명</span>
                            </div>
                            <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                                <table className="w-full min-w-[640px] text-left text-xs">
                                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2.5 font-extrabold">#</th>
                                            <th className="px-3 py-2.5 font-extrabold">이름</th>
                                            <th className="px-3 py-2.5 font-extrabold">로그인 ID</th>
                                            <th className="px-3 py-2.5 font-extrabold">구분</th>
                                            <th className="px-3 py-2.5 font-extrabold">학과</th>
                                            <th className="px-3 py-2.5 font-extrabold">검증 결과</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map((row) => {
                                            const errors = rowErrors(row);
                                            return (
                                                <tr key={row.rowNumber} className={errors.length > 0 ? "bg-rose-50/70" : ""}>
                                                    <td className="px-3 py-2.5 text-slate-400">{row.rowNumber}</td>
                                                    <td className="px-3 py-2.5 font-semibold text-slate-800">{row.memberName || "-"}</td>
                                                    <td className="px-3 py-2.5 text-slate-700">{row.loginId || "-"}</td>
                                                    <td className="px-3 py-2.5 text-slate-700">{row.role || "-"}</td>
                                                    <td className="px-3 py-2.5 text-slate-700">{row.deptName || "-"}</td>
                                                    <td className="px-3 py-2.5">
                                                        {errors.length === 0 ? (
                                                            <span className="font-bold text-primary">정상</span>
                                                        ) : (
                                                            <span className="font-semibold text-rose-600">{errors.join(" / ")}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {requestError && (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <span>{requestError}</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <UsersRound className="size-4" /> 한 행이라도 실패하면 전체 등록이 취소됩니다.
                    </p>
                    <div className="flex gap-2">
                        {step === "preview" && (
                            <button
                                type="button"
                                onClick={resetFile}
                                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                파일 다시 선택
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={!canRegister || submitting}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {submitting && <LoaderCircle className="size-4 animate-spin" />}
                            {submitting ? "등록 중" : "등록"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
