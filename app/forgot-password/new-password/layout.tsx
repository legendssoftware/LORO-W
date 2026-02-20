import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New password | Set your new LORO password',
  description: 'Enter your new password to complete the reset and sign in to LORO.',
};

export default function NewPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
