import type {
    AdminPaymentMethod,
    AdminPaymentStatus,
    MemberActivitySummary,
    MemberReservationSummary,
    ServiceMember,
    ServicePayment,
    ServiceSchool,
    SubscriptionPlan,
} from "./_types";

export const PLAN_PRICE: Record<SubscriptionPlan, number> = {
    Basic: 490000,
    Pro: 1490000,
    Enterprise: 3100000,
};

export const SERVICE_SCHOOLS: ServiceSchool[] = [
    {
        id: 1,
        name: "가람대학교",
        category: "대학교",
        address: "서울특별시 성북구 가람로 12",
        phone: "02-2100-1001",
        adminName: "김서윤",
        adminEmail: "admin@garam.ac.kr",
        plan: "Pro",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-08-12",
        subscriptionEndedAt: null,
        memberCount: 1840,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-07-03",
        paymentStatus: "PAID",
        joinedAt: "2025-08-12",
        portoneCustomerId: "cus_garam_01",
    },
    {
        id: 2,
        name: "나래사이버대학교",
        category: "사이버대학교",
        address: "경기도 성남시 분당구 나래로 88",
        phone: "031-710-2200",
        adminName: "박하린",
        adminEmail: "admin@narae.ac.kr",
        plan: "Enterprise",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-05-21",
        subscriptionEndedAt: null,
        memberCount: 2420,
        monthlyRevenue: 3100000,
        nextBillingAt: "2026-07-05",
        paymentStatus: "PAID",
        joinedAt: "2025-05-21",
        portoneCustomerId: "cus_narae_02",
    },
    {
        id: 3,
        name: "다온간호전문학원",
        category: "전문학원",
        address: "부산광역시 부산진구 중앙대로 140",
        phone: "051-810-3321",
        adminName: "정다은",
        adminEmail: "admin@daon.kr",
        plan: "Basic",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2026-01-09",
        subscriptionEndedAt: null,
        memberCount: 312,
        monthlyRevenue: 490000,
        nextBillingAt: "2026-07-08",
        paymentStatus: "PAID",
        joinedAt: "2026-01-09",
        portoneCustomerId: "cus_daon_03",
    },
    {
        id: 4,
        name: "라온교육센터",
        category: "교육센터",
        address: "대전광역시 유성구 대학로 55",
        phone: "042-610-4400",
        adminName: "이주원",
        adminEmail: "admin@raon.edu",
        plan: "Basic",
        subscriptionStatus: "PAST_DUE",
        firstSubscribedAt: "2025-11-02",
        subscriptionEndedAt: null,
        memberCount: 188,
        monthlyRevenue: 490000,
        nextBillingAt: "2026-06-15",
        paymentStatus: "FAILED",
        joinedAt: "2025-11-02",
        portoneCustomerId: "cus_raon_04",
    },
    {
        id: 5,
        name: "마루공과대학교",
        category: "대학교",
        address: "인천광역시 연수구 아카데미로 21",
        phone: "032-720-1100",
        adminName: "최도윤",
        adminEmail: "admin@maru.ac.kr",
        plan: "Pro",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-09-18",
        subscriptionEndedAt: null,
        memberCount: 1260,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-07-10",
        paymentStatus: "PAID",
        joinedAt: "2025-09-18",
        portoneCustomerId: "cus_maru_05",
    },
    {
        id: 6,
        name: "바른보건대학교",
        category: "대학교",
        address: "광주광역시 북구 하서로 73",
        phone: "062-510-2300",
        adminName: "윤아린",
        adminEmail: "admin@bareun.ac.kr",
        plan: "Pro",
        subscriptionStatus: "PENDING",
        firstSubscribedAt: null,
        subscriptionEndedAt: null,
        memberCount: 920,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-06-20",
        paymentStatus: "READY",
        joinedAt: "2026-06-02",
        portoneCustomerId: "cus_bareun_06",
    },
    {
        id: 7,
        name: "새봄디자인대학교",
        category: "대학교",
        address: "서울특별시 마포구 월드컵북로 90",
        phone: "02-330-7700",
        adminName: "한지우",
        adminEmail: "admin@saebom.ac.kr",
        plan: "Enterprise",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-03-14",
        subscriptionEndedAt: null,
        memberCount: 2180,
        monthlyRevenue: 3100000,
        nextBillingAt: "2026-07-12",
        paymentStatus: "PAID",
        joinedAt: "2025-03-14",
        portoneCustomerId: "cus_saebom_07",
    },
    {
        id: 8,
        name: "아람평생교육원",
        category: "평생교육원",
        address: "울산광역시 남구 삼산로 31",
        phone: "052-610-1180",
        adminName: "서태윤",
        adminEmail: "admin@aram.kr",
        plan: null,
        subscriptionStatus: "UNSUBSCRIBED",
        firstSubscribedAt: null,
        subscriptionEndedAt: null,
        memberCount: 154,
        monthlyRevenue: 0,
        nextBillingAt: "-",
        paymentStatus: "NONE",
        joinedAt: "2025-12-21",
        portoneCustomerId: null,
    },
    {
        id: 9,
        name: "예담문화예술대학교",
        category: "대학교",
        address: "경기도 고양시 일산동구 예담로 27",
        phone: "031-820-9000",
        adminName: "오유진",
        adminEmail: "admin@yedam.ac.kr",
        plan: "Pro",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-07-30",
        subscriptionEndedAt: null,
        memberCount: 1380,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-07-16",
        paymentStatus: "PAID",
        joinedAt: "2025-07-30",
        portoneCustomerId: "cus_yedam_09",
    },
    {
        id: 10,
        name: "온빛외국어대학교",
        category: "대학교",
        address: "대구광역시 달서구 온빛로 45",
        phone: "053-620-4400",
        adminName: "임채원",
        adminEmail: "admin@onbit.ac.kr",
        plan: "Enterprise",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-04-11",
        subscriptionEndedAt: null,
        memberCount: 2740,
        monthlyRevenue: 3100000,
        nextBillingAt: "2026-07-18",
        paymentStatus: "PAID",
        joinedAt: "2025-04-11",
        portoneCustomerId: "cus_onbit_10",
    },
    {
        id: 11,
        name: "우리정보기술학원",
        category: "전문학원",
        address: "충청북도 청주시 상당구 상당로 101",
        phone: "043-220-8820",
        adminName: "송민준",
        adminEmail: "admin@woori-it.kr",
        plan: "Basic",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2026-02-08",
        subscriptionEndedAt: null,
        memberCount: 286,
        monthlyRevenue: 490000,
        nextBillingAt: "2026-07-19",
        paymentStatus: "PAID",
        joinedAt: "2026-02-08",
        portoneCustomerId: "cus_woori_11",
    },
    {
        id: 12,
        name: "자람대학교",
        category: "대학교",
        address: "강원특별자치도 춘천시 자람길 7",
        phone: "033-610-1000",
        adminName: "배수빈",
        adminEmail: "admin@jaram.ac.kr",
        plan: "Pro",
        subscriptionStatus: "PAST_DUE",
        firstSubscribedAt: "2025-10-06",
        subscriptionEndedAt: null,
        memberCount: 1080,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-06-13",
        paymentStatus: "FAILED",
        joinedAt: "2025-10-06",
        portoneCustomerId: "cus_jaram_12",
    },
    {
        id: 13,
        name: "초록환경대학교",
        category: "대학교",
        address: "전라남도 순천시 생태로 36",
        phone: "061-750-3100",
        adminName: "강현우",
        adminEmail: "admin@chorok.ac.kr",
        plan: "Pro",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-06-17",
        subscriptionEndedAt: null,
        memberCount: 1640,
        monthlyRevenue: 1490000,
        nextBillingAt: "2026-07-23",
        paymentStatus: "PAID",
        joinedAt: "2025-06-17",
        portoneCustomerId: "cus_chorok_13",
    },
    {
        id: 14,
        name: "푸른미래대학교",
        category: "대학교",
        address: "제주특별자치도 제주시 미래로 19",
        phone: "064-710-5500",
        adminName: "문서윤",
        adminEmail: "admin@pureun.ac.kr",
        plan: "Enterprise",
        subscriptionStatus: "ACTIVE",
        firstSubscribedAt: "2025-02-28",
        subscriptionEndedAt: null,
        memberCount: 3010,
        monthlyRevenue: 3100000,
        nextBillingAt: "2026-07-25",
        paymentStatus: "PAID",
        joinedAt: "2025-02-28",
        portoneCustomerId: "cus_pureun_14",
    },
    {
        id: 15,
        name: "한결사이버대학교",
        category: "사이버대학교",
        address: "서울특별시 영등포구 한결로 160",
        phone: "02-630-4900",
        adminName: "조예린",
        adminEmail: "admin@hangyeol.ac.kr",
        plan: "Basic",
        subscriptionStatus: "PENDING",
        firstSubscribedAt: null,
        subscriptionEndedAt: null,
        memberCount: 440,
        monthlyRevenue: 490000,
        nextBillingAt: "2026-06-22",
        paymentStatus: "READY",
        joinedAt: "2026-06-09",
        portoneCustomerId: "cus_hangyeol_15",
    },
];

