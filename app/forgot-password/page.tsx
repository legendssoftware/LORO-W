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

export default function ForgotPasswordPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.push('/dashboard');
  }, [isSignedIn, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setLoading(true);
    setError('');
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccessfulCreation(true);
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

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || !setActive) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      if (result.status === 'needs_second_factor') {
        setSecondFactor(true);
      } else if (result.status === 'complete') {
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
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-muted/30">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a code to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!successfulCreation ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send password reset code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code sent to {email}</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="Enter the 6-digit code"
                />
              </div>
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
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>
          )}

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
    </div>
  );
}
