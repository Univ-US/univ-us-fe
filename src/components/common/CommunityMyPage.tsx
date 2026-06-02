"use client";

import { useState } from "react";
import {
  FileText, MessageSquare, Heart, Receipt,
  Bookmark, UserRoundCog, Settings, MapPin,
  Camera, Check, TriangleAlert, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── 타입 ───────────────────────────────────────────────
interface MyPost {
  postId: number;
  title: string;
  board: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

interface MyComment {
  commentId: number;
  content: string;
  postTitle: string;
  board: string;
  createdAt: string;
}

interface MyTrade {
  tradeId: number;
  productName: string;
  price: number;
  status: "판매중" | "예약중" | "거래완료";
  role: "판매" | "구매";
  createdAt: string;
}

interface MyWishlist {
  productId: number;
  productName: string;
  price: number;
  place: string;
  status: "판매중" | "예약중" | "거래완료";
}

interface UserProfile {
  name: string;
  nickname: string;
  department: string;
  joinedAt: string;
  postCount: number;
  commentCount: number;
  likeCount: number;
}

// ── 샘플 데이터 ────────────────────────────────────────
const SAMPLE_PROFILE: UserProfile = {
  name: "정성룡",
  nickname: "성룡스터디",
  department: "컴퓨터공학 21학번",
  joinedAt: "2024.03",
  postCount: 28,
  commentCount: 142,
  likeCount: 96,
};

const SAMPLE_MY_POSTS: MyPost[] = [
  { postId: 1, title: "중간고사 끝나고 다 같이 MT 갈 사람?", board: "자유", createdAt: "12분 전", likeCount: 24, commentCount: 18 },
  { postId: 2, title: "도서관 3층 콘센트 자리 명당 공유합니다", board: "자유", createdAt: "1시간 전", likeCount: 56, commentCount: 12 },
  { postId: 3, title: "이번 학기 꿀교양 추천 좀 해주세요", board: "익명", createdAt: "3시간 전", likeCount: 31, commentCount: 42 },
];

const SAMPLE_MY_COMMENTS: MyComment[] = [
  { commentId: 1, content: "저요! 날짜만 맞으면 무조건 갑니다", postTitle: "중간고사 끝나고 다 같이 MT 갈 사람?", board: "자유", createdAt: "30분 전" },
  { commentId: 2, content: "3층 창가쪽이 콘센트 제일 많아요", postTitle: "도서관 3층 콘센트 자리 명당 공유합니다", board: "자유", createdAt: "어제" },
];

const SAMPLE_TRADES: MyTrade[] = [
  { tradeId: 1, productName: "자료구조 전공서적 (거의 새것)", price: 12000, status: "판매중", role: "판매", createdAt: "3분 전" },
  { tradeId: 2, productName: "맥북 거치대 알루미늄", price: 20000, status: "예약중", role: "판매", createdAt: "어제" },
  { tradeId: 3, productName: "전공 원서 3권 일괄", price: 25000, status: "거래완료", role: "구매", createdAt: "2주 전" },
];

const SAMPLE_WISHLIST: MyWishlist[] = [
  { productId: 1, productName: "자료구조 전공서적 (거의 새것)", price: 12000, place: "중앙도서관 앞", status: "판매중" },
  { productId: 4, productName: "맥북 거치대 알루미늄", price: 20000, place: "학생회관", status: "판매중" },
  { productId: 5, productName: "아이패드 펜슬 2세대", price: 55000, place: "중앙도서관", status: "예약중" },
];

// ── 메뉴 ───────────────────────────────────────────────
type SectionKey = "posts" | "comments" | "liked" | "trades" | "wishlist" | "profile" | "account";

const MENU: {
  group: string;
  items: { key: SectionKey; icon: React.ReactNode; label: string }[];
}[] = [
  {
    group: "커뮤니티 활동",
    items: [
      { key: "posts",    icon: <FileText className="size-[17px]" />,     label: "내가 쓴 글" },
      { key: "comments", icon: <MessageSquare className="size-[17px]" />, label: "내가 쓴 댓글" },
      { key: "liked",    icon: <Heart className="size-[17px]" />,         label: "좋아요한 글" },
    ],
  },
  {
    group: "중고거래",
    items: [
      { key: "trades",   icon: <Receipt className="size-[17px]" />,  label: "거래 내역" },
      { key: "wishlist", icon: <Bookmark className="size-[17px]" />, label: "관심목록" },
    ],
  },
  {
    group: "계정",
    items: [
      { key: "profile", icon: <UserRoundCog className="size-[17px]" />, label: "프로필 수정" },
      { key: "account", icon: <Settings className="size-[17px]" />,     label: "계정 설정" },
    ],
  },
];

// ── 유틸 ───────────────────────────────────────────────
function formatPrice(price: number) {
  return price === 0 ? "나눔" : price.toLocaleString("ko-KR") + "원";
}

function BoardBadge({ board }: { board: string }) {
  const styles: Record<string, string> = {
    자유: "bg-primary/10 text-primary",
    익명: "bg-slate-100 text-slate-500",
    공지: "bg-blue-50 text-blue-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[board] ?? "bg-slate-100 text-slate-500"}`}>
      {board}
    </span>
  );
}

function StatusBadge({ status }: { status: MyTrade["status"] }) {
  const styles = {
    판매중:  "bg-emerald-100 text-emerald-700",
    예약중:  "bg-amber-100 text-amber-700",
    거래완료: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{children}</h2>
      {sub && <p className="mt-1 text-[13px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ── 내가 쓴 글 ─────────────────────────────────────────
function MyPosts({ posts }: { posts: MyPost[] }) {
  return (
    <>
      <SectionTitle sub={`작성한 글 ${posts.length}개`}>내가 쓴 글</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {posts.map((post, i) => (
          <div
            key={post.postId}
            className={cn(
              "flex items-center gap-3 px-[18px] py-3.5 transition-colors hover:bg-slate-50",
              i < posts.length - 1 && "border-b border-border"
            )}
          >
            <BoardBadge board={post.board} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800">
              {post.title}
            </span>
            <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" />{post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5" />{post.commentCount}
              </span>
              <span className="w-[46px] text-right">{post.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 내가 쓴 댓글 ───────────────────────────────────────
function MyComments({ comments }: { comments: MyComment[] }) {
  return (
    <>
      <SectionTitle sub={`작성한 댓글 ${comments.length}개`}>내가 쓴 댓글</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {comments.map((comment, i) => (
          <div
            key={comment.commentId}
            className={cn(
              "px-[18px] py-3.5 transition-colors hover:bg-slate-50",
              i < comments.length - 1 && "border-b border-border"
            )}
          >
            <p className="mb-2 text-sm font-semibold text-slate-800">
              {comment.content}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BoardBadge board={comment.board} />
              <ChevronRight className="size-3.5" />
              <span className="min-w-0 truncate">{comment.postTitle}</span>
              <span>·</span>
              <span className="shrink-0">{comment.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 좋아요한 글 ────────────────────────────────────────
function LikedPosts({ posts }: { posts: MyPost[] }) {
  return (
    <>
      <SectionTitle sub="좋아요한 글을 모아봐요">좋아요한 글</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {posts.map((post, i) => (
          <div
            key={post.postId}
            className={cn(
              "flex items-center gap-3 px-[18px] py-3.5 transition-colors hover:bg-slate-50",
              i < posts.length - 1 && "border-b border-border"
            )}
          >
            <BoardBadge board={post.board} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-800">
              {post.title}
            </span>
            <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" />{post.likeCount}
              </span>
              <span className="w-[46px] text-right">{post.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 거래 내역 ──────────────────────────────────────────
function MyTrades({ trades }: { trades: MyTrade[] }) {
  const [tab, setTab] = useState<"전체" | "판매" | "구매">("전체");
  const filtered = trades.filter((t) =>
    tab === "전체" ? true : t.role === tab
  );

  return (
    <>
      <SectionTitle sub="내가 등록·구매한 상품과 거래 상태를 관리해요">
        거래 내역
      </SectionTitle>

      {/* 탭 */}
      <div className="mb-4 flex gap-1 w-fit rounded-xl bg-slate-100 p-1">
        {(["전체", "판매", "구매"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              tab === t
                ? "bg-white text-primary shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {filtered.map((trade, i) => (
          <div
            key={trade.tradeId}
            className={cn(
              "flex items-center gap-4 px-[18px] py-4 transition-colors hover:bg-slate-50",
              i < filtered.length - 1 && "border-b border-border"
            )}
          >
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-700 text-2xl shadow-sm">
              🛍️
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  trade.role === "판매"
                    ? "bg-primary/10 text-primary"
                    : "bg-blue-50 text-blue-600"
                )}>
                  {trade.role}
                </span>
                <StatusBadge status={trade.status} />
              </div>
              <div className="truncate text-sm font-semibold text-slate-800">
                {trade.productName}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {formatPrice(trade.price)}
                </span>
                <span className="text-xs text-slate-400">· {trade.createdAt}</span>
              </div>
            </div>
            {trade.role === "판매" && trade.status !== "거래완료" && (
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm">수정</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50"
                >
                  삭제
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── 관심목록 ───────────────────────────────────────────
function MyWishlist({ wishlist }: { wishlist: MyWishlist[] }) {
  return (
    <>
      <SectionTitle sub={`찜한 상품 ${wishlist.length}개`}>관심목록</SectionTitle>
      <div className="grid grid-cols-3 gap-4">
        {wishlist.map((item) => (
          <div
            key={item.productId}
            className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative">
              <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-primary to-teal-700 text-5xl">
                🛍️
              </div>
              <button className="absolute right-2.5 top-2.5 flex size-[34px] items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm">
                <Heart className="size-4 fill-current" />
              </button>
            </div>
            <div className="px-3.5 pb-4 pt-3">
              <div className="text-[13.5px] font-semibold leading-snug text-slate-800">
                {item.productName}
              </div>
              <div className="mt-1.5 text-[17px] font-extrabold text-slate-900">
                {formatPrice(item.price)}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="size-3" />{item.place}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 프로필 수정 ────────────────────────────────────────
function MyProfile({ profile }: { profile: UserProfile }) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState("자료구조 스터디 운영 중이에요. 같이 공부해요!");

  return (
    <>
      <SectionTitle sub="커뮤니티에서 보여지는 닉네임과 프로필을 수정해요">
        프로필 수정
      </SectionTitle>
      <div className="max-w-[560px] overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm">

        {/* 아바타 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <div className="flex size-[60px] items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm">
              {profile.name.slice(0, 1)}
            </div>
            <button className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow-sm">
              <Camera className="size-3" />
            </button>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{profile.name}</div>
            <div className="text-xs text-slate-400">{profile.department}</div>
          </div>
        </div>

        {/* 닉네임 */}
        <div className="mb-5">
          <label className="mb-2 block text-[13.5px] font-bold text-slate-700">
            닉네임
          </label>
          <input
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1.5 text-xs text-slate-400">({nickname.length}/20)</p>
        </div>

        {/* 한 줄 소개 */}
        <div className="mb-6">
          <label className="mb-2 block text-[13.5px] font-bold text-slate-700">
            한 줄 소개
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-[14.5px] leading-relaxed outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">취소</Button>
          <Button>
            <Check className="size-4" />저장
          </Button>
        </div>
      </div>
    </>
  );
}

// ── 계정 설정 ──────────────────────────────────────────
function MyAccount() {
  return (
    <>
      <SectionTitle sub="계정 상태와 탈퇴를 관리해요">계정 설정</SectionTitle>

      {/* 계정 상태 */}
      <div className="mb-4 max-w-[620px] overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14.5px] font-bold text-slate-800">계정 상태</div>
            <div className="mt-1 text-[13px] text-slate-400">
              정상 이용 중인 계정이에요.
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            정상
          </span>
        </div>
      </div>

      {/* 회원 탈퇴 */}
      <div className="max-w-[620px] overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14.5px] font-bold text-red-600">
              <TriangleAlert className="size-4" />
              회원 탈퇴
            </div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
              탈퇴 시 작성한 글·댓글·거래 내역이 모두 삭제되며 복구할 수 없어요.
            </div>
          </div>
          <button className="shrink-0 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-600">
            탈퇴하기
          </button>
        </div>
      </div>
    </>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function CommunityMyPage() {
  const [section, setSection] = useState<SectionKey>("posts");

  const blocks: Record<SectionKey, React.ReactNode> = {
    posts:    <MyPosts posts={SAMPLE_MY_POSTS} />,
    comments: <MyComments comments={SAMPLE_MY_COMMENTS} />,
    liked:    <LikedPosts posts={SAMPLE_MY_POSTS} />,
    trades:   <MyTrades trades={SAMPLE_TRADES} />,
    wishlist: <MyWishlist wishlist={SAMPLE_WISHLIST} />,
    profile:  <MyProfile profile={SAMPLE_PROFILE} />,
    account:  <MyAccount />,
  };

  return (
    <div className="min-h-screen bg-slate-50 px-[30px] py-7">
      <div className="mx-auto max-w-[920px]">

        {/* 프로필 헤더 */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="flex size-[56px] items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm">
              {SAMPLE_PROFILE.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  {SAMPLE_PROFILE.nickname}
                </span>
                <span className="text-[13px] text-slate-400">
                  {SAMPLE_PROFILE.department}
                </span>
              </div>
              <div className="mt-1 text-[12.5px] text-slate-400">
                가입 {SAMPLE_PROFILE.joinedAt} · {SAMPLE_PROFILE.name}
              </div>
            </div>

            {/* 통계 */}
            <div className="flex shrink-0 items-center divide-x divide-border">
              {([
                ["작성글", SAMPLE_PROFILE.postCount],
                ["댓글",   SAMPLE_PROFILE.commentCount],
                ["좋아요", SAMPLE_PROFILE.likeCount],
              ] as const).map(([label, count]) => (
                <div key={label} className="px-5 text-center">
                  <div className="text-[20px] font-extrabold tracking-tight text-slate-900">
                    {count}
                  </div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("profile")}
              className="shrink-0"
            >
              <UserRoundCog className="size-3.5" />
              프로필 수정
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-5">

          {/* 사이드 메뉴 */}
          <div className="w-[220px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white py-2 shadow-sm">
            {MENU.map((group, gi) => (
              <div key={gi} className={cn(gi > 0 && "border-t border-border mt-1 pt-1")}>
                <div className="px-[18px] pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const active = section === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSection(item.key)}
                      className={cn(
                        "flex w-full items-center gap-3 border-r-2 px-[18px] py-2.5 text-left text-sm font-semibold transition-all",
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      )}
                    >
                      <span className={active ? "text-primary" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 컨텐츠 */}
          <div className="min-w-0 flex-1">
            {blocks[section]}
          </div>

        </div>
      </div>
    </div>
  );
}