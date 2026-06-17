type CommunityDisplaySource = {
  communityNickname?: string | null;
  memberName?: string | null;
};

export const COMMUNITY_NICKNAME_EMPTY_LABEL = '닉네임 미설정';
export const COMMUNITY_MEMBER_EMPTY_LABEL = '사용자';

export function normalizeProfileText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getCommunityNicknameValue(source: CommunityDisplaySource) {
  return normalizeProfileText(source.communityNickname) ?? '';
}

export function getCommunityDisplayName(source: CommunityDisplaySource) {
  return (
    normalizeProfileText(source.communityNickname) ??
    normalizeProfileText(source.memberName) ??
    COMMUNITY_MEMBER_EMPTY_LABEL
  );
}

export function getCommunityInitial(source: CommunityDisplaySource) {
  return Array.from(getCommunityDisplayName(source))[0] ?? 'U';
}
