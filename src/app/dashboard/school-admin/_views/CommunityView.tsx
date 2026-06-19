"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { getPostDetailHref } from "@/components/community/mypage/shared";
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
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
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-sm font-bold text-slate-400">
                {totalPages === 0 ? 0 : page + 1} / {totalPages} 페이지
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    onClick={() => onChange(Math.max(0, page - 1))}
                    disabled={first}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="이전 페이지"
                >
                    <ChevronLeft className="size-4" />
                </button>
                {items.map((item, index) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            onClick={() => onChange(item)}
                            className={`size-9 rounded-lg text-sm font-black ${
                                page === item
                                    ? "bg-emerald-700 text-white"
                                    : "border border-slate-200 text-slate-600"
                            }`}
                            aria-current={page === item ? "page" : undefined}
                        >
                            {item + 1}
                        </button>
                    ) : (
                        <span
                            key={`ellipsis-${index}`}
                            className="flex size-7 items-center justify-center text-sm font-black text-slate-400"
                        >
                            ...
                        </span>
                    ),
                )}
                <button
                    onClick={() => onChange(Math.min(Math.max(0, totalPages - 1), page + 1))}
                    disabled={last}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="다음 페이지"
                >
                    <ChevronRight className="size-4" />
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

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_120px_140px_140px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="제목, 작성자 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
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
                        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    />
                    <select
                        value={blind}
                        onChange={(event) => {
                            setBlind(event.target.value as AdminCommunityBlindFilter);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 노출 상태</option>
                        <option value="VISIBLE">노출중</option>
                        <option value="BLIND">블라인드</option>
                    </select>
                    <select
                        value={report}
                        onChange={(event) => {
                            setReport(event.target.value as AdminCommunityReportFilter);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 신고 상태</option>
                        <option value="REPORTED">신고 1건 이상</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                {error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="size-7 text-rose-500" />
                        <p className="mt-3 font-black text-slate-900">{error}</p>
                        <button
                            onClick={() => void loadPosts()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white"
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
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
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
                                                <RefreshCw className="mx-auto size-6 animate-spin text-emerald-700" />
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
                                                        className="flex items-center gap-2 hover:text-emerald-700 hover:underline"
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
                                                                : "bg-emerald-100 text-emerald-700"
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
