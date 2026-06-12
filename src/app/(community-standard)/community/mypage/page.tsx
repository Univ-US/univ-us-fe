import { redirect } from 'next/navigation';

export default function MyPageRoot() {
  redirect('/community/mypage/posts');
}