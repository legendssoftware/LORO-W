'use client';

import { useSessionSync } from '@/api/hooks';
import { getPipelinePageSubtitle } from '@/lib/pipeline-scope';

export function PipelineIntro() {
  const { backendUserData } = useSessionSync();
  const subtitle = getPipelinePageSubtitle(
    backendUserData?.accessLevel != null
      ? String(backendUserData.accessLevel)
      : undefined
  );

  return (
    <div data-tour="pipeline-page-header">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Pipeline</h1>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
    </div>
  );
}
