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
];

export function gameName(id: string): string {
  return games.find((g) => g.id === id)?.name ?? id;
}
