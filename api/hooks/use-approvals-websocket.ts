'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { invalidateApprovalsQueries } from '@/api/hooks/use-approvals';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

function getWebSocketUrl(): string {
  return API_URL.replace(/\/$/, '');
}

/**
 * Subscribe to org-scoped approval events and refresh the inbox.
 */
export function useApprovalsWebSocket(params: {
  getToken: (() => Promise<string | null>) | undefined;
  isSignedIn: boolean;
  organisationRef?: string | null;
  userId?: number | null;
  enabled?: boolean;
}): void {
  const { getToken, isSignedIn, organisationRef, userId, enabled = true } = params;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !isSignedIn || !getToken) return;

    let mounted = true;

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || !mounted) return;

        const socket = io(getWebSocketUrl(), {
          query: { token },
          transports: ['websocket'],
          upgrade: true,
        });

        socket.on('connect', () => {
          socket.emit('approval:subscribe');
          if (organisationRef) {
            socket.emit('approval:subscribe-org', { organisationRef });
          }
          if (userId != null) {
            socket.emit('approval:subscribe-user', { userId });
          }
        });

        const refreshInbox = () => {
          if (mounted) invalidateApprovalsQueries(queryClient);
        };

        socket.on('approval:created', refreshInbox);
        socket.on('approval:updated', refreshInbox);
        socket.on('approval:action', refreshInbox);
        socket.on('approval:high-priority', refreshInbox);

        if (mounted) {
          socketRef.current = socket;
        } else {
          socket.disconnect();
        }
      } catch {
        // Connection errors retry via socket.io
      }
    };

    connect();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit('approval:unsubscribe');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [enabled, isSignedIn, getToken, organisationRef, userId, queryClient]);
}
