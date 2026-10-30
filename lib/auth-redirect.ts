import { redirect } from 'next/navigation';
import { signInHref } from '@/lib/safe-return-path';

/**
 * Send an anonymous request to sign-in and bring them back to `returnPath`.
 * @param returnPath App path to restore, including search when it matters
 */
export function redirectToSignIn(returnPath: string): never {
  redirect(signInHref(returnPath));
}
