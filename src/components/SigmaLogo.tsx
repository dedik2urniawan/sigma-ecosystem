import Image, { type ImageProps } from "next/image";

export type SigmaLogoVariant =
  | "navbar"
  | "horizontal"
  | "tagline"
  | "stacked"
  | "mark"
  | "wordmark"
  // Legacy aliases for backward compatibility
  | "primary"
  | "white"
  | "dark";

export type SigmaLogoTone = "color" | "white" | "dark";

export type SigmaLogoProps = Omit<ImageProps, "src" | "alt"> & {
  variant?: SigmaLogoVariant;
  tone?: SigmaLogoTone;
  format?: "svg" | "png";
  alt?: string;
};

const variantConfig: Record<
  "navbar" | "horizontal" | "tagline" | "stacked" | "mark" | "wordmark",
  { name: string; width: number; height: number }
> = {
  navbar: { name: "navbar", width: 1040, height: 240 },
  horizontal: { name: "horizontal", width: 1595, height: 466 },
  tagline: { name: "horizontal-tagline", width: 1595, height: 466 },
  stacked: { name: "stacked", width: 1000, height: 1000 },
  mark: { name: "mark", width: 1024, height: 1024 },
  wordmark: { name: "wordmark", width: 1266, height: 148 },
};

export function SigmaLogo({
  variant = "navbar",
  tone,
  format = "svg",
  alt = "SIGMA Ecosystem - Satu Data Cegah Stunting",
  sizes,
  fill,
  width,
  height,
  ...props
}: SigmaLogoProps) {
  let resolvedVariant: "navbar" | "horizontal" | "tagline" | "stacked" | "mark" | "wordmark" = "navbar";
  let resolvedTone: SigmaLogoTone = tone ?? "color";

  // Map legacy aliases
  if (variant === "primary") {
    resolvedVariant = "navbar";
    resolvedTone = tone ?? "color";
  } else if (variant === "white") {
    resolvedVariant = "navbar";
    resolvedTone = "white";
  } else if (variant === "dark") {
    resolvedVariant = "navbar";
    resolvedTone = "dark";
  } else if (variant) {
    resolvedVariant = variant;
  }

  const asset = variantConfig[resolvedVariant];
  const suffix = resolvedTone === "color" ? "" : `-${resolvedTone}`;
  const ext = format === "png" ? "png" : "svg";
  const src = `/images/branding/logo-sigma-${asset.name}${suffix}.${ext}`;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 180px, 260px"}
        unoptimized={ext === "svg"}
        {...props}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? asset.width}
      height={height ?? asset.height}
      sizes={sizes ?? "(max-width: 768px) 180px, 260px"}
      unoptimized={ext === "svg"}
      {...props}
    />
  );
}

export default SigmaLogo;
