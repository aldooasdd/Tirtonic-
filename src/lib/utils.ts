// Gabung className (versi ringan, tanpa tailwind-merge). Cukup untuk cn(a, cond && b, className).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
