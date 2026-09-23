import Link from "next/link";
import SigmaLogo from "./SigmaLogo";

export function BrandHomeLink() {
  return (
    <Link href="/" aria-label="Beranda Sigma Ecosystem">
      <SigmaLogo className="h-12 w-auto" decorative />
    </Link>
  );
}
export function DarkFooterBrand() {
  return <SigmaLogo tone="white" className="h-14 w-auto" />;
}
export function SSOCenterMark() {
  return <SigmaLogo variant="mark" className="h-24 w-24" />;
}