const PAYMENT_METHODS: AdminPaymentMethod[] = [
    "CARD",
    "TRANSFER",
    "VIRTUAL_ACCOUNT",
];

const CURRENT_PAYMENT_STATUS: Record<
    ServiceSchool["paymentStatus"],
    AdminPaymentStatus | null
> = {
    PAID: "PAID",
    READY: "PENDING",
    FAILED: "FAILED",
    CANCELED: "CANCELED",
    NONE: null,
};

const CARD_NAMES = ["신한카드", "현대카드", "국민카드", "삼성카드"];

export const SERVICE_PAYMENTS: ServicePayment[] = SERVICE_SCHOOLS.flatMap(
    (school, schoolIndex) => {
        if (!school.plan) return [];

        const method = PAYMENT_METHODS[schoolIndex % PAYMENT_METHODS.length];
        const currentStatus = CURRENT_PAYMENT_STATUS[school.paymentStatus] ?? "PAID";
        const day = String((schoolIndex % 18) + 3).padStart(2, "0");
        const cardName = method === "CARD" ? CARD_NAMES[schoolIndex % CARD_NAMES.length] : null;
        const cardLast4 = method === "CARD" ? String(4210 + school.id).slice(-4) : null;
        const paymentBase = {
            schoolId: school.id,
            plan: school.plan,
            amount: PLAN_PRICE[school.plan],
            method,
            type: "RECURRING" as const,
            cardName,
            cardLast4,
        };

        const paymentHistory: ServicePayment[] = [
            {
                ...paymentBase,
                id: school.id * 100 + 3,
                merchantUid: `order_${school.id}_202606`,
                portonePaymentId:
                    currentStatus === "PENDING" ? null : `imp_mock_${school.id}_202606`,
                status: currentStatus,
                requestedAt: `2026-06-${day} 09:30`,
                paidAt:
                    currentStatus === "PAID"
                        ? `2026-06-${day} 09:31`
                        : null,
                billingPeriod: "2026-06-01 ~ 2026-06-30",
                failureReason:
                    currentStatus === "FAILED"
                        ? "등록 카드 한도 초과로 승인이 거절되었습니다."
                        : null,
            },
            {
                ...paymentBase,
                id: school.id * 100 + 2,
                merchantUid: `order_${school.id}_202605`,
                portonePaymentId: `imp_mock_${school.id}_202605`,
                status: (school.id % 6 === 0 ? "REFUNDED" : "PAID") as AdminPaymentStatus,
                requestedAt: `2026-05-${day} 09:30`,
                paidAt: `2026-05-${day} 09:31`,
                billingPeriod: "2026-05-01 ~ 2026-05-31",
                failureReason: null,
            },
            {
                ...paymentBase,
                id: school.id * 100 + 1,
                merchantUid: `order_${school.id}_202604`,
                portonePaymentId: `imp_mock_${school.id}_202604`,
                status: "PAID",
                requestedAt: `2026-04-${day} 09:30`,
                paidAt: `2026-04-${day} 09:31`,
                billingPeriod: "2026-04-01 ~ 2026-04-30",
                failureReason: null,
            },
        ];

        return paymentHistory;
    },
).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

