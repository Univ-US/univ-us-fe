import api from "@/lib/api";

export type AdminCommunityBlindFilter = "ALL" | "BLIND" | "VISIBLE";
export type AdminCommunityReportFilter = "ALL" | "REPORTED";

export interface AdminCommunityPost {
    postId: number;
    memberId: number;
    authorName: string;
    authorNickname: string;
    boardId: number;
    boardName: string;
    title: string;
    viewCount: number;
    reportCount: number;
    isBlind: 0 | 1;
    createdAt: string;
}

export interface AdminCommunityPostPage {
    content: AdminCommunityPost[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface AdminCommunityPostQuery {
    page: number;
    keyword?: string;
    boardId?: number;
    blind?: AdminCommunityBlindFilter;
    report?: AdminCommunityReportFilter;
}

export async function getAdminCommunityPosts(params: AdminCommunityPostQuery) {
    const response = await api.get<AdminCommunityPostPage>(
        "/api/service-admin/community/posts",
        { params },
    );
    return response.data;
}

export async function setAdminCommunityPostBlind(postId: number, blind: boolean) {
    const response = await api.patch<AdminCommunityPost>(
        `/api/service-admin/community/posts/${postId}/blind`,
        { blind },
    );
    return response.data;
}

export async function deleteAdminCommunityPost(postId: number) {
    await api.delete(`/api/service-admin/community/posts/${postId}`);
}
