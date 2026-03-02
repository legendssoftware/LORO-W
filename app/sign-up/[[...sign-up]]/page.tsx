import { AuthPageShell } from '@/components/auth-page-shell';
import { SignUpForm } from '@/components/sign-up-form';

export const metadata = {
  title:
    'Sign up | Create your LORO account to get started with time tracking and workforce management',
  description: 'Create your LORO account. Get started with HR, time tracking, payroll and more.',
};

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
        <SignUpForm />
      </div>
    </AuthPageShell>
  );
}
