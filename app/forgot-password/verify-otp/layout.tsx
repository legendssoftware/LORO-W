import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify code | Enter the code sent to your email',
  description: 'Enter the verification code sent to your email to continue resetting your LORO password.',
};

export default function VerifyOtpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
