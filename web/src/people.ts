const personColors = 8;

export function personColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `var(--color-p${Math.abs(hash) % personColors})`;
}
