'use client';

import { HandshakeIcon } from '@/lib/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LeadsContent() {
  return (
    <div className="h-full overflow-auto">
      <main className="container py-8">
        <div className="flex flex-col gap-6">
          <Card className="mx-auto flex w-full max-w-2xl flex-col py-16">
            <CardHeader className="space-y-4 px-8 sm:px-12">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                <HandshakeIcon className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-center text-xl sm:text-2xl">Coming soon</CardTitle>
              <CardDescription className="text-center text-base sm:text-lg text-muted-foreground">
                Lead management is under development. You will soon be able to view,
                track, and manage your leads here.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      </main>
    </div>
  );
}
