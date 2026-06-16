// src/lib/marketApi.ts
import api from '@/lib/api';
import type {
  Product,
  ProductComment,
  ProductImage,
  TradeChatMessage,
  TradeChatRoom,
} from '@/types/community';

// ── 상품 목록 조회 ────────────────────────────────────────────────────────
export interface ProductSearchParams {
  keyword?: string;
  category?: string;
  productStatus?: string;
  page?: number;
  size?: number;
}

export interface ProductListResponse {
  success: boolean;
  list: Product[];
  totalCount: number;
}

export const getProductList = async (
  params: ProductSearchParams = {},
): Promise<ProductListResponse> => {
  const res = await api.get('/api/market/products', {
    params: {
      page: 0,
      size: 10,
      ...params,
    },
  });
  return res.data;
};

// ── 상품 상세 조회 ────────────────────────────────────────────────────────
export const getProductDetail = async (
  productId: number,
): Promise<Product> => {
  const res = await api.get(`/api/market/products/${productId}`);
  return res.data.product;
};

// ── 상품 등록 ─────────────────────────────────────────────────────────────
export interface ProductCreatePayload {
  productName: string;
  price: number;
  description: string;
  place: string;
  category: string;
  productStatus?: string;
  univId?: number;
}

export const createProduct = async (
  payload: ProductCreatePayload,
): Promise<{ success: boolean; message: string; productId?: number }> => {
  const res = await api.post('/api/market/products', payload);
  return res.data;
};

// ── 상품 수정 ─────────────────────────────────────────────────────────────
export interface ProductUpdatePayload {
  productName: string;
  price: number;
  description: string;
  place: string;
  category: string;
  productStatus: string;
}

export const updateProduct = async (
  productId: number,
  payload: ProductUpdatePayload,
): Promise<{ success: boolean; message: string; productId?: number }> => {
  const res = await api.put(`/api/market/products/${productId}`, payload);
  return res.data;
};

export const uploadProductImages = async (
  productId: number,
  images: File[],
): Promise<{ message: string; images: ProductImage[] }> => {
  const formData = new FormData();
  images.forEach((image) => formData.append('images', image));

  const res = await api.post(`/api/market/products/${productId}/images`, formData);
  return res.data;
};

export const replaceProductImages = async (
  productId: number,
  images: File[],
): Promise<{ message: string; images: ProductImage[] }> => {
  const formData = new FormData();
  images.forEach((image) => formData.append('images', image));

  const res = await api.put(`/api/market/products/${productId}/images`, formData);
  return res.data;
};

export const updateProductImages = async (
  productId: number,
  keepImageIds: number[],
  images: File[],
): Promise<{ message: string; images: ProductImage[] }> => {
  const formData = new FormData();
  keepImageIds.forEach((imageId) => formData.append('keepImageIds', String(imageId)));
  images.forEach((image) => formData.append('images', image));

  const res = await api.put(`/api/market/products/${productId}/images`, formData);
  return res.data;
};

// ── 상품 삭제 ─────────────────────────────────────────────────────────────
export const deleteProduct = async (
  productId: number,
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/market/products/${productId}`);
  return res.data;
};

// ── 댓글 목록 조회 ────────────────────────────────────────────────────────
export const getProductCommentList = async (
  productId: number,
): Promise<ProductComment[]> => {
  const res = await api.get(`/api/market/products/${productId}/comments`);
  return res.data.comments;
};

// ── 댓글 등록 ─────────────────────────────────────────────────────────────
export interface ProductCommentCreatePayload {
  content: string;
  parentId?: number;
  isAnonymous?: number;
}

export const createProductComment = async (
  productId: number,
  payload: ProductCommentCreatePayload,
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post(
    `/api/market/products/${productId}/comments`,
    payload,
  );
  return res.data;
};

// ── 댓글 삭제 ─────────────────────────────────────────────────────────────
export const deleteProductComment = async (
  commentId: number,
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/api/market/comments/${commentId}`);
  return res.data;
};

// ── 찜 토글 ──────────────────────────────────────────────────────────────
export interface ProductLikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
  message?: string;
}

export const toggleProductLike = async (
  productId: number,
  memberId: number,
): Promise<ProductLikeResponse> => {
  const res = await api.post(`/api/market/products/${productId}/like`, {
    memberId,
  });
  return res.data;
};

export const getProductLikeStatus = async (
  productId: number,
): Promise<ProductLikeResponse> => {
  const res = await api.get(`/api/market/products/${productId}/like`);
  return res.data;
};

export const getProductReportStatus = async (
  productId: number,
): Promise<{ reported: boolean }> => {
  const res = await api.get(`/api/market/products/${productId}/report`);
  return res.data;
};

// ── 내 찜 목록 ────────────────────────────────────────────────────────────
export const getMyLikeList = async (memberId: number): Promise<Product[]> => {
  const res = await api.get('/api/market/likes', { params: { memberId } });
  return res.data.list;
};

export interface PaymentConfigResponse {
  storeId: string;
  kgInicisChannelKey: string;
  kakaoPayChannelKey: string;
}

export interface PaymentCompletePayload {
  productId: number;
  paymentId: string;
}

export interface PaymentCompleteResponse {
  success: boolean;
  payment: {
    tradeId: number;
    paymentId: number;
    productStatus: string;
    paymentStatus: string;
  };
}

export const getPaymentConfig = async (): Promise<PaymentConfigResponse> => {
  const res = await api.get('/api/market/payments/config');
  return res.data;
};

export const completePayment = async (
  payload: PaymentCompletePayload,
): Promise<PaymentCompleteResponse> => {
  const res = await api.post('/api/market/payments/complete', payload);
  return res.data;
};

export const getTradeChatRooms = async (): Promise<TradeChatRoom[]> => {
  const res = await api.get('/api/market/chats');
  return res.data;
};

export const createOrGetTradeChatRoom = async (
  productId: number,
): Promise<TradeChatRoom> => {
  const res = await api.post('/api/market/chats', { productId });
  return res.data;
};

export const getTradeChatMessages = async (
  roomId: number,
): Promise<TradeChatMessage[]> => {
  const res = await api.get(`/api/market/chats/${roomId}/messages`);
  return res.data;
};

export const sendTradeChatMessage = async (
  roomId: number,
  content: string,
): Promise<TradeChatMessage> => {
  const res = await api.post(`/api/market/chats/${roomId}/messages`, {
    content,
  });
  return res.data;
};

export const updateTradeChatNegotiatedPrice = async (
  roomId: number,
  negotiatedPrice: number,
): Promise<TradeChatRoom> => {
  const res = await api.patch(`/api/market/chats/${roomId}/price`, {
    negotiatedPrice,
  });
  return res.data;
};

export const closeTradeChatRoom = async (
  roomId: number,
): Promise<TradeChatRoom> => {
  const res = await api.patch(`/api/market/chats/${roomId}/close`);
  return res.data;
};

export const deleteTradeChatRoom = async (
  roomId: number,
): Promise<{ success: boolean; message: string; productId: number }> => {
  const res = await api.delete(`/api/market/chats/${roomId}`);
  return res.data;
};

export interface ChatPaymentCompletePayload {
  roomId: number;
  paymentId: string;
}

export const completeTradeChatPayment = async (
  payload: ChatPaymentCompletePayload,
): Promise<PaymentCompleteResponse> => {
  const res = await api.post('/api/market/chats/payments/complete', payload);
  return res.data;
};
