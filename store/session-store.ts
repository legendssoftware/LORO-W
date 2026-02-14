import { create } from 'zustand';
import type { SyncProfile } from '@/api/types';

export interface SessionState {
  clerkUserId: string | null;
  clerkSessionId: string | null;
  profileData: SyncProfile | null;
}

const initialState: SessionState = {
  clerkUserId: null,
  clerkSessionId: null,
  profileData: null,
};

interface SessionStore extends SessionState {
  startSession: (session: { profileData?: SyncProfile | null }) => void;
  endSession: () => void;
  updateSessionMetadata: (metadata: {
    clerkUserId?: string | null;
    clerkSessionId?: string | null;
  }) => void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  ...initialState,

  startSession: (session) => {
    set((state) => ({
      ...state,
      ...(session.profileData !== undefined && {
        profileData: session.profileData,
      }),
    }));
  },

  endSession: () => set(initialState),

  updateSessionMetadata: (metadata) => {
    set((state) => {
      const clerkUserIdChanged =
        metadata.clerkUserId !== undefined &&
        metadata.clerkUserId !== state.clerkUserId;
      const clerkSessionIdChanged =
        metadata.clerkSessionId !== undefined &&
        metadata.clerkSessionId !== state.clerkSessionId;
      if (!clerkUserIdChanged && !clerkSessionIdChanged) return state;
      return {
        ...state,
        ...(metadata.clerkUserId !== undefined && {
          clerkUserId: metadata.clerkUserId,
        }),
        ...(metadata.clerkSessionId !== undefined && {
          clerkSessionId: metadata.clerkSessionId,
        }),
      };
    });
  },
}));
