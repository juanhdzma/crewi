export type GameInfo = {
  id: string;
  name: string;
  description: string;
  scored: boolean;
};

export const games: GameInfo[] = [
  {
    id: "mostlikely",
    name: "¿Quién es más probable?",
    description: "Votan quién del equipo es más probable que haga algo. Sin puntos, puro debate.",
    scored: false,
  },
  {
    id: "ventana",
    name: "Ventana",
    description: "Cada uno muestra su ventana en la llamada y el resto adivina dónde está en el mapa.",
    scored: true,
  },
];

export function gameName(id: string): string {
  return games.find((g) => g.id === id)?.name ?? id;
}
