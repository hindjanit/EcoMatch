/** Hides the demo operator's personal name from public showcase screens. */
export function showcaseName(name: string | null | undefined, fallback = "EcoMatch Member") {
  const cleaned = name?.trim();
  return cleaned && !/\b(janit|hind)\b/i.test(cleaned) ? cleaned : fallback;
}
