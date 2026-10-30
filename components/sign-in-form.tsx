'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { safeReturnPath } from '@/lib/safe-return-path';

const SignIn = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignIn),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-full max-w-md flex-col items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

export function SignInForm() {
  const params = useSearchParams();
  const returnPath = safeReturnPath(params.get('redirect_url')) ?? '/dashboard';

  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'shadow-xl',
        },
      }}
      signUpUrl="/sign-up"
      fallbackRedirectUrl={returnPath}
    />
  );
}
