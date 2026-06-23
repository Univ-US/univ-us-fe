"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { getPostDetailHref } from "@/components/community/mypage/shared";
import {
    AlertTriangle,
    Check,
    ChevronDown,
    EyeOff,
    Eye,
    FileText,
    Flag,
    RefreshCw,
    Search,
    Trash2,
} from "lucide-react";
import {
    deleteAdminCommunityPost,
    getAdminCommunityPosts,
    setAdminCommunityPostBlind,
    type AdminCommunityBlindFilter,
    type AdminCommunityPost,
    type AdminCommunityPostPage,
    type AdminCommunityReportFilter,
} from "@/lib/adminCommunityApi";

type PaginationItem = number | "ellipsis";

function FilterDropdown<T extends string>({
    label,
    options,
    value,
    open,
    onToggle,
    onChange,
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    open: boolean;
    onToggle: () => void;
    onChange: (value: T) => void;
}) {
    const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

    return (
        <div className="relative" data-community-filter-dropdown>
            <button
                type="button"
                onClick={onToggle}
                className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-bold transition-all ${
                    open
                        ? "border-primary bg-white text-primary ring-2 ring-primary/15"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/20 hover:bg-white"
                }`}
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-black text-slate-400">{label}</span>
                    <span className="truncate">{selectedLabel}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-12 z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map((option) => {
                        const selected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onChange(option.value)}
                                className={`flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-bold transition-colors ${
                                    selected
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                            >
                                <span>{option.label}</span>
                                {selected && <Check className="size-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
    const WINDOW = 5;
    if (totalPages <= WINDOW + 2) {
        return Array.from({ length: totalPages }, (_, index) => index);
    }

    const lastPage = totalPages - 1;
    const start = Math.min(Math.max(page - Math.floor(WINDOW / 2), 0), totalPages - WINDOW);
    const end = start + WINDOW - 1;
    const items: PaginationItem[] = [];

    if (start > 0) {
        items.push(0);
        if (start > 1) items.push("ellipsis");
    }
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        items.push(pageNumber);
    }
    if (end < lastPage) {
        if (end < lastPage - 1) items.push("ellipsis");
        items.push(lastPage);
    }

    return items;
}

function formatDate(value: string) {
    return new Date(value).toLocaleString("ko-KR");
}

function extractErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError(error)) {
        return (error.response?.data as { message?: string } | undefined)?.message ?? fallback;
    }
    return fallback;
}

