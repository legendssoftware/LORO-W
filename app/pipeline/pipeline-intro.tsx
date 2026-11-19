'use client';

import { useSessionSync } from '@/api/hooks';
import { getReportsDataScope } from '@/lib/access';
import { useTranslation } from 'react-i18next';

export function PipelineIntro() {
  const { t } = useTranslation('screens');
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(
    backendUserData?.accessLevel != null
      ? String(backendUserData.accessLevel)
      : undefined,
    backendUserData,
  );
  const subtitleKey =
    scope === 'org'
      ? 'pages.pipeline.subtitleOrg'
      : scope === 'team'
        ? 'pages.pipeline.subtitleTeam'
        : 'pages.pipeline.subtitleSelf';

  return (
    <div data-tour="pipeline-page-header">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('pages.pipeline.title')}</h1>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t(subtitleKey)}</p>
    </div>
  );
}
