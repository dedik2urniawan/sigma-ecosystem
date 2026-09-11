import Link from "next/link";
import { SigmaLogo } from "@/components/SigmaLogo";

export function NavbarLogo() {
  return (
    <Link
      href="/"
      aria-label="SIGMA Ecosystem — Beranda"
      className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sigma-500"
    >
      <SigmaLogo
        variant="primary"
        className="h-9 w-auto md:h-11"
        priority
      />
    </Link>
  );
}

