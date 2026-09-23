#!/usr/bin/env bash
set -euo pipefail

kit_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
logo_dir="$kit_root/assets/logos"

wrap_png() {
  local input="$1"
  local output="$2"
  local width="$3"
  local height="$4"
  local encoded

  encoded="$(base64 -w 0 "$input")"
  {
    printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>'
    printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" viewBox="0 0 %s %s" role="img" aria-labelledby="title">\n' "$width" "$height" "$width" "$height"
    printf '%s\n' '  <title id="title">SIGMA Ecosystem</title>'
    printf '  <image width="%s" height="%s" href="data:image/png;base64,%s"/>\n' "$width" "$height" "$encoded"
    printf '%s\n' '</svg>'
  } > "$output"
}

wrap_png "$logo_dir/logo-sigma-horizontal-primary.png" "$logo_dir/logo-sigma-horizontal-primary.svg" 1906 383
wrap_png "$logo_dir/logo-sigma-horizontal-white.png" "$logo_dir/logo-sigma-horizontal-white.svg" 1742 539
wrap_png "$logo_dir/logo-sigma-horizontal-dark.png" "$logo_dir/logo-sigma-horizontal-dark.svg" 1836 332
wrap_png "$logo_dir/logo-sigma-mark-primary.png" "$logo_dir/logo-sigma-mark-primary.svg" 1161 1179
wrap_png "$logo_dir/logo-sigma-stacked-primary.png" "$logo_dir/logo-sigma-stacked-primary.svg" 1203 1193
wrap_png "$logo_dir/logo-sigma-wordmark-primary.png" "$logo_dir/logo-sigma-wordmark-primary.svg" 1715 478

