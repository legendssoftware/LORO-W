import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title:
    'Sign up | Create your LORO account to get started with time tracking and workforce management',
  description: 'Create your LORO account. Get started with HR, time tracking, payroll and more.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-muted/30 px-4 py-8">
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
    </div>
  );
}
