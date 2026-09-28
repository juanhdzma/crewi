export function formatDistance(km: number): string {
  if (km === 0) return "adentro";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
