'use client';

import { create } from 'zustand';

import {
  getSeatChatContext,
  type ActiveSeatReservation,
  type SeatChatNotification,
  type SeatChatRoom,
} from '@/lib/reservationApi';

type SeatChatNotificationState = {
  activeReservation: ActiveSeatReservation | null;
  rooms: SeatChatRoom[];
  totalUnreadCount: number;
  loading: boolean;
  openRequested: boolean;
  requestedRoomId: number | null;
  openRequestId: number;
  drawerOpen: boolean;
  activeRoomId: number | null;
  refreshContext: () => Promise<void>;
  applyNotification: (notification: SeatChatNotification) => void;
  markRoomRead: (roomId: number) => void;
  requestOpen: (roomId?: number | null) => void;
  consumeOpenRequest: () => void;
  setDrawerState: (open: boolean, roomId?: number | null) => void;
  reset: () => void;
};

const emptyContext = {
  activeReservation: null,
  rooms: [],
  totalUnreadCount: 0,
};

export const useSeatChatNotificationStore =
  create<SeatChatNotificationState>((set, get) => ({
    ...emptyContext,
    loading: false,
    openRequested: false,
    requestedRoomId: null,
    openRequestId: 0,
    drawerOpen: false,
    activeRoomId: null,

    refreshContext: async () => {
      if (get().loading) return;
      set({ loading: true });

      try {
        const context = await getSeatChatContext();
        set({
          activeReservation: context.activeReservation,
          rooms: context.rooms ?? [],
          totalUnreadCount: context.totalUnreadCount ?? 0,
        });
      } catch {
        // Preserve the last known unread state during a transient API failure.
      } finally {
        set({ loading: false });
      }
    },

    applyNotification: (notification) => {
      set((state) => {
        const roomExists = state.rooms.some(
          (room) => room.roomId === notification.roomId,
        );

        return {
          totalUnreadCount: state.totalUnreadCount + 1,
          rooms: roomExists
            ? state.rooms.map((room) =>
                room.roomId === notification.roomId
                  ? {
                      ...room,
                      unreadCount: (room.unreadCount ?? 0) + 1,
                      lastMessageText: notification.messageText,
                      lastMessageAt: notification.createdAt,
                    }
                  : room,
              )
            : state.rooms,
        };
      });
    },

    markRoomRead: (roomId) => {
      set((state) => {
        const room = state.rooms.find((item) => item.roomId === roomId);
        const readCount = room
          ? room.unreadCount ?? 0
          : Math.min(state.totalUnreadCount, 1);

        return {
          totalUnreadCount: Math.max(
            state.totalUnreadCount - readCount,
            0,
          ),
          rooms: state.rooms.map((item) =>
            item.roomId === roomId
              ? { ...item, unreadCount: 0 }
              : item,
          ),
        };
      });
    },

    requestOpen: (roomId = null) => {
      set((state) => ({
        openRequested: true,
        requestedRoomId: roomId,
        openRequestId: state.openRequestId + 1,
      }));
    },

    consumeOpenRequest: () => {
      set({
        openRequested: false,
        requestedRoomId: null,
      });
    },

    setDrawerState: (open, roomId = null) => {
      set({
        drawerOpen: open,
        activeRoomId: open ? roomId : null,
      });
    },

    reset: () => {
      set({
        ...emptyContext,
        loading: false,
        openRequested: false,
        requestedRoomId: null,
        drawerOpen: false,
        activeRoomId: null,
      });
    },
  }));
