import * as XLSX from "xlsx";
import { getAdminDepartments, type ApiDepartment } from "@/lib/adminApi";

export const BULK_SIGNUP_HEADERS = [
    "이름",
    "로그인ID",
    "휴대폰번호",
    "성별",
    "생년월일",
    "구분",
    "학과명",
] as const;

export interface BulkSignupRow {
    rowNumber: number; // 엑셀 데이터행 기준 번호 (헤더 제외, 1부터 시작)
    memberName: string;
    loginId: string;
    password: string; // 생년월일 6자리(YYMMDD)로 자동 설정되는 초기 비밀번호
    phoneNumber: string;
    gender: string; // M | F
    birth: string;
    role: string; // STU | PROF
    deptName: string;
    deptId: number | null;
    errors: string[];
}

const ROLE_NAME_TO_CODE: Record<string, string> = {
    학생: "STU",
    교수: "PROF",
};

const GENDER_NAME_TO_CODE: Record<string, string> = {
    남: "M",
    여: "F",
    남성: "M",
    여성: "F",
};

function normalizeGender(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed === "M" || trimmed === "F") return trimmed;
    return GENDER_NAME_TO_CODE[trimmed] ?? trimmed;
}

function normalizeRole(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed === "STU" || trimmed === "PROF") return trimmed;
    return ROLE_NAME_TO_CODE[trimmed] ?? trimmed;
}

const PHONE_REGEX = /^010\d{8}$/;
const BIRTH_REGEX = /^\d{8}$/;
const LOGIN_ID_REGEX = /^\d+$/;

// 로그인ID(1)·휴대폰번호(2)·생년월일(4) 열은 숫자로 인식되면 앞자리 0이 사라지므로
// 빈 행까지 텍스트 서식을 미리 입혀 엑셀이 입력값을 숫자로 바꾸지 못하게 막습니다.
const TEXT_FORMAT_COLUMNS = [1, 2, 4];
const TEXT_FORMAT_ROW_COUNT = 500;

function applyTextColumnFormat(sheet: XLSX.WorkSheet) {
    for (const col of TEXT_FORMAT_COLUMNS) {
        for (let row = 1; row <= TEXT_FORMAT_ROW_COUNT; row++) {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            const existing = sheet[addr];
            if (existing) {
                existing.t = "s";
                existing.z = "@";
            } else {
                sheet[addr] = { t: "s", v: "", z: "@" };
            }
        }
    }

    const lastRow = Math.max(TEXT_FORMAT_ROW_COUNT, BULK_SIGNUP_HEADERS.length);
    sheet["!ref"] = XLSX.utils.encode_range(
        { r: 0, c: 0 },
        { r: lastRow, c: BULK_SIGNUP_HEADERS.length - 1 },
    );
}

export function downloadBulkSignupTemplate() {
    const header = [...BULK_SIGNUP_HEADERS];
    const example = ["홍길동", "20260001", "01011112222", "남", "20000101", "학생", "컴퓨터공학과"];

    const dataSheet = XLSX.utils.aoa_to_sheet([header, example]);
    dataSheet["!cols"] = header.map(() => ({ wch: 16 }));
    applyTextColumnFormat(dataSheet);

    const guideSheet = XLSX.utils.aoa_to_sheet([
        ["열", "설명"],
        ["이름", "필수. 회원 이름."],
        ["로그인ID", "필수. 숫자만 입력. 학번/사번 등 학교 내 고유 식별자를 권장합니다."],
        ["휴대폰번호", "필수. 01012345678 형식으로 숫자 11자리."],
        ["성별", "필수. 남 또는 여 (M/F도 가능)."],
        ["생년월일", "필수. YYYYMMDD 형식으로 숫자 8자리. 초기 비밀번호가 생년월일 마지막 6자리(YYMMDD)로 자동 설정됩니다."],
        ["구분", "필수. 학생 또는 교수."],
        ["학과명", "선택. 등록된 학과명과 정확히 일치해야 합니다. 교수는 입력을 권장합니다."],
    ]);
    guideSheet["!cols"] = [{ wch: 14 }, { wch: 52 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataSheet, "회원목록");
    XLSX.utils.book_append_sheet(workbook, guideSheet, "작성안내");

    XLSX.writeFile(workbook, "일괄회원가입_양식.xlsx");
}

export async function parseBulkSignupExcel(file: File, univId: number): Promise<BulkSignupRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
        // 텍스트 서식만 입혀둔 빈 행(양식의 입력 대기 행)은 데이터로 취급하지 않습니다.
        .filter((record) => BULK_SIGNUP_HEADERS.some((key) => String(record[key] ?? "").trim() !== ""));

    const departments = await getAdminDepartments(univId).catch(() => [] as ApiDepartment[]);
    const deptByName = new Map(departments.map((d) => [d.deptName.trim(), d.deptId]));

    const seenLoginIds = new Set<string>();

    return raw.map((record, index) => {
        const get = (key: string) => String(record[key] ?? "").trim();

        const memberName = get("이름");
        const loginId = get("로그인ID");
        // 엑셀에서 숫자로 인식된 경우 앞자리 0이 사라지므로(예: 01012345678 -> 1012345678) 복원합니다.
        let phoneNumber = get("휴대폰번호").replace(/\D/g, "");
        if (phoneNumber.length === 10) phoneNumber = `0${phoneNumber}`;
        const gender = normalizeGender(get("성별"));
        const birth = get("생년월일").replace(/\D/g, "");
        const role = normalizeRole(get("구분"));
        const deptName = get("학과명");
        // 초기 비밀번호는 생년월일 마지막 6자리(YYMMDD)로 자동 설정됩니다.
        const password = birth.slice(2, 8);

        const errors: string[] = [];
        if (!memberName) errors.push("이름이 비어 있습니다.");
        if (!LOGIN_ID_REGEX.test(loginId)) errors.push("로그인ID는 숫자만 입력해야 합니다.");
        else if (seenLoginIds.has(loginId)) errors.push("파일 내에 중복된 로그인ID입니다.");
        if (!PHONE_REGEX.test(phoneNumber)) errors.push("휴대폰번호는 01012345678 형식이어야 합니다.");
        if (gender !== "M" && gender !== "F") errors.push("성별은 남/여(M/F)만 입력 가능합니다.");
        if (!BIRTH_REGEX.test(birth)) errors.push("생년월일은 YYYYMMDD 8자리 숫자여야 합니다.");
        if (role !== "STU" && role !== "PROF") errors.push("구분은 학생/교수만 입력 가능합니다.");

        let deptId: number | null = null;
        if (deptName) {
            deptId = deptByName.get(deptName) ?? null;
            if (deptId === null) errors.push(`학과명 "${deptName}"을 찾을 수 없습니다.`);
        } else if (role === "PROF") {
            errors.push("교수는 학과명을 입력해야 합니다.");
        }

        if (LOGIN_ID_REGEX.test(loginId)) seenLoginIds.add(loginId);

        return {
            rowNumber: index + 1,
            memberName,
            loginId,
            password,
            phoneNumber,
            gender,
            birth,
            role,
            deptName,
            deptId,
            errors,
        };
    });
}
