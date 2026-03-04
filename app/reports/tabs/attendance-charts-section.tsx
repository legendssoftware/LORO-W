'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface AttendanceChartsSectionProps {
  attendanceRate: number;
  chartsLoading: boolean;
}

export function AttendanceChartsSection({
  attendanceRate,
  chartsLoading,
}: AttendanceChartsSectionProps) {
  if (chartsLoading) {
    return (
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Attendance overview and charts</CardDescription>
      </CardHeader>
      <CardContent className="py-12">
        <p className="text-center text-muted-foreground">
          Attendance charts coming soon. Check back later for detailed analytics.
        </p>
      </CardContent>
    </Card>
  );
}
