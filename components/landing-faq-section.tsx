'use client';

import Link from 'next/link';
import { HOME_FAQS } from '@/lib/seo';

export function LandingFaqSection() {
  return (
    <section
      id="faq"
      className="relative w-full py-16 md:py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black"
      aria-labelledby="landing-faq-heading"
    >
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <h2
          id="landing-faq-heading"
          className="font-body text-2xl font-normal tracking-tight text-white sm:text-3xl mb-3 text-center"
        >
          Field sales software —{' '}
          <span className="font-serif italic">common questions</span>
        </h2>
        <p className="font-body text-sm text-zinc-400 text-center mb-10">
          Answers for teams comparing LORO with other field sales platforms in
          South Africa.
        </p>
        <dl className="space-y-6">
          {HOME_FAQS.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-white/10 bg-zinc-900/30 px-5 py-4"
            >
              <dt className="font-body text-base font-medium text-white mb-2">
                {faq.question}
              </dt>
              <dd className="font-body text-sm text-zinc-400 leading-relaxed">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-center mt-8 text-sm text-zinc-500">
          <Link href="/blog" className="text-purple-400 hover:text-purple-300 underline">
            Read the field sales blog
          </Link>{' '}
          or{' '}
          <Link href="/compare/skynamo" className="text-purple-400 hover:text-purple-300 underline">
            compare LORO vs Skynamo
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
