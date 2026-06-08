// src/lib/postApi.ts
import api from "@/lib/api";
import type { Post, PostComment } from "@/types/community";

// 게시글 목록 조회
export const getPostList = async (params: {
  boardId?: number;
  page?: number;
  size?: number;
  keyword?: string;
}) => {
  const res = await api.get("/api/posts", { params });
  return res.data;
};

// 게시글 단건 조회
export const getPostById = async (postId: number) => {
  const res = await api.get(`/api/posts/${postId}`);
  return res.data as Post;
};

// 게시글 등록
export const createPost = async (postData: {
  boardId: number;
  title: string;
  content: string;
  category?: string;
}) => {
  const res = await api.post("/api/posts", postData);
  return res.data;
};

// 게시글 수정
export const updatePost = async (
  postId: number,
  postData: {
    title: string;
    content: string;
    category?: string;
  }
) => {
  const res = await api.put(`/api/posts/${postId}`, postData);
  return res.data;
};

// 게시글 삭제
export const deletePost = async (postId: number) => {
  const res = await api.delete(`/api/posts/${postId}`);
  return res.data;
};

// 좋아요 토글
export const togglePostLike = async (postId: number) => {
  const res = await api.post(`/api/posts/${postId}/like`);
  return res.data as { liked: boolean };
};

// 좋아요 여부 확인
export const getPostLikeStatus = async (postId: number) => {
  const res = await api.get(`/api/posts/${postId}/like`);
  return res.data as { liked: boolean };
};

// 신고 여부 확인
export const getPostReportStatus = async (postId: number) => {
  const res = await api.get(`/api/posts/${postId}/report`);
  return res.data as { reported: boolean };
};

// ── 댓글 ──────────────────────────────────────────────

// 댓글 목록 조회
export const getCommentList = async (postId: number) => {
  const res = await api.get(`/api/posts/${postId}/comments`);
  return res.data as PostComment[];
};

// 댓글 등록 (parentId 없으면 최상위 댓글, 있으면 대댓글)
export const createComment = async (
  postId: number,
  data: { content: string; parentId?: number; isAnonymous?: number }
) => {
  const res = await api.post(`/api/posts/${postId}/comments`, data);
  return res.data;
};

// 댓글 수정
export const updateComment = async (
  postId: number,
  commentId: number,
  data: { content: string }
) => {
  const res = await api.put(`/api/posts/${postId}/comments/${commentId}`, data);
  return res.data;
};

// 댓글 삭제
export const deleteComment = async (postId: number, commentId: number) => {
  const res = await api.delete(`/api/posts/${postId}/comments/${commentId}`);
  return res.data;
};
