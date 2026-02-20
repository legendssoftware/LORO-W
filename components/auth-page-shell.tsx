'use client';

/**
 * Full-page shell for auth routes: sign-in, sign-up, forgot-password, verify-otp, new-password.
 * Uses auth.jpg as full-viewport background with 0.6 black overlay; centers content on x and y.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      {/* Full-page background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/covers/auth.jpg)' }}
        aria-hidden
      />
      {/* 0.6 black overlay */}
      <div className="fixed inset-0 bg-black/60" aria-hidden />
      {/* Centered content (x and y) */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
