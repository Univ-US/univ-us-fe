"use client";

// SLM-008 교수↔학생 채팅 — 수강 과목 교수와 과목별 1:1 채팅 (좌 목록 → 우 채팅방, 읽음 표시)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 좌: 교수 채팅 목록(최근 메시지·시간·안읽은 수) / 우: 1:1 채팅방
// - 보낸 메시지는 화면에만 추가(로컬) — 실제 전송 없음. BE 연동 시 WebSocket/STOMP.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatChatListTime,
  getChatRooms,
  getChatThread,
  type ChatMessage,
  type ChatRoom,
  type ChatThread,
} from "@/lib/lmsStudentChatApi";

// 인수인계용 안내 박스의 테이블명/코드 칩 스타일(모노스페이스)
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

export default function StudentChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRooms = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getChatRooms()
      .then((d) => {
        if (!alive) return;
        setRooms(d);
        setSelectedRoomId(d[0]?.roomId ?? null);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => loadRooms(), [loadRooms]);

  // 선택 방의 대화 로드
  useEffect(() => {
    if (selectedRoomId == null) {
      setThread(null);
      return;
    }
    let alive = true;
    getChatThread(selectedRoomId).then((t) => alive && setThread(t));
    return () => {
      alive = false;
    };
  }, [selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );
  const totalUnread = useMemo(() => rooms.reduce((s, r) => s + r.unread, 0), [rooms]);

  // 메시지 전송(로컬 추가만)
  const send = () => {
    const text = input.trim();
    if (!text || !thread) return;
    const nextId = thread.messages.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const msg: ChatMessage = { id: nextId, sender: "me", text, time: "방금", read: false };
    setThread({ ...thread, messages: [...thread.messages, msg] });
    setInput("");
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">교수↔학생 채팅</h1>
        <p className="mt-1 text-sm text-slate-500">안읽은 메시지 {totalUnread}건</p>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 채팅이 아닙니다(보낸 메시지는 화면에만 추가됨).
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블·규칙(정본=CLAUDE-DB.md). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>CHAT_ROOM</code> — 채팅방(<code className={TBL_CLS}>LEC_ID</code>→<code className={TBL_CLS}>LECTURE</code> · <code className={TBL_CLS}>LMS_PRF_ID</code>→교수, 수강 과목별 1:1 · <code className={TBL_CLS}>CHT_ROM_VAL_STATUS</code>)
          </li>
          <li>
            <code className={TBL_CLS}>CHAT_ROOM_MESSAGES</code> — 메시지(<code className={TBL_CLS}>CONTENT</code> VARCHAR2(1000) · 발신자 <code className={TBL_CLS}>LMS_PRF_ID</code> · <code className={TBL_CLS}>MSG_DATE</code> · <code className={TBL_CLS}>STATUS</code>=MSG_STS[SNT전송완료/FAL전송실패/DEL삭제됨])
          </li>
          <li>
            <code className={TBL_CLS}>ROOM_MESSAGES_READ</code> — 읽음 여부(<code className={TBL_CLS}>RED_YN</code> 0/1 · <code className={TBL_CLS}>RED_REG_DATE</code>)
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>채팅 대상 = 수강 과목 교수 1:1</b>(수강 강의별 방). 좌측 목록 = 최근 메시지순 + 안읽은 수(<code className={TBL_CLS}>RED_YN=0</code> 카운트).
          </li>
          <li>
            · <b>실시간 = WebSocket/STOMP</b>(<code className={TBL_CLS}>/ws-univus</code>) 송수신·읽음 갱신. (현재 mock: 보낸 메시지 화면 로컬 추가만)
          </li>
          <li>
            · <b>메시지 상태 = MSG_STS</b>(SNT/FAL/DEL) → <code className={TBL_CLS}>CHAT_ROOM_MESSAGES.STATUS</code>. 본문 ≤ 1000자.
          </li>
          <li>
            · ⭐ <b>첨부 없음 — 텍스트 채팅만</b>(첨부 버튼 제거, 2026-06-14). 첨부 필요 시 BE 정책·첨부 테이블 추가 결정.
          </li>
          <li>
            · ⭐ <b>목록 시각 표시</b>: 당일 <b>HH:mm</b> / 올해(당일 아님) <b>MM.DD</b> / 작년 이전 <b>YYYY.MM.DD</b> — 상대표현(&apos;어제&apos;·&apos;오늘&apos;) 안 씀. BE는 <code className={TBL_CLS}>MSG_DATE</code> 그대로 → FE <code className={TBL_CLS}>formatChatListTime()</code>.
          </li>
          <li>
            · ⭐ <b>방 안 시각 위치</b>: 수신 메시지 = 말풍선 <b>오른쪽</b> / 발송 메시지 = 말풍선 <b>왼쪽</b>(읽음 표시 포함, 카톡식). 메시지별 시각 = <code className={TBL_CLS}>MSG_DATE</code>.
          </li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">채팅 목록을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={loadRooms}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : (
        <div className="grid h-[68vh] grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          {/* 좌: 채팅 목록 */}
          <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">채팅 목록</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                {rooms.length}
              </span>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {rooms.map((r) => {
                const active = r.roomId === selectedRoomId;
                return (
                  <li key={r.roomId}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoomId(r.roomId)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${r.avatarColor}`}
                      >
                        {r.avatarInitial}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {r.professorName} 교수
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">{formatChatListTime(r.lastAt)}</span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">{r.courseName}</span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-400">{r.lastMessage}</span>
                          {r.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                              {r.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 우: 채팅방 */}
          <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {!selectedRoom ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                왼쪽에서 교수를 선택하세요.
              </div>
            ) : (
              <>
                {/* 방 헤더 */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${selectedRoom.avatarColor}`}
                  >
                    {selectedRoom.avatarInitial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{selectedRoom.professorName} 교수</p>
                    <p className="truncate text-xs text-slate-500">{selectedRoom.courseName}</p>
                  </div>
                </div>

                {/* 메시지 */}
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-5 py-4">
                  {thread?.dateLabel && (
                    <p className="text-center text-xs text-slate-400">{thread.dateLabel}</p>
                  )}
                  {thread?.messages.map((m) =>
                    m.sender === "professor" ? (
                      <div key={m.id} className="flex flex-col items-start">
                        <span className="mb-1 text-[11px] text-slate-400">
                          {selectedRoom.professorName} 교수
                        </span>
                        <div className="flex max-w-[85%] items-end gap-2">
                          <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm">
                            {m.text}
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400">{m.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex justify-end">
                        <div className="flex max-w-[85%] items-end gap-2">
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {m.read ? "읽음 " : ""}
                            {m.time}
                          </span>
                          <div className="rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm text-white">
                            {m.text}
                          </div>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-700 text-xs font-semibold text-white">
                            김
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* 입력 */}
                <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="h-10 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={!input.trim()}
                    aria-label="전송"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    ➤
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