const MEMBER_NAMES = [
    "김민준", "이서연", "박도윤", "최하은", "정지우", "강서준",
    "윤아린", "한시우", "오지민", "임채원", "송현우", "배수빈",
    "문서윤", "조예린", "서태윤", "권유나", "황지호", "안다은",
];

const DEPARTMENTS = [
    "컴퓨터공학과", "경영학과", "간호학과", "디자인학과", "교무처", "교육지원팀",
];

export function getMockMembersForSchool(school: ServiceSchool): ServiceMember[] {
    return MEMBER_NAMES.map((name, index) => {
        const role = index % 7 === 0 ? "ADM" : index % 4 === 0 ? "PROF" : "STU";
        const status = index === 8 ? "SUSPENDED" : index === 13 ? "WITHDRAWN" : "ACTIVE";
        const loginId = `${school.id}${String(index + 1).padStart(4, "0")}`;

        return {
            id: school.id * 1000 + index + 1,
            schoolId: school.id,
            name,
            loginId,
            email: `${loginId}@mock.univus.kr`,
            phone: `010-${String(2100 + school.id * 10 + index).padStart(4, "0")}-${String(3100 + index * 17).padStart(4, "0")}`,
            role,
            department: DEPARTMENTS[index % DEPARTMENTS.length],
            status,
            joinedAt: `2026-${String((index % 6) + 1).padStart(2, "0")}-${String((index % 24) + 1).padStart(2, "0")}`,
            lastLoginAt:
                status === "WITHDRAWN"
                    ? "-"
                    : `2026-06-${String(12 - (index % 8)).padStart(2, "0")} ${String(9 + (index % 8)).padStart(2, "0")}:20`,
        };
    });
}

