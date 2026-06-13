// 교수 LMS 화면의 드롭다운/라벨에 표시하는 강의명 길이 제한 공용 유틸.
// native <select>의 <option>은 OS 렌더라 CSS truncate가 안 먹어, 텍스트 자체를 잘라야 한다.
// 잘린 전체명은 호출부에서 <option title>로 hover 노출.
export const LECTURE_NAME_MAX = 20;

export const truncateLectureName = (name: string): string =>
  name.length > LECTURE_NAME_MAX ? `${name.slice(0, LECTURE_NAME_MAX)}…` : name;
