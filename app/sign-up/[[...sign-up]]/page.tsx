import { SignUp } from '@clerk/nextjs';
import { AuthPageShell } from '@/components/auth-page-shell';

export const metadata = {
  title:
    'Sign up | Create your LORO account to get started with time tracking and workforce management',
  description: 'Create your LORO account. Get started with HR, time tracking, payroll and more.',
};

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
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
      </div>
    </AuthPageShell>
  );
}
