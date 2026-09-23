import Image, { type ImageProps } from "next/image";

type SigmaLogoVariant =
  | "primary"
  | "white"
  | "dark"
  | "mark"
  | "stacked"
  | "wordmark";

type SigmaLogoProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  variant?: SigmaLogoVariant;
  alt?: string;
};

const logoByVariant = {
  primary: {
    src: "/brand/sigma/logo-sigma-horizontal-primary.png",
    width: 1906,
    height: 383,
  },
  white: {
    src: "/brand/sigma/logo-sigma-horizontal-white.png",
    width: 1742,
    height: 539,
  },
  dark: {
    src: "/brand/sigma/logo-sigma-horizontal-dark.png",
    width: 1836,
    height: 332,
  },
  mark: {
    src: "/brand/sigma/logo-sigma-mark-primary.png",
    width: 1161,
    height: 1179,
  },
  stacked: {
    src: "/brand/sigma/logo-sigma-stacked-primary.png",
    width: 1203,
    height: 1193,
  },
  wordmark: {
    src: "/brand/sigma/logo-sigma-wordmark-primary.png",
    width: 1715,
    height: 478,
  },
} satisfies Record<SigmaLogoVariant, { src: string; width: number; height: number }>;

export function SigmaLogo({
  variant = "primary",
  alt = "SIGMA Ecosystem",
  sizes = "(max-width: 768px) 180px, 260px",
  ...props
}: SigmaLogoProps) {
  const logo = logoByVariant[variant];

  return (
    <Image
      src={logo.src}
      alt={alt}
      width={logo.width}
      height={logo.height}
      sizes={sizes}
      {...props}
    />
  );
}

