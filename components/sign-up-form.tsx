'use client';

import dynamic from 'next/dynamic';

const SignUp = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignUp),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

export function SignUpForm() {
  return (
    <SignUp
      appearance={{
        variables: {
          colorPrimary: '#8B5CF6',
        },
        elements: {
          rootBox: 'mx-auto',
          card: 'shadow-xl',
        },
      }}
      signInUrl="/sign-in"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
