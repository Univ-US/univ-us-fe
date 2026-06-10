import api from "@/lib/api";

export interface ApiMember {
    memberId: number;
    univId: number;
    univName: string | null;
    schoolPhone: string | null;
    address: string | null;
    deptId: number | null;
    memberName: string;
    role: string;
    phoneNumber: string | null;
    gender: string | null;
    status: string;
    createdAt: string;
    communityNickname: string | null;
}

export interface ApiNotice {
    noticeId: number;
    memberId: number;
    title: string;
    content: string;
    target: "ALL" | "STU" | "PROF";
    postedAt: string;
    updatedAt: string | null;
}

export interface ApiUniversity {
    univId: number;
    univName: string;
    schoolPhone: string | null;
    homepage: string | null;
    address: string | null;
}

export const ROLE_LABEL: Record<string, string> = {
    STU: "학생",
    PROF: "교수",
    ADM: "관리자",
    ALU: "졸업생",
    GUEST: "게스트",
    SUA: "최고관리자",
};

export const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    WITHDRAWN: "탈퇴",
};

export const STATUS_TO_API: Record<string, string> = {
    활성: "ACTIVE",
    정지: "SUSPENDED",
    탈퇴: "WITHDRAWN",
};

// 회원 목록 조회 (BE는 univId 필터 미지원 → 클라이언트에서 필터링)
export const getAdminMembers = async (params?: { memberName?: string }) => {
    const res = await api.get<{ list: ApiMember[]; total: number }>("/api/admin/members", {
        params: { page: 1, size: 9999, ...params },
    });
    return res.data;
};

// 회원 상태 변경
export const updateMemberStatus = async (memberId: number, status: string) => {
    await api.patch(`/api/admin/members/${memberId}/status`, { memberId, status });
};

// 공지 목록 조회
export const getAdminNotices = async () => {
    const res = await api.get<ApiNotice[]>("/api/admin/notices");
    return res.data;
};

// 공지 등록
export const createAdminNotice = async (data: {
    memberId: number;
    title: string;
    content: string;
    target: string;
}) => {
    await api.post("/api/admin/notices", data);
};

// 공지 수정
export const updateAdminNotice = async (
    noticeId: number,
    data: { memberId: number; title: string; content: string; target: string }
) => {
    await api.put(`/api/admin/notices/${noticeId}`, data);
};

// 공지 삭제
export const deleteAdminNotice = async (noticeId: number) => {
    await api.delete(`/api/admin/notices/${noticeId}`);
};

// 대학 단건 조회
export const getAdminUniversity = async (univId: number) => {
    const res = await api.get<ApiUniversity>(`/api/admin/universities/${univId}`);
    return res.data;
};

export interface ApiSupport {
    supportId: number;
    univId: number;
    memberName: string;
    contact: string;
    message: string;
    status: number; // 0: 대기, 1: 처리완료
    createdAt: string;
}

export const SUPPORT_STATUS_LABEL: Record<number, string> = {
    0: "대기",
    1: "처리완료",
};

// 문의 목록 조회
export const getAdminSupports = async (univId: number) => {
    const res = await api.get<ApiSupport[]>(`/api/admin/support`, { params: { univId } });
    return res.data;
};

// 문의 상태 변경
export const updateSupportStatus = async (supportId: number, status: number) => {
    await api.patch(`/api/admin/support/${supportId}/status`, { status });
};
