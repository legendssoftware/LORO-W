import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title:
    'Home | South Africa\'s all-in-one platform for HR, time tracking, payroll, leave management and more',
  description:
    "South Africa's all-in-one platform: HR, employee time tracking, payroll, leave management, IoT devices, ERP-linked performance, and B2B procurement. ZAR pricing, local support.",
};

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
