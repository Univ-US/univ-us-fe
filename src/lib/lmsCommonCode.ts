// LMS 공통코드 라벨 조회 — 역할 중립 진입점(교수·학생 공용).
// 라벨은 BE 공통코드 API(`GET /api/common-codes/{group}`)로 런타임 매핑한다(코드→라벨 하드코딩 금지).
// 실제 구현은 lmsProfessorStudentsApi에 있고(모듈 캐시 포함), 학생 화면은 역할 중립 이름으로 이 모듈을 통해 사용한다.
export { getCommonCodeMap, getCommonCodeList } from "@/lib/lmsProfessorStudentsApi";
