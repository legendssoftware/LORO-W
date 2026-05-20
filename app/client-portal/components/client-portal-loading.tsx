'use client';

import { LoadingSpinner } from '@/components/loading-spinner';
import { useLinkedClientProfile } from '@/api/hooks/use-linked-client-profile';
import type { ClientProfileData } from '@/api/types/client-portal';

export function ClientPortalLoading({
  children,
}: {
  children: (client: ClientProfileData) => React.ReactNode;
}) {
  const { data, isLoading, isError, refetch } = useLinkedClientProfile();

  if (isLoading) {
    return <LoadingSpinner wrapperClassName="py-16" />;
  }

  if (isError || !data) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="mb-4">Could not load your account profile.</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => void refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children(data)}</>;
}
