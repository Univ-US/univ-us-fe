// LMS 기본 프로필 아바타(업로드 이미지가 없을 때 표시되는 색 원형 + 이름 첫 글자) 공통 유틸.
// 사람 식별자(학번/사번/lmsPrfId 등)를 시드로 한 결정적 해시 → 같은 식별자는 항상 같은 색.
// 덕분에 한 사람이 여러 화면(채팅·출결·수강생현황·리포트·프로필)에서 같은 색으로 보임.

const LMS_AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-teal-600",
] as const;

// 문자열/숫자 시드를 양의 정수 해시로 변환(djb2 계열, 결정적)
function hashSeed(seed: string | number | null | undefined): number {
  const text = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** 사람 식별자로 결정적 아바타 배경색 Tailwind 클래스를 반환(같은 시드=같은 색) */
export function getLmsAvatarColor(seed: string | number | null | undefined): string {
  return LMS_AVATAR_COLORS[hashSeed(seed) % LMS_AVATAR_COLORS.length];
}

/** 이름 첫 글자(공백 제거), 비면 fallback */
export function getLmsAvatarInitial(name: string | null | undefined, fallback = "U"): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed[0] : fallback;
}
