import api from "@/lib/api";

export interface HomeWidgetConfig {
    weather: boolean;
    aiChat: boolean;
    notice: boolean;
    meal: boolean;
    tel: boolean;
    shortcut: boolean;
}

const DEFAULT_WIDGET_CONFIG: HomeWidgetConfig = {
    weather: true, aiChat: true, notice: true, meal: true, tel: true, shortcut: true,
};

export const getHomeWidgetConfig = async (univId: number): Promise<HomeWidgetConfig> => {
    const res = await api.get<HomeWidgetConfig>(`/api/admin/universities/${univId}/home-config`);
    return res.data;
};

export const updateHomeWidgetConfig = async (univId: number, config: HomeWidgetConfig): Promise<void> => {
    await api.patch(`/api/admin/universities/${univId}/home-config`, config);
};

export { DEFAULT_WIDGET_CONFIG };

export interface NoticeConfig {
    defaultTarget: "ALL" | "STU" | "PROF";
    showTop: boolean;
    pushAlert: boolean;
}

export const DEFAULT_NOTICE_CONFIG: NoticeConfig = {
    defaultTarget: "ALL",
    showTop: true,
    pushAlert: false,
};

export const getNoticeConfig = async (univId: number): Promise<NoticeConfig> => {
    const res = await api.get<NoticeConfig>(`/api/admin/universities/${univId}/notice-config`);
    return res.data;
};

export const updateNoticeConfig = async (univId: number, config: NoticeConfig): Promise<void> => {
    await api.patch(`/api/admin/universities/${univId}/notice-config`, config);
};

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
    youtubeUrl: string | null;
    clubUrl: string | null;
    snsUrl: string | null;
}

export const updateAdminUniversityLinks = async (
    univId: number,
    links: { youtubeUrl: string | null; clubUrl: string | null; snsUrl: string | null },
) => {
    await api.patch(`/api/admin/universities/${univId}`, links);
};

export const ROLE_LABEL: Record<string, string> = {
    STU: "학생",
    PROF: "교수",
    ADM: "관리자",
    ALU: "졸업생",
    GUEST: "게스트",
    SUA: "최고관리자",
};

// INACTIVE는 과거에 커뮤니티 정지 용도로 쓰였던 값으로, 현재는 SUSPENDED와 동일하게 "정지"로 취급합니다.
export const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    INACTIVE: "정지",
    WITHDRAWN: "탈퇴",
};

export const STATUS_TO_API: Record<string, string> = {
    활성: "ACTIVE",
    정지: "SUSPENDED",
    탈퇴: "WITHDRAWN",
};

export const isSuspendedStatus = (status: string) => status === "SUSPENDED" || status === "INACTIVE";

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

export interface BulkSignupMemberInput {
    loginId: string;
    password: string;
    memberName: string;
    phoneNumber: string;
    gender: string; // M | F
    birth: string; // YYYYMMDD
    role: string; // STU | PROF
    deptId: number | null;
}

export interface BulkSignupResultItem {
    loginId: string;
    memberName: string;
    success: boolean;
    message: string | null; // 실패 시 사유 (예: "이미 사용 중인 로그인ID")
}

export interface BulkSignupResponse {
    successCount: number;
    failCount: number;
    results: BulkSignupResultItem[];
}

