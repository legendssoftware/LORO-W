/**
 * Server-rendered hero copy for crawlers and SEO alignment with meta/H1.
 * Visually hidden; visible hero remains in LandingPage client component.
 */
export function LandingHeroSeo() {
  return (
    <section
      className="sr-only"
      aria-label="LORO field sales software overview"
    >
      <h1>
        Field sales software for South Africa — visits, routes, and pipeline
      </h1>
      <p>
        LORO helps B2B field sales teams plan routes, prove customer visits,
        manage pipeline and leads, map competitors, and sync orders with ERP—from
        one platform on web and mobile.
      </p>
    </section>
  );
}
