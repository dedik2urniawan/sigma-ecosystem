import Image from "next/image";

type Props = {
  variant?: "navbar" | "horizontal" | "tagline" | "stacked" | "mark" | "wordmark";
  tone?: "color" | "white" | "dark";
  className?: string;
  decorative?: boolean;
};
const variants = {
  navbar: { name: "navbar", width: 1040, height: 240 },
  horizontal: { name: "horizontal", width: 1595, height: 466 },
  tagline: { name: "horizontal-tagline", width: 1595, height: 466 },
  stacked: { name: "stacked", width: 1000, height: 1000 },
  mark: { name: "mark", width: 1024, height: 1024 },
  wordmark: { name: "wordmark", width: 1266, height: 148 },
} as const;

export default function SigmaLogo({
  variant = "navbar", tone = "color", className = "h-12 w-auto",
  decorative = false,
}: Props) {
  const asset = variants[variant];
  const suffix = tone === "color" ? "" : `-${tone}`;
  return (
    <Image
      src={`/images/branding/logo-sigma-${asset.name}${suffix}.svg`}
      alt={decorative ? "" : "Sigma Ecosystem"}
      width={asset.width}
      height={asset.height}
      className={className}
      unoptimized
    />
  );
}
