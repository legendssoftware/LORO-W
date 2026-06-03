'use client';

import Link from 'next/link';
import { useState } from 'react';
import { onboardingData } from '@/lib/onboarding-data';
import { Button } from '@/components/ui/button';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export function OnboardingSlides() {
  const [index, setIndex] = useState(0);
  const slide = onboardingData[index];
  const isLast = index === onboardingData.length - 1;

  return (
    <MarketingShell>
      <p className="text-sm text-purple-400 mb-2">Get started</p>
      <h1 className="text-3xl font-normal tracking-tight text-white mb-2">
        {slide.title}
      </h1>
      <p className="text-zinc-400 mb-8">{slide.description}</p>
      <div className="flex gap-2 mb-8">
        {onboardingData.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i === index ? 'bg-purple-500' : 'bg-zinc-700'}`}
            aria-hidden
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {index > 0 && (
          <Button
            type="button"
            variant="outline"
            className="border-zinc-600"
            onClick={() => setIndex((i) => i - 1)}
          >
            Back
          </Button>
        )}
        {!isLast ? (
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700 border-0"
            onClick={() => setIndex((i) => i + 1)}
          >
            Next
          </Button>
        ) : (
          <Button asChild className="bg-purple-600 hover:bg-purple-700 border-0">
            <Link href="/sign-up">Create account</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="text-zinc-400">
          <Link href="/">Skip to home</Link>
        </Button>
      </div>
    </MarketingShell>
  );
}
