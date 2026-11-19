'use client';

import { useTranslation } from 'react-i18next';

export function ClientDashboardHome() {
  const { t } = useTranslation('portal');
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t('welcomeBack')}</h1>
      <p className="text-muted-foreground mt-1">
        Manage orders and shop from your account portal.
      </p>
    </div>
  );
}