// 회원 일괄 등록 (엑셀 업로드 기반, BE 미구현 — 아래 계약으로 연동 예정)
export const bulkCreateMembers = async (members: BulkSignupMemberInput[]): Promise<BulkSignupResponse> => {
    const res = await api.post<BulkSignupResponse>("/api/admin/members/bulk", { members });
    return res.data;
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

export interface ApiDepartment {
    deptId: number;
    deptName: string;
    univId: number;
}

// 대학 목록 조회 (SUA용)
export const getAdminUniversities = async () => {
    const res = await api.get<ApiUniversity[]>("/api/admin/universities");
    return res.data;
};

// 학과 목록 조회
export const getAdminDepartments = async (univId: number) => {
    const res = await api.get<ApiDepartment[]>("/api/admin/departments", { params: { univId } });
    return res.data;
};



export interface ApiSemester {
    semId: number;
    semYear: number;
    semTerm: string; // SM1/SMR/SM2/WNT
    semStrDate: string; // YYYY-MM-DD (총 수업횟수 자동 계산용)
    semEndDate: string; // YYYY-MM-DD
}

export interface ApiProfessor {
    memberId: number;
    memberName: string;
    deptName: string | null;
}

export interface ApiLectureAssign {
    lecId: number;
    lecCodeId: number;
    lecCode: string;
    lecCodName: string;
    deptId: number;
    deptName: string;
    univId: number;
    univName: string;
    professorMemberId: number;
    professorName: string;
    semId: number;
    semYear: number;
    semTerm: string;
    lecSection: number;
    lecCredit: number | null;
    lecTotClasses: number | null;
    lecValStatus: string; // OPEN/PROG/CLSD/CNCL
    dayCodes: string | null; // "TUE,THU"
    startTime: string | null; // "10:30"
    endTime: string | null; // "12:00"
}

export interface ApiLecture {
    lecCodeId: number;
    deptId: number;
    deptName: string;
    univId: number;
    univName: string;
    lecCode: string;
    lecCodName: string;
    valStatus: string;
    assignCount: number; // 이 강의(코드)로 배정된 강의 수
}

export const SEM_TERM_LABEL: Record<string, string> = {
    SM1: "1학기",
    SMR: "여름학기",
    SM2: "2학기",
    WNT: "겨울학기",
};

export const DAY_LABEL: Record<string, string> = {
    MON: "월",
    TUE: "화",
    WED: "수",
    THU: "목",
    FRI: "금",
    SAT: "토",
    SUN: "일",
};

export const LEC_STATUS_LABEL: Record<string, string> = {
    OPEN: "수강신청중",
    PROG: "진행중",
    CLSD: "종료",
    CNCL: "폐강",
};

// 강의 목록 조회 (강의 관리 — 배정 강의 수 포함, 삭제(DEL) 상태도 포함 전체)
export const getAdminLectures = async (univId?: number) => {
    const res = await api.get<ApiLecture[]>("/api/admin/lectures", { params: { univId } });
    return res.data;
};

// 강의 등록 (강의 관리)
export const createAdminLecture = async (data: { deptId: number; lecCode: string; lecCodName: string }) => {
    await api.post("/api/admin/lectures", data);
};

// 강의 수정 (강의 관리)
export const updateAdminLecture = async (
    lectureId: number,
    data: { deptId: number; lecCode: string; lecCodName: string }
) => {
    await api.put(`/api/admin/lectures/${lectureId}`, data);
};

// 강의 상태 변경 (강의 관리)
export const updateAdminLectureStatus = async (lectureId: number, valStatus: string) => {
    await api.patch(`/api/admin/lectures/${lectureId}/status`, { valStatus });
};

// 강의 삭제 (강의 관리 — 소프트 삭제, 배정 강의 존재 시 409)
export const deleteAdminLecture = async (lectureId: number) => {
    await api.delete(`/api/admin/lectures/${lectureId}`);
};

// 배정 강의 목록 조회 (강의 배정)
export const getLectureAssigns = async (params?: { univId?: number; semId?: number }) => {
    const res = await api.get<ApiLectureAssign[]>("/api/admin/lectures/assigns", { params });
    return res.data;
};

// 강의 배정 등록 (분반 자동 채번 — 생성된 배정 강의 반환)
export const createLectureAssign = async (data: {
    lecCodeId: number;
    semId: number;
    professorMemberId: number;
    lecCredit?: number | null;
    lecTotClasses?: number | null;
    times?: { dayCode: string; startTime: string; endTime: string }[];
}) => {
    const res = await api.post<ApiLectureAssign>("/api/admin/lectures/assigns", data);
    return res.data;
};

// 강의 배정 수정 (수강신청중 OPEN 상태만 — 수정된 배정 강의 반환)
export const updateLectureAssign = async (
    lecId: number,
    data: {
        lecCodeId: number;
        semId: number;
        professorMemberId: number;
        lecCredit?: number | null;
        lecTotClasses?: number | null;
        times?: { dayCode: string; startTime: string; endTime: string }[];
    }
) => {
    const res = await api.put<ApiLectureAssign>(`/api/admin/lectures/assigns/${lecId}`, data);
    return res.data;
};

// 학기 목록 조회
export const getAdminSemesters = async () => {
    const res = await api.get<ApiSemester[]>("/api/admin/lectures/semesters");
    return res.data;
};

// 교수 목록 조회 (ADM: 본인 대학)
export const getAdminProfessors = async (univId?: number) => {
    const res = await api.get<ApiProfessor[]>("/api/admin/lectures/professors", { params: { univId } });
    return res.data;
};

