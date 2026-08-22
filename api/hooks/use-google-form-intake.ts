'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getGoogleFormIntakeConfig,
  importGoogleFormIntake,
  sendGoogleFormLink,
  type ImportGoogleFormIntakeBody,
} from '@/api/endpoints/google-form-intake';

const GOOGLE_FORM_INTAKE_CONFIG_KEY = ['user', 'google-form-intake', 'config'] as const;

export function useGoogleFormIntakeConfig(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: GOOGLE_FORM_INTAKE_CONFIG_KEY,
    queryFn: () => getGoogleFormIntakeConfig(client),
    enabled: options?.enabled ?? true,
  });
}

export function useSendGoogleFormLinkMutation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (email: string) => sendGoogleFormLink(client, email),
  });
}

export function useImportGoogleFormIntakeMutation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (body?: ImportGoogleFormIntakeBody) =>
      importGoogleFormIntake(client, body ?? {}),
  });
}
