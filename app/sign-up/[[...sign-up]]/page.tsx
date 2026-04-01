import { AuthPageShell } from '@/components/auth-page-shell';
import { SignUpForm } from '@/components/sign-up-form';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.signUp.title,
  description: PAGE_COPY.signUp.description,
  path: '/sign-up',
});

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
        <SignUpForm />
      </div>
    </AuthPageShell>
  );
}
