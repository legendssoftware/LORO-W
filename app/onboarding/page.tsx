import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { OnboardingSlides } from './onboarding-slides';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.onboarding.title,
  description: PAGE_COPY.onboarding.description,
  path: '/onboarding',
  indexable: true,
});

export default function OnboardingPage() {
  return <OnboardingSlides />;
}
