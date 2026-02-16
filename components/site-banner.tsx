/**
 * Site-wide notice banner shown above the header for all users (signed in or not).
 * Red background, white text for high visibility.
 */
export function SiteBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] w-full bg-red-600 text-white text-center py-2 px-4 text-sm font-medium"
      role="banner"
    >
      Missing hours will be available mid week.
    </div>
  );
}
