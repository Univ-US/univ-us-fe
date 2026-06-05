// src/lib/postApi.ts
import api from "@/lib/api";
import type { Post } from "@/types/community";

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