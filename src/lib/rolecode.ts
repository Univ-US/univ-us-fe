// 사용자 역할 코드 (MEMBER.ROLE) — BE com.univus.app.commoncode.code.RoleCode와 동일 코드값.
// 역할 분기·접근 가드에서 문자열 리터럴 대신 사용한다(오타를 컴파일 타임에 차단).
// 라벨(한글명)은 FE 하드코딩 없이 공통코드 API(GET /api/common-codes/ROLE_CODE)로 런타임 매핑.
export const ROLE = {
    SUA: "SUA", // 슈퍼관리자
    ADM: "ADM", // 학교 관리자
    PROF: "PROF", // 교수
    STU: "STU", // 학생
    ALU: "ALU", // 졸업생
    GUEST: "GUEST", // 게스트 (가입 직후 기본값)
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
