'use client';

import dynamic from 'next/dynamic';

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
  return (
    <SignIn
      appearance={{
        variables: {
          colorPrimary: '#8B5CF6',
        },
        elements: {
          rootBox: 'mx-auto',
          card: 'shadow-xl',
        },
      }}
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
