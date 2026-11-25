'use client';

import Image from 'next/image';
import { BrandMark } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Full-page shell for auth routes: sign-in, sign-up, forgot-password, verify-otp, new-password.
 * Optimized auth background via next/image; centers content on x and y.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <Image
        src="/images/covers/auth.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      <div className="fixed inset-0 bg-black/60" aria-hidden />
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageSwitcher id="auth-language" />
      </div>
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