export function getMockMemberActivity(member: ServiceMember): MemberActivitySummary {
    const seed = member.id % 10;
    const communityCount = 4 + (seed % 3);
    const accessCount = 7 + (seed % 4);
    const courseCount = member.role === "ADM" ? 0 : 3 + (seed % 2);
    const submissionCount = member.role === "STU" ? 4 + (seed % 3) : member.role === "PROF" ? 2 : 0;

    const community: MemberActivitySummary["community"] = Array.from(
        { length: communityCount },
        (_, index) => ({
            id: member.id * 100 + index,
            type: index % 3 === 0 ? "POST" : "COMMENT",
            board: ["자유게시판", "질문게시판", "중고거래", "공지사항"][index % 4],
            title:
                index % 3 === 0
                    ? ["이번 학기 수강 신청 질문입니다", "스터디원 모집합니다", "학교 시설 이용 후기"][index % 3]
                    : ["좋은 정보 감사합니다.", "저도 같은 문제가 있었어요.", "관련 자료를 확인해 보세요."][index % 3],
            createdAt: `2026-06-${String(11 - index).padStart(2, "0")} ${String(9 + (index % 7)).padStart(2, "0")}:20`,
            status: index === communityCount - 1 && seed % 2 === 0 ? "DELETED" : "VISIBLE",
        }),
    );

    const accessLogs: MemberActivitySummary["accessLogs"] = Array.from(
        { length: accessCount },
        (_, index) => ({
            id: member.id * 200 + index,
            type: index % 5 === 4 ? "LOGIN_FAILED" : index % 2 === 0 ? "LOGIN" : "LOGOUT",
            occurredAt: `2026-06-${String(12 - Math.floor(index / 2)).padStart(2, "0")} ${String(8 + (index % 9)).padStart(2, "0")}:${index % 2 === 0 ? "05" : "42"}`,
            device: index % 3 === 0 ? "Chrome · Windows" : index % 3 === 1 ? "Safari · iPhone" : "Chrome · Android",
            ipAddress: `203.0.113.${20 + ((member.id + index) % 80)}`,
        }),
    );

    const courses: MemberActivitySummary["courses"] = Array.from(
        { length: courseCount },
        (_, index) => ({
            id: member.id * 300 + index,
            courseName: ["웹 프로그래밍", "데이터베이스 설계", "교육 심리학", "서비스 디자인"][index % 4],
            professorName: ["김현우", "박서연", "이도윤", "최하은"][index % 4],
            semester: index === courseCount - 1 ? "2025-2" : "2026-1",
            progress: member.role === "PROF" ? 100 : Math.max(38, 92 - index * 17),
            status:
                member.role === "PROF"
                    ? "TEACHING"
                    : index === courseCount - 1
                        ? "COMPLETED"
                        : "IN_PROGRESS",
        }),
    );

    const submissions: MemberActivitySummary["submissions"] = Array.from(
        { length: submissionCount },
        (_, index) => ({
            id: member.id * 400 + index,
            courseName: ["웹 프로그래밍", "데이터베이스 설계", "교육 심리학"][index % 3],
            assignmentName:
                member.role === "PROF"
                    ? ["1주차 강의 자료", "중간고사 참고 자료"][index % 2]
                    : ["1차 개인 과제", "중간 프로젝트", "학습 성찰 보고서"][index % 3],
            fileName:
                member.role === "PROF"
                    ? `lecture_material_${index + 1}.pdf`
                    : `${member.loginId}_assignment_${index + 1}.${index % 2 === 0 ? "pdf" : "zip"}`,
            fileSize: `${1 + index * 2}.${(member.id + index) % 9} MB`,
            submittedAt: `2026-06-${String(10 - index).padStart(2, "0")} ${String(13 + (index % 5)).padStart(2, "0")}:10`,
            status: index === 2 ? "LATE" : index === 4 ? "RETURNED" : "SUBMITTED",
        }),
    );

    return { community, accessLogs, courses, submissions };
}

