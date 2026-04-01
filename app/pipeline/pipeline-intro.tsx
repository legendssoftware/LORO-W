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
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
      <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
    </div>
  );
}
