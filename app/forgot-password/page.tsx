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
import { LORO_RESET_EMAIL_KEY } from '@/lib/auth-reset-storage';

export default function ForgotPasswordPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(LORO_RESET_EMAIL_KEY, email);
      }
      router.push('/forgot-password/verify-otp');
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

  return (
    <AuthPageShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a code to reset your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
