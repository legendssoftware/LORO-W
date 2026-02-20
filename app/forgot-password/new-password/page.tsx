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

export default function NewPasswordPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secondFactor, setSecondFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasCode, setHasCode] = useState<boolean | null>(null);

  useEffect(() => {
    if (isSignedIn) router.push('/dashboard');
  }, [isSignedIn, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const code = sessionStorage.getItem(LORO_RESET_CODE_KEY);
    if (!code) router.replace('/forgot-password');
    else setHasCode(true);
  }, [mounted, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || !setActive) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const code =
      typeof window !== 'undefined' ? sessionStorage.getItem(LORO_RESET_CODE_KEY) : null;
    if (!code) {
      setError('Session expired. Please start the reset process again.');
      router.replace('/forgot-password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LORO_RESET_CODE_KEY);
        sessionStorage.removeItem(LORO_RESET_EMAIL_KEY);
      }
      if (result.status === 'needs_second_factor') {
        setSecondFactor(true);
      } else if (result.status === 'complete' && result.createdSessionId) {
        await setActive({
          session: result.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return;
            router.push('/dashboard');
          },
        });
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as { errors: Array<{ longMessage?: string }> }).errors[0]
              ?.longMessage
          : 'Something went wrong. Please try again.';
      setError(message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-primary" />
        </div>
      </AuthPageShell>
    );
  }

  if (!mounted || hasCode === null) {
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
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>

          {secondFactor && (
            <Alert>
              <AlertDescription className="text-amber-600">
                2FA is required. Please sign in through the main sign-in page.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Button variant="link" asChild className="p-0 h-auto font-medium">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
