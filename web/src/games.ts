export type GameInfo = {
  id: string;
  name: string;
  description: string;
  pitch: string;
  presenter: string;
  scored: boolean;
};

export const games: GameInfo[] = [
  {
    id: "mostlikely",
    name: "¿Quién es más probable?",
    description: "Votan quién del equipo es más probable que haga algo. Sin puntos, puro debate.",
    pitch: "Quien creó la party elige las preguntas. Todos votan por alguien del equipo, se revelan los votos y a debatir.",
    presenter: "Dani",
    scored: false,
  },
  {
    id: "ventana",
    name: "Ventana",
    description: "Cada uno muestra su ventana en la llamada y el resto adivina dónde está en el mapa.",
    pitch: "En tu turno muestras tu ventana en la cámara. El resto adivina en el mapa dónde estás; más cerca, más puntos. Puedes compartir un punto exacto o solo una zona.",
    presenter: "Eli",
    scored: true,
  },
];

export function gameName(id: string): string {
  return games.find((g) => g.id === id)?.name ?? id;
}
