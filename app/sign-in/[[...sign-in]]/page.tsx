import { AuthPageShell } from '@/components/auth-page-shell';
import { SignInForm } from '@/components/sign-in-form';

export const metadata = {
  title:
    'Sign in | Sign in to your LORO account to access the dashboard and manage your time',
  description: 'Sign in to LORO to access your dashboard, attendance and workforce tools.',
};

export default function SignInPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-md flex-col items-center justify-center">
        <SignInForm />
      </div>
    </AuthPageShell>
  );
}
