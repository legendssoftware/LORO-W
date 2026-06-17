'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createIntakeInvitation,
  deleteIntakeInvitation,
  listIntakeInvitations,
  resendIntakeInvitation,
  type CreateIntakeInvitationBody,
} from '@/api/endpoints/employee-intake';

const INTAKE_INVITATIONS_KEY = ['user', 'intake-invitations'] as const;

export function useIntakeInvitations(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: INTAKE_INVITATIONS_KEY,
    queryFn: () => listIntakeInvitations(client),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateIntakeInvitationMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateIntakeInvitationBody) =>
      createIntakeInvitation(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTAKE_INVITATIONS_KEY });
    },
  });
}

export function useResendIntakeInvitationMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: number) => resendIntakeInvitation(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTAKE_INVITATIONS_KEY });
    },
  });
}

export function useDeleteIntakeInvitationMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: number) => deleteIntakeInvitation(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTAKE_INVITATIONS_KEY });
    },
  });
}
