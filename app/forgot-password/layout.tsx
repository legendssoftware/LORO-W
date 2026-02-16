import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Forgot password | Reset your LORO password via email code to sign back in',
  description: 'Reset your LORO password. Enter your email to receive a code and set a new password.',
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
