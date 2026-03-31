import { LoadingSpinner } from '@/components/loading-spinner';

export default function ReportsLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  );
}
