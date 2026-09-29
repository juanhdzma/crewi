const integer = new Intl.NumberFormat("es-CO");
const oneDecimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export function formatDistance(km: number): string {
  if (km === 0) return "adentro";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? oneDecimal.format(km) : integer.format(Math.round(km))} km`;
}

export function formatPoints(points: number): string {
  return integer.format(points);
}
