'use client';

import { BrandMark } from '@/components/brand-mark';

/**
 * Full-page shell for auth routes: sign-in, sign-up, forgot-password, verify-otp, new-password.
 * Uses auth.jpg as full-viewport background with 0.6 black overlay; centers content on x and y.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/covers/auth.webp)' }}
        aria-hidden
      />
      <div className="fixed inset-0 bg-black/60" aria-hidden />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <BrandMark
          className="mb-6"
          priority
          wordmarkClassName="text-2xl font-medium tracking-tight text-white"
          imageClassName="h-10 w-auto"
        />
        {children}
      </div>
    </div>
  );
}
