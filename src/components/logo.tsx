/**
 * spec0 brand mark: a bold squared "0" knocked out of a black tile. Sharp
 * corners and the tall digit proportion match the zero-radius brutalist system
 * and echo the "0" in the wordmark. Two-tone black/white by design; size it via
 * `className` (e.g. "h-7 w-7"). Keep in sync with src/app/icon.svg (favicon).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" fill="#000" />
      <rect x="32" y="20" width="36" height="60" fill="#fff" />
      <rect x="43" y="34" width="14" height="32" fill="#000" />
    </svg>
  );
}
