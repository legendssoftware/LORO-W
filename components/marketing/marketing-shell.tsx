import Link from 'next/link';
import { Button } from '@/components/ui/button';

const solutionLinks = [
  { href: '/solutions/field-sales', label: 'Field sales' },
  { href: '/solutions/visit-tracking', label: 'Visit tracking' },
  { href: '/solutions/route-planning', label: 'Route planning' },
  { href: '/solutions/pipeline', label: 'Pipeline' },
  { href: '/solutions/competitor-intelligence', label: 'Competitor intel' },
];

export function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full min-w-0 flex-1 bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <Link
            href="/"
            className="font-body text-lg font-medium tracking-tight text-white shrink-0"
          >
            LORO
          </Link>
          <nav
            className="hidden lg:flex items-center gap-5 text-sm text-zinc-400"
            aria-label="Marketing"
          >
            {solutionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/integrations" className="hover:text-white transition-colors">
              Integrations
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm" className="text-zinc-300">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-10 md:py-16 max-w-3xl">
        {children}
      </main>

      <footer className="border-t border-white/10 bg-black py-10 mt-8">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm text-zinc-400">
          <div>
            <p className="text-white font-medium mb-2">LORO</p>
            <p className="text-xs">Field sales software for South Africa.</p>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">Solutions</p>
            <ul className="space-y-1">
              {solutionLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">Company</p>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/customers" className="hover:text-white">
                  Customers
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-2">Compare</p>
            <ul className="space-y-1">
              <li>
                <Link href="/compare/skynamo" className="hover:text-white">
                  vs Skynamo
                </Link>
              </li>
              <li>
                <Link href="/compare/repsly" className="hover:text-white">
                  vs Repsly
                </Link>
              </li>
              <li>
                <Link href="/compare/zoho-crm" className="hover:text-white">
                  vs Zoho CRM
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="container mx-auto px-4 md:px-6 mt-8 text-xs text-zinc-500">
          © {new Date().getFullYear()} LORO. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export function MarketingCta() {
  return (
    <div className="mt-10 rounded-xl border border-white/10 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="font-medium text-white">Ready for field sales in one platform?</p>
        <p className="text-sm text-zinc-400 mt-1">
          Sign up or try the Android app—built for South African B2B teams.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-purple-600 hover:bg-purple-700 border-0">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline" className="border-zinc-600 text-zinc-200">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