function Pagination({
    page,
    totalPages,
    first,
    last,
    onChange,
}: {
    page: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    onChange: (page: number) => void;
}) {
    const items = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);

    return (
        <div className="flex items-center justify-center border-t border-slate-100 px-5 py-3">
            <div className="flex flex-wrap items-center justify-center gap-1">
                <button
                    onClick={() => onChange(Math.max(0, page - 1))}
                    disabled={first}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                    aria-label="이전 페이지"
                >
                    ‹
                </button>
                {items.map((item, index) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            onClick={() => onChange(item)}
                            className={`h-8 w-8 rounded-lg text-xs font-bold ${
                                page === item
                                    ? "bg-primary text-white"
                                    : "text-slate-500 hover:bg-slate-50"
                            }`}
                            aria-current={page === item ? "page" : undefined}
                        >
                            {item + 1}
                        </button>
                    ) : (
                        <span
                            key={`ellipsis-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400"
                        >
                            ...
                        </span>
                    ),
                )}
                <button
                    onClick={() => onChange(Math.min(Math.max(0, totalPages - 1), page + 1))}
                    disabled={last}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                    aria-label="다음 페이지"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

export default function CommunityView() {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [boardId, setBoardId] = useState("");
    const [blind, setBlind] = useState<AdminCommunityBlindFilter>("ALL");
    const [report, setReport] = useState<AdminCommunityReportFilter>("ALL");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<AdminCommunityPostPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingPostId, setProcessingPostId] = useState<number | null>(null);
    const [openFilter, setOpenFilter] = useState<"blind" | "report" | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const parsedBoardId = boardId.trim() ? Number(boardId.trim()) : undefined;
            setResult(
                await getAdminCommunityPosts({
                    page,
                    keyword: keyword || undefined,
                    boardId:
                        parsedBoardId != null && Number.isFinite(parsedBoardId)
                            ? parsedBoardId
                            : undefined,
                    blind,
                    report,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load community posts.", loadError);
            setError("게시글 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [blind, boardId, keyword, page, report]);

    useEffect(() => {
        void loadPosts();
    }, [loadPosts]);

    useEffect(() => {
        if (!openFilter) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest("[data-community-filter-dropdown]")) return;
            setOpenFilter(null);
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [openFilter]);

    const toggleBlind = async (post: AdminCommunityPost) => {
        const nextBlind = post.isBlind === 0;
        if (
            !window.confirm(
                nextBlind
                    ? `"${post.title}" 게시글을 블라인드 처리할까요?`
                    : `"${post.title}" 게시글의 블라인드를 해제할까요?`,
            )
        ) {
            return;
        }

        setProcessingPostId(post.postId);
        try {
            await setAdminCommunityPostBlind(post.postId, nextBlind);
            await loadPosts();
        } catch (changeError) {
            console.error("Failed to change post blind status.", changeError);
            window.alert(extractErrorMessage(changeError, "블라인드 상태를 변경하지 못했습니다."));
        } finally {
            setProcessingPostId(null);
        }
    };

    const removePost = async (post: AdminCommunityPost) => {
        if (
            !window.confirm(
                `"${post.title}" 게시글을 삭제할까요?\n\n삭제된 게시글은 복구할 수 없습니다.`,
            )
        ) {
            return;
        }

        setProcessingPostId(post.postId);
        try {
            await deleteAdminCommunityPost(post.postId);
            await loadPosts();
        } catch (deleteError) {
            console.error("Failed to delete community post.", deleteError);
            window.alert(extractErrorMessage(deleteError, "게시글을 삭제하지 못했습니다."));
        } finally {
            setProcessingPostId(null);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">커뮤니티 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    우리 학교 게시글의 신고/블라인드 처리를 관리합니다.
                </p>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_120px_160px_160px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="제목, 작성자 검색"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition-colors focus:border-primary focus:bg-white"
                        />
                    </label>
                    <input
                        value={boardId}
                        onChange={(event) => {
                            setBoardId(event.target.value.replace(/[^0-9]/g, ""));
                            setPage(0);
                        }}
                        placeholder="게시판 ID"
                        inputMode="numeric"
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition-colors focus:border-primary focus:bg-white"
                    />
                    <FilterDropdown
                        label="노출"
                        value={blind}
                        open={openFilter === "blind"}
                        onToggle={() => setOpenFilter((current) => current === "blind" ? null : "blind")}
                        onChange={(nextBlind) => {
                            setBlind(nextBlind);
                            setPage(0);
                            setOpenFilter(null);
                        }}
                        options={[
                            { label: "전체 노출", value: "ALL" },
                            { label: "노출중", value: "VISIBLE" },
                            { label: "블라인드", value: "BLIND" },
                        ]}
                    />
                    <FilterDropdown
                        label="신고"
                        value={report}
                        open={openFilter === "report"}
                        onToggle={() => setOpenFilter((current) => current === "report" ? null : "report")}
                        onChange={(nextReport) => {
                            setReport(nextReport);
                            setPage(0);
                            setOpenFilter(null);
                        }}
                        options={[
                            { label: "전체 신고", value: "ALL" },
                            { label: "신고 있음", value: "REPORTED" },
                        ]}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="size-7 text-rose-500" />
                        <p className="mt-3 font-black text-slate-900">{error}</p>
                        <button
                            onClick={() => void loadPosts()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-sm shadow-primary/10"
                        >
                            <RefreshCw className="size-4" />
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                                <colgroup>
                                    <col className="w-[120px]" />
                                    <col className="w-[320px]" />
                                    <col className="w-[140px]" />
                                    <col className="w-[90px]" />
                                    <col className="w-[90px]" />
                                    <col className="w-[100px]" />
                                    <col className="w-[160px]" />
                                    <col className="w-[200px]" />
                                </colgroup>
                                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">게시판</th>
                                        <th className="px-5 py-3">제목</th>
                                        <th className="px-5 py-3">작성자</th>
                                        <th className="px-5 py-3">조회</th>
                                        <th className="px-5 py-3">신고</th>
                                        <th className="px-5 py-3">상태</th>
                                        <th className="px-5 py-3">작성일</th>
                                        <th className="px-5 py-3">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-16 text-center">
                                                <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
                                            </td>
                                        </tr>
                                    ) : (
                                        result?.content.map((post) => (
                                            <tr
                                                key={post.postId}
                                                className="font-semibold text-slate-700"
                                            >
                                                <td className="px-5 py-4 text-slate-500">
                                                    {post.boardName}
                                                </td>
                                                <td className="px-5 py-4 font-black text-slate-950">
                                                    <Link
                                                        href={getPostDetailHref(post.boardId, post.postId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 hover:text-primary hover:underline"
                                                    >
                                                        <FileText className="size-4 shrink-0 text-slate-400" />
                                                        <span className="truncate">{post.title}</span>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="break-words font-semibold text-slate-900">
                                                        {post.authorName}
                                                    </p>
                                                    {post.authorNickname && (
                                                        <p className="break-words text-xs text-slate-400">
                                                            {post.authorNickname}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {post.viewCount.toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {post.reportCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 font-black text-rose-600">
                                                            <Flag className="size-3.5" />
                                                            {post.reportCount}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">0</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                                                            post.isBlind
                                                                ? "bg-rose-100 text-rose-600"
                                                                : "bg-primary/10 text-primary"
                                                        }`}
                                                    >
                                                        {post.isBlind ? "블라인드" : "노출중"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDate(post.createdAt)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => void toggleBlind(post)}
                                                            disabled={processingPostId === post.postId}
                                                            title={post.isBlind ? "블라인드 해제" : "블라인드 처리"}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {post.isBlind ? (
                                                                <Eye className="size-4" />
                                                            ) : (
                                                                <EyeOff className="size-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => void removePost(post)}
                                                            disabled={processingPostId === post.postId}
                                                            title="삭제"
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && result?.content.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center font-bold text-slate-400">
                                                조건에 맞는 게시글이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={result?.totalPages ?? 0}
                            first={result?.first ?? true}
                            last={result?.last ?? true}
                            onChange={setPage}
                        />
                    </>
                )}
            </section>
        </div>
    );
}
