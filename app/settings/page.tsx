import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { SettingsContent } from './settings-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.settings.title,
  description: PAGE_COPY.settings.description,
  path: '/settings',
});

export default function SettingsPage() {
  return <SettingsContent />;
}
