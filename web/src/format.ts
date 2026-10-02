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

const names = new Intl.ListFormat("es", { type: "conjunction" });

export function formatNames(list: string[], max = Infinity): string {
  if (list.length <= max) return names.format(list);
  return names.format([...list.slice(0, max - 1), `${list.length - max + 1} más`]);
}
