import * as XLSX from "xlsx";
import { ROLE_LABEL, STATUS_LABEL, type ApiMember } from "@/lib/adminApi";

export type MemberExportColumnKey = "memberId" | "memberName" | "role" | "status" | "phoneNumber" | "createdAt";

export const MEMBER_EXPORT_COLUMNS: { key: MemberExportColumnKey; label: string }[] = [
    { key: "memberId", label: "회원번호" },
    { key: "memberName", label: "이름" },
    { key: "role", label: "구분" },
    { key: "status", label: "상태" },
    { key: "phoneNumber", label: "휴대폰번호" },
    { key: "createdAt", label: "가입일" },
];

function normalizePhoneNumber(phoneNumber: string | number | null): string {
    // 백엔드가 숫자 타입으로 내려주는 경우(앞자리 0 손실) String() 변환 후, 10자리면 0을 복원합니다.
    let digits = String(phoneNumber ?? "").replace(/\D/g, "");
    if (digits.length === 10) digits = `0${digits}`;
    return digits;
}

function getColumnValue(member: ApiMember, key: MemberExportColumnKey): string | number {
    switch (key) {
        case "memberId":
            return member.memberId;
        case "memberName":
            return member.memberName;
        case "role":
            return ROLE_LABEL[member.role] ?? member.role;
        case "status":
            return STATUS_LABEL[member.status] ?? member.status;
        case "phoneNumber":
            return normalizePhoneNumber(member.phoneNumber);
        case "createdAt":
            return member.createdAt ? new Date(member.createdAt).toLocaleDateString("ko-KR") : "";
    }
}

export function exportMembersToExcel(
    members: ApiMember[],
    options?: { univName?: string | null; columns?: MemberExportColumnKey[] },
) {
    const selectedKeys = options?.columns;
    const columns = selectedKeys?.length
        ? MEMBER_EXPORT_COLUMNS.filter((c) => selectedKeys.includes(c.key))
        : MEMBER_EXPORT_COLUMNS;

    const header = columns.map((c) => c.label);
    const rows = members.map((m) => columns.map((c) => getColumnValue(m, c.key)));

    const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    sheet["!cols"] = header.map(() => ({ wch: 16 }));

    // 휴대폰번호 열은 텍스트 서식으로 고정해서 엑셀/스프레드시트 앱이 앞자리 0을 숫자로 잘못 바꾸지 않게 합니다.
    const phoneColumnIndex = columns.findIndex((c) => c.key === "phoneNumber");
    if (phoneColumnIndex >= 0) {
        for (let row = 1; row <= rows.length; row++) {
            const addr = XLSX.utils.encode_cell({ r: row, c: phoneColumnIndex });
            const value = rows[row - 1][phoneColumnIndex];
            sheet[addr] = { t: "s", v: String(value ?? ""), z: "@" };
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "회원목록");

    const today = new Date().toISOString().slice(0, 10);
    const univPart = options?.univName ? `_${options.univName}` : "";

    try {
        XLSX.writeFile(workbook, `회원목록${univPart}_${today}.xlsx`);
    } catch (e) {
        console.error("회원 목록 내보내기 실패", e);
        alert("엑셀 파일을 만드는 중 오류가 발생했습니다.");
    }
}
