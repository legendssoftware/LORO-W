import { AuthPageShell } from '@/components/auth-page-shell';
import { SignInForm } from '@/components/sign-in-form';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.signIn.title,
  description: PAGE_COPY.signIn.description,
  path: '/sign-in',
});

export default function SignInPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center">
        <SignInForm />
      </div>
    </AuthPageShell>
  );
}
