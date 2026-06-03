import { buildPageMetadata } from '@/lib/seo';
import { AccountContent } from './account-content';

export const metadata = buildPageMetadata({
  segmentTitle: 'Account — your LORO profile',
  description:
    'View and update your LORO account settings. Private workspace.',
  path: '/account',
});

export default function AccountPage() {
  return <AccountContent />;
}