export function getMockMemberReservations(
    member: ServiceMember,
): MemberReservationSummary {
    const noShowCount = member.role === "ADM" ? member.id % 2 : member.id % 5;
    const restrictionThreshold = 3;
    const isRestricted = noShowCount >= restrictionThreshold;
    const roomNames = ["중앙도서관 2층 열람실", "중앙도서관 3층 열람실", "학습관 자유열람실"];
    const upcomingReservationStatus: MemberReservationSummary["reservations"][number]["status"] =
        isRestricted ? "CANCELED" : "RESERVED";

    const reservations: MemberReservationSummary["reservations"] = [
        {
            id: member.id * 500,
            roomName: roomNames[member.id % roomNames.length],
            seatNumber: `A-${String((member.id % 24) + 1).padStart(2, "0")}`,
            startTime: "2026-06-13 10:00",
            endTime: "2026-06-13 12:00",
            status: upcomingReservationStatus,
        },
        ...Array.from({ length: noShowCount }, (_, index) => ({
            id: member.id * 500 + index + 1,
            roomName: roomNames[(member.id + index) % roomNames.length],
            seatNumber: `${index % 2 === 0 ? "B" : "C"}-${String(7 + index).padStart(2, "0")}`,
            startTime: `2026-06-${String(11 - index * 2).padStart(2, "0")} ${String(9 + index).padStart(2, "0")}:00`,
            endTime: `2026-06-${String(11 - index * 2).padStart(2, "0")} ${String(11 + index).padStart(2, "0")}:00`,
            status: "NO_SHOW" as const,
        })),
        {
            id: member.id * 500 + 10,
            roomName: roomNames[(member.id + 1) % roomNames.length],
            seatNumber: "A-14",
            startTime: "2026-06-10 13:00",
            endTime: "2026-06-10 15:00",
            status: "COMPLETED" as const,
        },
        {
            id: member.id * 500 + 11,
            roomName: roomNames[(member.id + 2) % roomNames.length],
            seatNumber: "D-03",
            startTime: "2026-06-08 16:00",
            endTime: "2026-06-08 18:00",
            status: "CANCELED" as const,
        },
        {
            id: member.id * 500 + 12,
            roomName: roomNames[member.id % roomNames.length],
            seatNumber: "B-21",
            startTime: "2026-06-05 09:00",
            endTime: "2026-06-05 11:00",
            status: "COMPLETED" as const,
        },
    ].sort((a, b) => b.startTime.localeCompare(a.startTime));

    const penalties: MemberReservationSummary["penalties"] = isRestricted
        ? [
            {
                id: member.id * 600 + 1,
                type: "NO_SHOW",
                reason: `도서실 예약 노쇼 ${noShowCount}회 누적으로 자동 제한`,
                startTime: "2026-06-12 00:00",
                endTime: "2026-06-19 23:59",
                status: "ACTIVE",
                createdAt: "2026-06-12 00:00",
            },
        ]
        : [];

    return {
        noShowCount,
        restrictionThreshold,
        isRestricted,
        restrictedUntil: isRestricted ? "2026-06-19 23:59" : null,
        reservations,
        penalties,
    };
}
