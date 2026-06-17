import { Suspense } from 'react';
import { buildPageMetadata } from '@/lib/seo';
import { EmployeeIntakeForm } from './employee-intake-form';
import { LoadingSpinner } from '@/components/loading-spinner';

export const metadata = buildPageMetadata({
  segmentTitle: 'Employee profile',
  description: 'Complete your employee profile',
  path: '/employee-intake',
  indexable: false,
});

export default function EmployeeIntakePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <EmployeeIntakeForm />
    </Suspense>
  );
}
