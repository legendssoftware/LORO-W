import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthPageShell } from '@/components/auth-page-shell';

export const metadata = {
  title:
    'Sign in | Sign in to your LORO account to access the dashboard and manage your time',
  description: 'Sign in to LORO to access your dashboard, attendance and workforce tools.',
};

export default function SignInPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center">
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Button variant="link" asChild className="p-0 h-auto font-medium">
            <Link href="/forgot-password">Forgot password?</Link>
          </Button>
        </p>
      </div>
    </AuthPageShell>
  );
}
