import Image, { type ImageProps } from "next/image";

type SigmaLogoVariant =
  | "primary"
  | "white"
  | "dark"
  | "mark"
  | "stacked"
  | "wordmark";

type SigmaLogoProps = Omit<ImageProps, "src" | "alt"> & {
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
  sizes,
  fill,
  width,
  height,
  ...props
}: SigmaLogoProps) {
  const logo = logoByVariant[variant];

  if (fill) {
    return (
      <Image
        src={logo.src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 180px, 260px"}
        {...props}
      />
    );
  }

  return (
    <Image
      src={logo.src}
      alt={alt}
      width={width ?? logo.width}
      height={height ?? logo.height}
      sizes={sizes ?? "(max-width: 768px) 180px, 260px"}
      {...props}
    />
  );
}

export default SigmaLogo;

