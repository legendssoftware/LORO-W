'use client';

import { useEffect, useState } from 'react';
import { Loader2Icon } from '@/lib/icons';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthPageShell } from '@/components/auth-page-shell';
import { LORO_RESET_EMAIL_KEY, LORO_RESET_CODE_KEY } from '@/lib/auth-reset-storage';

export default function VerifyOtpPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.push('/dashboard');
  }, [isSignedIn, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(LORO_RESET_EMAIL_KEY);
    if (stored) setEmail(stored);
    else router.replace('/forgot-password');
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (typeof window !== 'undefined' && code.trim()) {
      sessionStorage.setItem(LORO_RESET_CODE_KEY, code.trim());
      router.push('/forgot-password/new-password');
    } else {
      setError('Please enter the code from your email.');
    }
  }

  if (!isLoaded || email === null) {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-primary" />
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to {email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Enter the 6-digit code"
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Button variant="link" asChild className="p-0 h-auto font-medium">
              <Link href="/forgot-password">Use a different email</Link>
            </Button>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
